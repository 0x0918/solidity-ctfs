import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Shop} from '../../types/typechain';

describe('Ethernaut 21: Shop', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Shop;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Shop', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should buy the item for a lesser price', async () => {
    // deploy attacker boi
    const attackerContract = await ethers
      .getContractFactory('ShopAttacker', attacker)
      .then(f => f.deploy(contract.address));
    await attackerContract.deployed();

    // pwnage
    await attackerContract.pwn();
  });

  after(async () => {
    // price should be set to 0
    expect(await contract.price()).to.eq(0);
  });
});
