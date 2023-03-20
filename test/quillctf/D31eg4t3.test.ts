import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {D31eg4t3, D31eg4t3Attacker} from '../../types/typechain';

describe('QuillCTF 5: D31eg4t3', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: D31eg4t3;
  let attackerContract: D31eg4t3Attacker;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('D31eg4t3', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should claim ownership and hack', async () => {
    // deploy the attacker contract
    attackerContract = await ethers.getContractFactory('D31eg4t3Attacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    // initiate first claim and consequent re-entries via pwn
    await attackerContract.connect(attacker).pwn(contract.address);
  });

  after(async () => {
    expect(await contract.owner()).to.eq(attacker.address);
    expect(await contract.canYouHackMe(attacker.address)).to.be.true;
  });
});
