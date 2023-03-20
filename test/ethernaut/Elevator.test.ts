import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Elevator} from '../../types/typechain';

describe('Ethernaut 11: Elevator', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Elevator;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Elevator', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should call the elevator successfully', async () => {
    const attackerContract = await ethers.getContractFactory('ElevatorAttacker', attacker).then(f => f.deploy());
    await attackerContract.connect(attacker).callElevator(contract.address);
  });

  after(async () => {
    expect(await contract.top()).to.be.true;
    expect(await contract.floor()).to.eq(1);
  });
});
