import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Force} from '../../types/typechain/';

describe('Ethernaut 7: Force', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Force;

  const amount = ethers.utils.parseEther('0.0001');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Force', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should forcefully send ethers', async () => {
    // force ether
    const attackerContract = await ethers
      .getContractFactory('ForceAttacker', attacker)
      .then(f => f.deploy(contract.address, {value: amount}));
    await attackerContract.deployed();
  });

  after(async () => {
    // confirm balance
    expect(await ethers.provider.getBalance(contract.address)).to.eq(amount);
  });
});
