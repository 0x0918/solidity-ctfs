# EVM Puzzles

> [EVM Puzzles](https://github.com/fvictorio/evm-puzzles/) are a collection of puzzles by [Franco Victorio](https://github.com/fvictorio). In each puzzle, the objective is to have the code `STOP`, rather than `REVERT`. You basically have to get to the end!

## Puzzle 1

```js
00      0x34      CALLVALUE
01      0x56      JUMP
02      0xFD      REVERT
03      0xFD      REVERT
04      0xFD      REVERT
05      0xFD      REVERT
06      0xFD      REVERT
07      0xFD      REVERT
08      0x5B      JUMPDEST
09      0x00      STOP
// 3456FDFDFDFDFDFD5B00
```

`JUMP` jumps to the destination specified by the top value in the stack. `CALLVALUE` pushes the call value to the stack. Looking at the code, there is a `JUMPDEST` at 8, so our call value must be 8.

## Puzzle 2

```js
00      0x34      CALLVALUE
01      0x38      CODESIZE
02      0x03      SUB
03      0x56      JUMP
04      0xFD      REVERT
05      0xFD      REVERT
06      0x5B      JUMPDEST
07      0x00      STOP
08      0xFD      REVERT
09      0xFD      REVERT
// 34380356FDFD5B00FDFD
```

Here is a new instruction: [`CODESIZE`](https://www.evm.codes/#38). It pushes the size of code to the stack. Which code? Well, it is the puzzle code itself, which we can see has `10` bytes (the last line is `09` but remember that it starts from `00`).

The `SUB` instruction takes the top two values, subtracting the second one from the first. So basically, it calculates `CODESIZE - CALLVALUE`. We can see a `JUMPDEST` at `06`. So, we have the equation `CODESIZE - CALLVALUE = 10 - CALLVALUE = 6`.

Our `CALLVALUE` must be 4 Wei.

## Puzzle 3

```js
00      0x36      CALLDATASIZE
01      0x56      JUMP
02      0xFD      REVERT
03      0xFD      REVERT
04      0x5B      JUMPDEST
05      0x00      STOP
// 3656FDFD5B00
```

[`CALLDATASIZE`](https://www.evm.codes/#36) pushes the size of calldata (bytes) to the stack. There is a `JUMPDEST` at 4, so the size should be 4 bytes. Any arbitrary 4-byte calldata would suffice: `0x11223344`.

## Puzzle 4

```js
00      0x34      CALLVALUE
01      0x38      CODESIZE
02      0x18      XOR
03      0x56      JUMP
04      0xFD      REVERT
05      0xFD      REVERT
06      0xFD      REVERT
07      0xFD      REVERT
08      0xFD      REVERT
09      0xFD      REVERT
10      0x5B      JUMPDEST
11      0x00      STOP
// 34381856FDFDFDFDFDFD5B00
```

`CODESIZE` is 12 and `JUMPDEST` is at 10. `XOR` is a bitwise operation that stands for exclusive-or operation. Here is its logic table:

| a   | b   | a ^ b |
| --- | --- | ----- |
| 0   | 0   | 0     |
| 0   | 1   | 1     |
| 1   | 0   | 1     |
| 1   | 1   | 0     |

Denoting `XOR` as `^` (as is the case in many programming languages) we need some value such that `CALLVALUE ^ 12 = 10`. Simple arithmethic yields `CALLVALUE = 10 ^ 12 = 6`.

## Puzzle 5

```js
00      0x34          CALLVALUE
01      0x80          DUP1
02      0x02          MUL
03      0x610100      PUSH2 0x0100
06      0x14          EQ
07      0x600C        PUSH1 0x0C
09      0x57          JUMPI
10      0xFD          REVERT
11      0xFD          REVERT
12      0x5B          JUMPDEST
13      0x00          STOP
14      0xFD          REVERT
15      0xFD          REVERT
// 34800261010014600C57FDFD5B00FDFD
```

Here we have a [`JUMPI`](https://www.evm.codes/#57) which is a conditional jump. `PUSH1 0x0C` above it provides the correct destination address, so all we have to care about is that the condition value be non-zero.

Looking at the lines above in order:

1. `CALLVALUE` pushes the value to the stack.
2. `DUP1` duplicates it, so there are two of the same value in the stack.
3. `MUL` multiplies these two, so we basically squared the call value.
4. `PUSH2 0x0100` pushes `0x0100` to the stack, which is `16 ^ 2` in decimals.
5. `EQ` compares the top two items in the stack, which is `16 ^ 2` and the square of our callvalue! Therefore, giving a callvalue of 16 is the winning move.

## Puzzle 6

```js
00      0x6000      PUSH1 0x00
02      0x35        CALLDATALOAD
03      0x56        JUMP
04      0xFD        REVERT
05      0xFD        REVERT
06      0xFD        REVERT
07      0xFD        REVERT
08      0xFD        REVERT
09      0xFD        REVERT
10      0x5B        JUMPDEST
11      0x00        STOP
// 60003556FDFDFDFDFDFD5B00
```

[`CALLDATALOAD`](https://www.evm.codes/#35) loads a 32-byte value at the specified byte offset. If 32-bytes go beyond the length of calldata, the overflowing bytes are set to 0.

The offset to be loaded is given by the top value in the stack, which is given by `PUSH1 0x00` above. Basically, the calldata itself should have the destination address for `JUMP`. Our `JUMPDEST` is at `0x0A`, so that is our calldata!

But wait, remember that overflowing bytes are set to 0. So if we just send `0x0A`, the remaining 31 bytes will be `00` and we will have `0x0A00000000000000000000000000000000000000000000000000000000000000` which is a huge number!

Instead, we must do zero-padding to the left, and send `0x000000000000000000000000000000000000000000000000000000000000000A` as our calldata. This way, reading 32-bytes from the zero offset will yield `0x0A`.

## Puzzle 7

```js
00      0x36        CALLDATASIZE
01      0x6000      PUSH1 0x00
03      0x80        DUP1
04      0x37        CALLDATACOPY
05      0x36        CALLDATASIZE
06      0x6000      PUSH1 0x00
08      0x6000      PUSH1 0x00
10      0xF0        CREATE
11      0x3B        EXTCODESIZE
12      0x6001      PUSH1 0x01
14      0x14        EQ
15      0x6013      PUSH1 0x13
17      0x57        JUMPI
18      0xFD        REVERT
19      0x5B        JUMPDEST
20      0x00        STOP
// 36600080373660006000F03B600114601357FD5B00
```

The first 4 lines basically copy the entire calldata into memory. The next 4 lines create a contract, where the initialization code is taken from the memory at the position our calldata was just loaded. In other words, the first 10 lines create a contract with our calldata.

Afterwards, the next 3 lines check if the [`EXTCODESIZE`](https://www.evm.codes/#3b) is equal 1 byte. The contract that we are checking the code size is the one we just created above with `CREATE`, as `CREATE` pushes the address to the stack. `EXTCODESIZE` is the size of the runtime code of a contract, not the initialization code! The puzzle expects this to be 1 byte (lines `0C` and `0E`). So we just have to write our own initialization code to do all this.

The instruction for this is `CODECOPY`, which works similar to `CALLDATACOPY`. The initialization code will be as follows:

```js
PUSH1 0x01 // 1 byte
PUSH1 ;;;; // position in bytecode, we dont know yet
PUSH1 0x00 // write to memory position 0
CODECOPY   // copies the bytecode
PUSH1 0x01 // 1 byte
PUSH1 0x00 // read from memory position 0
RETURN     // returns the code copied above
```

In terms of bytecode, this results in `0x60 01 60 ;; 60 00 39 60 01 60 00 F3`. This is a total of 12 bytes, so the `;;;;` position will be 12, which is `0x0C`. The final bytecodes are: `0x6001600C60003960016000F3`.

This code copies 1 byte code into memory, and returns it to EVM so that contract creation is completed. The actual runtime code is arbitrary, it just has to be 1 byte. Furthermore, runtime code comes after the initialization code (starting at 12th position in this case), so we just have to append one byte to the end of the bytecodes above.

Let's add `0xEE` for no reason: `0x6001600C60003960016000F3EE`. That should do it!

## Puzzle 8

```js
00      0x36        CALLDATASIZE
01      0x6000      PUSH1 0x00
03      0x80        DUP1
04      0x37        CALLDATACOPY
05      0x36        CALLDATASIZE
06      0x6000      PUSH1 0x00
08      0x6000      PUSH1 0x00
10      0xF0        CREATE
11      0x6000      PUSH1 0x00
13      0x80        DUP1
14      0x80        DUP1
15      0x80        DUP1
16      0x80        DUP1
17      0x94        SWAP5
18      0x5A        GAS
19      0xF1        CALL
20      0x6000      PUSH1 0x00
22      0x14        EQ
23      0x601B      PUSH1 0x1B
25      0x57        JUMPI
26      0xFD        REVERT
27      0x5B        JUMPDEST
28      0x00        STOP
// 36600080373660006000F0600080808080945AF1600014601B57FD5B00
```

Similar to the previous puzzle, the first 4 lines copy the entire calldata into memory. The next 4 lines create a contract, the initialization code is taken from the memory at the position that calldata was just loaded.

Afterwards, 5 of `0x00` are pushed to the stack. `SWAP5` will exchange the 1st and 6th stack items, and the 6th item at that point is the address yielded from `CREATE`. Next, the remaining gas amount is pushed to stack with `GAS`. All of this was done for the sake of `CALL` instruction:

```js
CALL;
gas; // given by GAS the previous line
address; // is the address from CREATE
value; // 0
argOffset; // 0
argSize; // 0
retOffset; // 0
retSize; // 0
```

After `CALL`, a boolean result is pushed to the stack indicating its success. Looking at the following lines we see that this is expected to be 0 (`PUSH1 00` and `EQ` with `JUMPI` afterwards). So we can create a contract with a `REVERT` instruction.

```js
PUSH1 0x00
PUSH1 0x00
REVERT
```

This shall be our runtime code, which in bytecode is `0x60006000FD` at 5 bytes total. We will write the initialization code ourselves too, similar to what we did in the previous puzzle.

```js
PUSH1 0x05 // 5 bytes
PUSH1 0x0C // position of runtime code in bytecode
PUSH1 0x00 // write to memory position 0
CODECOPY   // copies the bytecode
PUSH1 0x05 // 5 bytes
PUSH1 0x00 // read from memory position 0
RETURN     // returns the code copied above
```

Again the position is `0x0C` because the initialization code is 12 bytes. So our initialization bytecodes are `0x6005600C60003960056000F3` and the runtime bytecodes are `0x60006000FD`. The calldata will be these concatenated: `0x6005600C60003960056000F360006000FD`.

## Puzzle 9

```js
00      0x36        CALLDATASIZE
01      0x6003      PUSH1 0x03
03      0x10        LT
04      0x6009      PUSH1 0x09
06      0x57        JUMPI
07      0xFD        REVERT
08      0xFD        REVERT
09      0x5B        JUMPDEST
10      0x34        CALLVALUE
11      0x36        CALLDATASIZE
12      0x02        MUL
13      0x6008      PUSH1 0x08
15      0x14        EQ
16      0x6014      PUSH1 0x14
18      0x57        JUMPI
19      0xFD        REVERT
20      0x5B        JUMPDEST
21      0x00        STOP
// 36600310600957FDFD5B343602600814601457FD5B00
```

We start with a small `JUMPI` that requires `3 < CALLDATASIZE` so our calldata is larger than 3 bytes. Afterwards, we multiply our `CALLVALUE` and `CALLDATASIZE`, which is expected to be 8. Simply, we will send a 4 byte calldata with 2 Wei call value.

## Puzzle 10

```js
00      0x38          CODESIZE
01      0x34          CALLVALUE
02      0x90          SWAP1
03      0x11          GT
04      0x6008        PUSH1 0x08
06      0x57          JUMPI
07      0xFD          REVERT
08      0x5B          JUMPDEST
09      0x36          CALLDATASIZE
10      0x610003      PUSH2 0x0003
13      0x90          SWAP1
14      0x06          MOD
15      0x15          ISZERO
16      0x34          CALLVALUE
17      0x600A        PUSH1 0x0A
19      0x01          ADD
20      0x57          JUMPI
21      0xFD          REVERT
22      0xFD          REVERT
23      0xFD          REVERT
24      0xFD          REVERT
25      0x5B          JUMPDEST
26      0x00          STOP
// 38349011600857FD5B3661000390061534600A0157FDFDFDFD5B00
```

The first `CODESIZE` is the size of this puzzle itself, which is `1B` (28 bytes). Next it swaps the `CALLVALUE` with it, and runs `GT`. In effect, this checks if `CODESIZE > CALLVALUE`.

After the successfull `JUMPI`, we are doing a `CALLDATASIZE MOD 0x003 == 0` operation. We want this to be true for the next `JUMPI` to work, so our calldata size must be a multiple of 3.

The destination of `JUMPI` is defined by `CALLVALUE ADD 0x0A`, which should add up to `0x19`. In decimals, `0x0A` is 10 and `0x19` is 25, so our `CALLVALUE` should be 15.
