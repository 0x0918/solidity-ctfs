import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {GatekeeperOne} from '../../types/typechain';

describe('Ethernaut 13: Gatekeeper One', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: GatekeeperOne;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('GatekeeperOne', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should get past the gates', async () => {
    const attackerContract = await ethers
      .getContractFactory('GatekeeperOneAttacker', attacker)
      .then(f => f.deploy(contract.address));
    const gasCandidate = 41378; // may change w.r.t compiler / platform
    const margin = 100;
    await attackerContract.connect(attacker).enter(gasCandidate, margin);
  });

  after(async () => {
    expect(await contract.entrant()).to.eq(attacker.address);
  });
});
