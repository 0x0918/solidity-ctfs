import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Telephone} from '../../types/typechain/';

describe('Ethernaut 4: Telephone', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Telephone;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Telephone', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should hijack ownership', async () => {
    // initial owner is correct
    expect(await contract.owner()).to.eq(owner.address);

    // deploy attacker
    const attackerContract = await ethers
      .getContractFactory('TelephoneAttacker', attacker)
      .then(f => f.deploy(contract.address));
    await attackerContract.deployed();
  });

  after(async () => {
    // confirm hijacked owner
    expect(await contract.owner()).to.eq(attacker.address);
  });
});
