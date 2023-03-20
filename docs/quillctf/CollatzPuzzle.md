# Custom Challenge: Collatz Puzzle

**Objective of CTF:**

- Make a successfull call to the `ctf` function.
- You should be the deployer of the contract at the given `addr` parameter!

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICollatz {
  function collatzIteration(uint256 n) external pure returns (uint256);
}

contract CollatzPuzzle is ICollatz {
  function collatzIteration(uint256 n) public pure override returns (uint256) {
    if (n % 2 == 0) {
      return n / 2;
    } else {
      return 3 * n + 1;
    }
  }

  function ctf(address addr) external view returns (bool) {
    // check code size
    uint256 size;
    assembly {
      size := extcodesize(addr)
    }
    require(size > 0 && size <= 32, "bad code size!");

    // check results to be matching
    uint p;
    uint q;
    for (uint256 n = 1; n < 200; n++) {
      // local result
      p = n;
      for (uint256 i = 0; i < 5; i++) {
        p = collatzIteration(p);
      }
      // your result
      q = n;
      for (uint256 i = 0; i < 5; i++) {
        q = ICollatz(addr).collatzIteration{gas: 100}(q);
      }
      require(p == q, "result mismatch!");
    }

    return true;
  }
}
```

## Solution

The important part here is obviously is the code size constraint. Writing a contract would incur a huge code size, so we have to dive hands-dirty into EVM level. We want to implement a function with the signature `collatzIteration(uint256)` in which a Collatz iteration takes place.

### Runtime Code

We don't need to care about the function signature actually, we can just ignore the selector bytes, and do the process on whatever argument we get! This will save some bytes. First, let us write our runtime code that handles the Collatz iteration logic:

| Code Size | Section     | Instruction    | Stack       | Explanation                                                    |
| --------- | ----------- | -------------- | ----------- | -------------------------------------------------------------- |
| `0x02`    | `entry` ⚪  | `PUSH1 0x04`   | `0x4`       | skip 4-byte selector                                           |
| `0x03`    | `entry` ⚪  | `CALLDATALOAD` | `n`         | load argument from calldata                                    |
| `0x04`    | `entry` ⚪  | `DUP1`         | `n n`       | duplicate `n`                                                  |
| `0x06`    | `entry` ⚪  | `PUSH1 0x01`   | `0x1 n n`   | check parity by AND'ing with 1                                 |
| `0x07`    | `entry` ⚪  | `AND`          | `i n`       | get the last bit `i = 0x1 & n`                                 |
| `0x09`    | `entry` ⚪  | `PUSH1 0x13`   | `0x13 i n`  | push destination to `odd`                                      |
| `0x0A`    | `entry` ⚪  | `JUMPI`        | `n`         | conditional jump to `odd`                                      |
| `0x0C`    | `even` 🟢   | `PUSH1 0x1`    | `0x1 n`     | add `1` to shift once                                          |
| `0x0D`    | `even` 🟢   | `SHR`          | `m`         | find `n/2`, as shifting right once divides by 2. denote as `m` |
| `0x0F`    | `even` 🟢   | `PUSH1 0x17`   | `0x17 m`    | push destination to `return`                                   |
| `0x10`    | `even` 🟢   | `JUMP`         | `m`         | go to `return`                                                 |
| `0x11`    | `odd` 🔵    | `JUMPDEST`     | `n`         | destination for `odd` subroutine                               |
| `0x13`    | `odd` 🔵    | `PUSH1 0x3`    | `0x3 n`     | push 3 for multiplication                                      |
| `0x14`    | `odd` 🔵    | `MUL`          | `3n`        | find `3n`                                                      |
| `0x16`    | `odd` 🔵    | `PUSH1 0x1`    | `0x1 3n`    | push 1 for addition                                            |
| `0x17`    | `odd` 🔵    | `ADD`          | `m`         | find `3n+1`, denote as `m`                                     |
| `0x18`    | `return` ⚫ | `JUMPDEST`     | `m`         | destination for `return` subroutine                            |
| `0x1A`    | `return` ⚫ | `PUSH1 0x80`   | `0x80 m`    | push `0x80`, the first free memory slot                        |
| `0x1B`    | `return` ⚫ | `MSTORE`       | `-`         | store the result at `0x80` in memory                           |
| `0x1D`    | `return` ⚫ | `PUSH1 0x20`   | `0x20`      | to return an `uint256`, we need 32 bytes                       |
| `0x1F`    | `return` ⚫ | `PUSH1 0x80`   | `0x80 0x20` | position to return the data in memory                          |
| `0x20`    | `return` ⚫ | `RETURN`       | `-`         | returns 32 bytes from `0x80` in memory                         |

We have given section names and colors to make it more clear how the code is structured. The `entry` section simply retrieves the input argument (32-byte argument, ignoring the 4-byte function selector). Then, we do bitwise-AND operation on the input number with 1, which will return the last bit. If the last bit is 0, the number is even; 1 otherwise. The conditional jump activates when the top of the stack is non-zero, so it will only JUMP to the `odd` section if the number is odd. The `even` and `odd` sections do the `n/2` and `3n+1` operations respectively. Also note that there is an additional jump at the end `even` section, to go directly to the `return` section.

Here is the code in copy-paste-friendly format:

```c
// entry
PUSH1 0x04
CALLDATALOAD
DUP1
PUSH1 0x01
AND
PUSH1 0x10
JUMPI // ═════════════════╗
                       // ║
// even                // ║
PUSH1 0x01             // ║
SHR                    // ║
PUSH1 0x17             // ║
JUMP // ════════════╗     ║
                 // ║     ║
// odd           // ║     ║
JUMPDEST // <═══════║═════╝
PUSH1 0x3        // ║
MUL              // ║
PUSH1 0x1        // ║
ADD              // ║
                 // ║
// return        // ║
JUMPDEST // <═══════╝
PUSH1 0x80
MSTORE
PUSH1 0x20
PUSH1 0x80
RETURN
```

You can copy-paste the code above to play around with it at <https://www.evm.codes/playground>. Try calling with `0x112233440000000000000000000000000000000000000000000000000000000000000003`. This inputs means `n = 3` and the returned value will be a 32-byte value `3*3+1 = 10 = 0x000..00A`. The bytecode for this code is `0x6004358060011660105760011c6017565b6003026001015b60805260206080f3` (you can retrieve this from the playground link above) and it is exactly 32 bytes! This is just enough to match our constraint of `0 < codeSize <= 32`.

### Initialization Code

Now we can write the initialization code, which is tasked with copying the runtime code above into the memory. It will do so via `CODECOPY` instruction, and must later return the code from memory. The instructions are as follows:

| Code Size | Section   | Instruction  | Stack            | Explanation                                   |
| --------- | --------- | ------------ | ---------------- | --------------------------------------------- |
| `0x02`    | `init` 🔴 | `PUSH1 0x20` | `0x20`           | runtime code is `32 = 0x20` bytes             |
| `0x04`    | `init` 🔴 | `PUSH1 0x0C` | `0x0C 0x20`      | runtime code starts at `12 = 0x0C`            |
| `0x06`    | `init` 🔴 | `PUSH1 0x00` | `0x00 0x0C 0x20` | runtime code should be written to slot 0      |
| `0x07`    | `init` 🔴 | `CODECOPY`   | `-`              | copy the runtime code from calldata to memory |
| `0x09`    | `init` 🔴 | `PUSH1 0x20` | `0x20`           | runtime code is `32 = 0x20` bytes             |
| `0x0b`    | `init` 🔴 | `PUSH1 0x00` | `0x00 0x20`      | runtime code is written to slot 0             |
| `0x0c`    | `init` 🔴 | `RETURN`     | `-`              | 32-bytes are returned from the memory         |

Again, in copy-paste friendly format:

```c
PUSH1 0x20 // 32 bytes
PUSH1 0x0C // position in bytecode of the runtime code
PUSH1 0x00 // write to memory position 0
CODECOPY   // copy the bytecode
PUSH1 0x20 // 32 bytes
PUSH1 0x00 // read from memory position 0
RETURN     // returns the code copied above
```

The bytecode is `0x6020600c60003960206000f3`. This will deploy the runtime code above to the chain.

### Deployment & Testing

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('Custom: Collatz Puzzle', () => {
  let contract: CollatzPuzzle;
  let owner: SignerWithAddress;

  const initializationCode = '6020600c60003960206000f3';
  const runtimeCode = '6004358060011660105760011c6017565b6003026001015b60805260206080f3';

  before(async () => {
    [owner] = await ethers.getSigners();
    contract = await ethers.getContractFactory('CollatzPuzzle', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should call `ctf` successfully', async () => {
    // deploy your contract
    const tx = await owner.sendTransaction({
      to: undefined, // contract creation
      data: '0x' + initializationCode + runtimeCode,
    });
    const receipt = await tx.wait();

    // get address from receipt
    const addr = receipt.contractAddress;
    expect(addr).to.be.properAddress;

    // run the ctf function
    expect(await contract.ctf(addr)).to.be.true;
  });
});
```
