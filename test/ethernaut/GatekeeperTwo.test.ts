import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {GatekeeperTwo} from '../../types/typechain';

describe('Ethernaut 14: Gatekeeper Two', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: GatekeeperTwo;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('GatekeeperTwo', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should get past the gates', async () => {
    await ethers.getContractFactory('GatekeeperTwoAttacker', attacker).then(f => f.deploy(contract.address));
  });

  after(async () => {
    expect(await contract.entrant()).to.eq(attacker.address);
  });
});
