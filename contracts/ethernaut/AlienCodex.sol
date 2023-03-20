// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

contract AlienCodexOwnable {
  address public owner;

  constructor() public {
    owner = msg.sender;
  }
}

contract AlienCodex is AlienCodexOwnable {
  bool public contact;
  bytes32[] public codex;

  modifier contacted() {
    require(contact); // assert changed to require
    _;
  }

  function make_contact() public {
    contact = true;
  }

  function record(bytes32 _content) public contacted {
    codex.push(_content);
  }

  function retract() public contacted {
    codex.length--;
  }

  function revise(uint i, bytes32 _content) public contacted {
    codex[i] = _content;
  }
}
