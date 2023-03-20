# More EVM Puzzles

> [More EVM Puzzles](https://github.com/fvictorio/evm-puzzles/) are a collection of puzzles, similar to [EVM Puzzles](https://github.com/fvictorio/evm-puzzles/) by [Franco Victorio](https://github.com/fvictorio). In each puzzle, the objective is to have the code `STOP`, rather than `REVERT`.

## Puzzle 1

```js
00      36      CALLDATASIZE
01      34      CALLVALUE
02      0A      EXP
03      56      JUMP
04      FE      INVALID
05      FE      INVALID
06      FE      INVALID
07      FE      INVALID
08      FE      INVALID
09      FE      INVALID
0A      FE      INVALID
0B      FE      INVALID
0C      FE      INVALID
0D      FE      INVALID
0E      FE      INVALID
0F      FE      INVALID
10      FE      INVALID
11      FE      INVALID
12      FE      INVALID
13      FE      INVALID
14      FE      INVALID
15      FE      INVALID
16      FE      INVALID
17      FE      INVALID
18      FE      INVALID
19      FE      INVALID
1A      FE      INVALID
1B      FE      INVALID
1C      FE      INVALID
1D      FE      INVALID
1E      FE      INVALID
1F      FE      INVALID
20      FE      INVALID
21      FE      INVALID
22      FE      INVALID
23      FE      INVALID
24      FE      INVALID
25      FE      INVALID
26      FE      INVALID
27      FE      INVALID
28      FE      INVALID
29      FE      INVALID
2A      FE      INVALID
2B      FE      INVALID
2C      FE      INVALID
2D      FE      INVALID
2E      FE      INVALID
2F      FE      INVALID
30      FE      INVALID
31      FE      INVALID
32      FE      INVALID
33      FE      INVALID
34      FE      INVALID
35      FE      INVALID
36      FE      INVALID
37      FE      INVALID
38      FE      INVALID
39      FE      INVALID
3A      FE      INVALID
3B      FE      INVALID
3C      FE      INVALID
3D      FE      INVALID
3E      FE      INVALID
3F      FE      INVALID
40      5B      JUMPDEST
41      58      PC
42      36      CALLDATASIZE
43      01      ADD
44      56      JUMP
45      FE      INVALID
46      FE      INVALID
47      5B      JUMPDEST
48      00      STOP
```

In this puzzle, we have two jumps to be concerned:

- The first jump targets destination `callvalue ^ calldatasize`. We want this to be `0x40` which is `2 ** 6`. There are several ways we can obtain this.
- The second jump targets `calldatasize + programcounter`. The `PC` instruction will return the line number that it is called at, in this case `41`. To reach `47`, we need our calldata size to be 6. So, for the previous jump target that means we need a calldata value of `2`, simply giving us `2 ** 6`.

## Puzzle 2

```js
00      36        CALLDATASIZE
01      6000      PUSH1 00
03      6000      PUSH1 00
05      37        CALLDATACOPY
06      36        CALLDATASIZE
07      6000      PUSH1 00
09      6000      PUSH1 00
0B      F0        CREATE
0C      6000      PUSH1 00
0E      80        DUP1
0F      80        DUP1
10      80        DUP1
11      80        DUP1
12      94        SWAP5
13      5A        GAS
14      F1        CALL
15      3D        RETURNDATASIZE
16      600A      PUSH1 0A
18      14        EQ
19      601F      PUSH1 1F
1B      57        JUMPI
1C      FE        INVALID
1D      FE        INVALID
1E      FE        INVALID
1F      5B        JUMPDEST
20      00        STOP
```

Don't be afraid of what is going on above there. We simply create a contract, and call it; expecting the call to return something with the size `0x0A` as a result. So, that is simply what we will do!

```c
// init
PUSH1 0x0a // runtime code is 10 bytes
PUSH1 0x0C // runtime code starts at 0x0C
PUSH1 0x00 // copy to 0th memory slot
CODECOPY
PUSH1 0x0a // runtime code is 10 bytes
PUSH1 0x00 // return from 0th memory slot
RETURN

// runtime
PUSH1 0x0a // return 12 bytes
DUP1       // offset irrelevant
RETURN
```

## Puzzle 3

```js
00      36        CALLDATASIZE
01      6000      PUSH1 00
03      6000      PUSH1 00
05      37        CALLDATACOPY
06      36        CALLDATASIZE
07      6000      PUSH1 00
09      6000      PUSH1 00
0B      F0        CREATE
0C      6000      PUSH1 00
0E      80        DUP1
0F      80        DUP1
10      80        DUP1
11      93        SWAP4
12      5A        GAS
13      F4        DELEGATECALL
14      6005      PUSH1 05
16      54        SLOAD
17      60AA      PUSH1 AA
19      14        EQ
1A      601E      PUSH1 1E
1C      57        JUMPI
1D      FE        INVALID
1E      5B        JUMPDEST
1F      00        STOP
```

This one is similar to the previous, again a contract is created but this time a delegate-call is made. After that, it is checked whether the 5th slot in the storage is equal to `0xAA`. So, we just have to write a contract that sets `0xAA` to slot 5.

```c
// init
PUSH1 0x05 // 5 byte runtime code
PUSH1 0x0C // runtime code position
PUSH1 0x00 // write to memory position 0
CODECOPY   // copies the bytecode
PUSH1 0x05 // 5 byte runtime code
PUSH1 0x00 // read from memory position 0
RETURN     // returns the code copied above
// runtime
PUSH1 0xAA // value
PUSH1 0x05 // key
SSTORE     // store command
```

In bytecode terms: `0x6005600c60003960056000f360aa600555` does the trick.

## Puzzle 4

```js
00      30        ADDRESS
01      31        BALANCE
02      36        CALLDATASIZE
03      6000      PUSH1 00
05      6000      PUSH1 00
07      37        CALLDATACOPY
08      36        CALLDATASIZE
09      6000      PUSH1 00
0B      30        ADDRESS
0C      31        BALANCE
0D      F0        CREATE
0E      31        BALANCE
0F      90        SWAP1
10      04        DIV
11      6002      PUSH1 02
13      14        EQ
14      6018      PUSH1 18
16      57        JUMPI
17      FD        REVERT
18      5B        JUMPDEST
19      00        STOP
```

First, assuming that our account has 0 balance, the balance of this address during runtime will be equal to the `callvalue`. Then, notice that `CREATE` has value equal to `callvalue`, meaning that it is consuming all our balance.

Then, we check the balance of that deployed contract, and expect it to be half of the initial balance (calculated in the first two lines). To make that possible, we simply have to make our contract send half of the `callvalue` to somewhere else.

```c
// (call:7) retSize
PUSH1 0x00
// (call:6) retOffset
DUP1
// (call:5) argsSize
DUP1
// (call:4) argsOffset
DUP1
// (call:3) find half of call value (assuming it is even)
PUSH1 0x02
CALLVALUE
DIV
// (call:2) address (0x0)
DUP2
// (call:1) remaining gas
GAS
// send money!
CALL

// return nothing
PUSH1 0x00
DUP1
RETURN     // returns the code copied above
```

The initialization code does not have to return anything, so we can return right after making our call. To sum up, our calldata is `0x600080808060023404815af1600080f3` and the callvalue can be any even number!

## Puzzle 5

```js
00      6020      PUSH1 20
02      36        CALLDATASIZE
03      11        GT
04      6008      PUSH1 08
06      57        JUMPI
07      FD        REVERT
08      5B        JUMPDEST
09      36        CALLDATASIZE
0A      6000      PUSH1 00
0C      6000      PUSH1 00
0E      37        CALLDATACOPY
0F      36        CALLDATASIZE
10      59        MSIZE
11      03        SUB
12      6003      PUSH1 03
14      14        EQ
15      6019      PUSH1 19
17      57        JUMPI
18      FD        REVERT
19      5B        JUMPDEST
1A      00        STOP
```

In the beginning, we simply need to have a calldata that is greater than `0x20`. In the second part, there is a `CALLDATACOPY` followed by `MSIZE`. Now, `CALLDATACOPY` will copy the calldata into memory, but note that this will happen in 32-byte chunks. `MSIZE` will return the highest reached offset in memory. Suppose our calldata size is larger than `0x20` but less than `0x40`. When written into memory, even if calldata size is less than `0x40` the highest memory offset will be `0x40`, due to it being written in chunks of 32 bytes.

We want `MSIZE - CALLDATASIZE` to be equal to 3, so we can have a calldata of size `0x3D` and that would be ok! Here is a calldata of that size: `0x11223344112233441122334411223344112233441122334411223344112233441122334411223344112233441122334411223344112233441122334411`. I just copy-pasted chunks of 4 byte `11223344`s and then removed 3 bytes from the end.

## Puzzle 6

```js
00      7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0      PUSH32 FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0
21      34                                                                      CALLVALUE
22      01                                                                      ADD
23      6001                                                                    PUSH1 01
25      14                                                                      EQ
26      602A                                                                    PUSH1 2A
28      57                                                                      JUMPI
29      FD                                                                      REVERT
2A      5B                                                                      JUMPDEST
2B      00                                                                      STOP
```

Here, we have a HUGE number `0xFF...F0` and we add some callvalue to it, expecting the result to be `0x01`. How is that possible? Well, it's the good ol' overflow issue right here. If we add `0x0F` to it, the whole thing becomes `0xFF..FF`. So, we add just 1 more to that and it becomes `0x00..00`. To get to `0x00..01`, we just add once more. Basically, our callvalue is 17 (`0x0F + 0x01 + 0x01`).

## Puzzle 7

```js
00      5A        GAS
01      34        CALLVALUE
02      5B        JUMPDEST
03      6001      PUSH1 01
05      90        SWAP1
06      03        SUB
07      80        DUP1
08      6000      PUSH1 00
0A      14        EQ
0B      6011      PUSH1 11
0D      57        JUMPI
0E      6002      PUSH1 02
10      56        JUMP
11      5B        JUMPDEST
12      5A        GAS
13      90        SWAP1
14      91        SWAP2
15      03        SUB
16      60A6      PUSH1 A6
18      14        EQ
19      601D      PUSH1 1D
1B      57        JUMPI
1C      FD        REVERT
1D      5B        JUMPDEST
1E      00        STOP
```

In the first, we have a `CALLVALUE - 0x01 == 0x00` check. If true, we go to line `0x11`; otherwise, we go to line `0x02`.

- At `0x011`, a `GAS - GAS'` (where `GAS'` is the one from line `0x00`) is calculated and we win if that is equal to `A6`. In other words, we must have spent `0xA6` gas to get here.
- At `0x02`, we basically do the same things again. In fact, this whole thing is a for-loop that loops as much as your `CALLVALUE`.

Looking at these together, we must be looping for a while so that the gas spent is `0xA6` when that check happens. `0xA6 = 100 * 16 + 6 = 166`. A callvalue of 4 does the trick.

(TODO GAS CALCULATIONS)

## Puzzle 8

```js
00      34        CALLVALUE
01      15        ISZERO
02      19        NOT
03      6007      PUSH1 07
05      57        JUMPI
06      FD        REVERT
07      5B        JUMPDEST
08      36        CALLDATASIZE
09      6000      PUSH1 00
0B      6000      PUSH1 00
0D      37        CALLDATACOPY
0E      36        CALLDATASIZE
0F      6000      PUSH1 00
11      6000      PUSH1 00
13      F0        CREATE
14      47        SELFBALANCE
15      6000      PUSH1 00
17      6000      PUSH1 00
19      6000      PUSH1 00
1B      6000      PUSH1 00
1D      47        SELFBALANCE
1E      86        DUP7
1F      5A        GAS
20      F1        CALL
21      6001      PUSH1 01
23      14        EQ
24      6028      PUSH1 28
26      57        JUMPI
27      FD        REVERT
28      5B        JUMPDEST
29      47        SELFBALANCE
2A      14        EQ
2B      602F      PUSH1 2F
2D      57        JUMPI
2E      FD        REVERT
2F      5B        JUMPDEST
30      00        STOP
```

The first jump will occur if callvalue is non-zero, because `ISZERO` will return `0` and `NOT` will make it to be `1` again, thus enabling the `JUMPI` on line `0x05`.

Afterwards, a contract is created with value `SELFBALANCE` (which may be assumed equal to callvalue) and then it is called. The returned data is expected to be equal to `0x01`. Finally, the balance after making the call is expected to equal the initial balance.

Considering that `SELFBALANCE` is used during contract creation, and then it is called afterwards, the call should send the given balance back to the deployer, otherwise self-balance of the caller will be 0. In doing so, the deployed code should also return `0x01` as return data.

```c
// init
PUSH1 0x0F  // runtime code size
PUSH1 0x0C  // runtime code position
PUSH1 0x00  // write to memory position 0
CODECOPY    // copies the bytecode
PUSH1 0x0F  // runtime code size
PUSH1 0x00  // read from memory position 0
RETURN      // returns the code copied above
// runtime
PUSH1 0x01  // (mstore:2) value = 0x01
PUSH1 0x80  // (mstore:1) offset, 0x80 as required by EVM
MSTORE
PUSH1 0x01  // (call:7) retSize 1 byte
PUSH1 0x80  // (call:6) retOffset
DUP1        // (call:5) argsSize
DUP1        // (call:4) argsOffset
SELFBALANCE // (call:3) return entire balance
CALLER      // (call:2) address is msg.sender
GAS         // (call:1) remaining gas
CALL        // sends selfbalance to msg.sender
```

Our calldata is as written above, which results in a contract to be deployed, which returns `0x01` and forwards all it's balance to the caller when it is called.

## Puzzle 9

```js
00      34        CALLVALUE
01      6000      PUSH1 00
03      52        MSTORE
04      6020      PUSH1 20
06      6000      PUSH1 00
08      20        SHA3
09      60F8      PUSH1 F8
0B      1C        SHR
0C      60A8      PUSH1 A8
0E      14        EQ
0F      6016      PUSH1 16
11      57        JUMPI
12      FD        REVERT
13      FD        REVERT
14      FD        REVERT
15      FD        REVERT
16      5B        JUMPDEST
17      00        STOP
```

First, our callvalue is stored in the 0th slot of memory. Then, 20 bytes of this value is given to SHA3 as input. The resulting hash is shifted `0xF8` times, meaning `248` times, so there remains just a single byte as a result (`256 - 248 = 8`). We want this to equal `0xA8`.

All we have to do is then find a callvalue such that it's SHA3's most significant byte is `0xA8`. Considering that the hash output is close to uniformly random, we have about `1/256` chance to guess it correctly.

We can write a script for that, but I will just give the answer to be 47 here, which results in SHA3 `a813484aef6fb598f9f753daf162068ff39ccea4075cb95e1a30f86995b5b7ee`.

## Puzzle 10

```js
00      6020                                                                    PUSH1 20
02      6000                                                                    PUSH1 00
04      6000                                                                    PUSH1 00
06      37                                                                      CALLDATACOPY
07      6000                                                                    PUSH1 00
09      51                                                                      MLOAD
0A      7FF0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0      PUSH32 F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0
2B      16                                                                      AND
2C      6020                                                                    PUSH1 20
2E      6020                                                                    PUSH1 20
30      6000                                                                    PUSH1 00
32      37                                                                      CALLDATACOPY
33      6000                                                                    PUSH1 00
35      51                                                                      MLOAD
36      17                                                                      OR
37      7FABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB      PUSH32 ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB
58      14                                                                      EQ
59      605D                                                                    PUSH1 5D
5B      57                                                                      JUMPI
5C      FD                                                                      REVERT
5D      5B                                                                      JUMPDEST
5E      00                                                                      STOP
```

In the first part, a 32-byte are loaded from the calldata. Then, this is bitwise-AND'ed with 32-byte `0xF0F0..F0` of 32 bytes. Next, another 32-byte is read from the calldata and it is bitwise-OR'ed with the previous result. We require this final result to be equal to `0xABAB..AB`.

We can do this as follows:

```c
0xA0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0 // calldata bytes 0..31
0xF0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0 // given by challenge
// --------------------------------------------------------------- AND
0xA0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0 // result from previous
0x0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B // calldata bytes 32..63
// --------------------------------------------------------------- OR
0xABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB // our result
0xABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB // expected result
```

So our calldata should be `0xA0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A00B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B`
