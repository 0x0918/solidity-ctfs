# QuillCTF: 9. Gate

> Oh joy, another exciting opportunity to exercise my muscles by opening the gate.

**Objective of CTF:**

- You need to set the opened flag to true via the open function
- You need to handwrite the bytecode opcode by opcode and stay within the size of less than 33 bytes

**Target contract:**

```solidity
// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

interface IGuardian {
  function f00000000_bvvvdlt() external view returns (address);

  function f00000001_grffjzz() external view returns (address);
}

contract Gate {
  bool public opened;

  function open(address guardian) external {
    uint256 codeSize;
    assembly {
      codeSize := extcodesize(guardian)
    }
    require(codeSize < 33, "bad code size");

    require(IGuardian(guardian).f00000000_bvvvdlt() == address(this), "invalid pass");
    require(IGuardian(guardian).f00000001_grffjzz() == tx.origin, "invalid pass");

    (bool success, ) = guardian.call(abi.encodeWithSignature("fail()"));
    require(!success);

    opened = true;
  }
}
```

## The Solution

First thing we must notice is that weird looking function names, `f00000000_bvvvdlt` and `f00000001_grffjzz`. If look at their function selectors, we notice that they are actually `0x0` and `0x1`, which is quite neat. We require any other calldata to fail.

So, we must somehow code an at most 32 byte contract that does the following:

- Returns address of the caller when selector is `0x0`.
- Returns address of the `tx.origin` when selector is `0x1`.
- Reverts otherwise.

Alright, let's do just that! We could do this by writing bytecode by bytecode with ours hands, but for this challenge I have preferred to use a better language called [Huff](https://huff.sh). Huff makes it easy to write evm-level code, and is quite readable too.

The methodology I will use to solve this puzzle is as follows:

1. I will push `origin` and `caller` to the stack.
2. Then I will load the 4-byte function selector from `calldata`. Now, denote this current top of the stack as `i`.
3. I will check if `i` is 0. This will be true if `calldata` was zero in the first place, but we will come back here later.
4. If true, I can now pop `i`, and return the new top. Otherwise, I will subtract `i`, and go back to step 3.
5. Notice that this brings the following scenario:

   - if `i=0`, the returned value is `caller`
   - if `i=1`, the returned value is `origin`
   - if `i>1`, there will be a stack underflow, reverting the call.

With this, we can meet the required constraints. So, let us look at the Huff code now:

```c
#define macro MAIN() = {
  // fill the stack
  origin
  caller

  // get selector
  returndatasize calldataload 0xE0 shr

  // pop until calldata is non-zero
  loop_:
    // check if calldata is 0
    dup1 iszero
    // if true, return
    return_ jumpi
    // else, pop 2nd from the top
    swap1 pop
    // subtract 1 from the calldata
    0x01 swap1 sub
    // go back to top
    loop_ jump

  // return
  return_:
    pop // top value is calldata, so get rid of it
    returndatasize mstore // store top result
    0x20 returndatasize return // return from slot 0
}
```

The code is pretty self-explanatory if you know your EVM opcodes. One thing that I might mention is that in places where `0x00` is needed in the stack, instead of `PUSH1 0x00` I have used `RETURNDATASIZE`. Since this runtime code is not calling anything, `RETURNDATASIZE` will push `0x00` to the stack, in 1 less gas and 1 less byte!

Compiled with `huffc ./gate.huff -a -b`. In the generated artifact (via `-a` option), we can see the initialization and runtime codes. The runtime code is also given in the console when you provide `-b` option.

- Initialization code: `60208060093d393df3`
- Runtime code: `32333d3560e01c5b801561001857905060019003610007565b503d5260203df3` (32 bytes)

## Proof of Concept

The Hardhat test to demonstrate the solution is given below.

```ts
describe('QuillCTF 9: Gate', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Gate;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Gate', owner).then(f => f.deploy());
    await contract.deployed();

    // gate is closed initially
    expect(await contract.opened()).to.be.false;
  });

  it('should open the gate', async () => {
    // contract bytecodes
    const initializationCode = '60208060093d393df3';
    const runtimeCode = '32333d3560e01c5b801561001857905060019003610007565b503d5260203df3';

    // deploy your contract
    const tx = await attacker.sendTransaction({
      to: undefined, // contract creation
      data: '0x' + initializationCode + runtimeCode,
    });
    const receipt = await tx.wait();

    // get address from receipt
    const addr = receipt.contractAddress;
    expect(addr).to.be.properAddress;

    // open the gate
    await contract.connect(attacker).open(addr);
  });

  after(async () => {
    // gate should be opened
    expect(await contract.opened()).to.be.true;
  });
});
```
