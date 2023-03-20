import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {CoinFlip} from '../../types/typechain';

describe('Ethernaut 3: CoinFlip', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: CoinFlip;

  const COIN_FLIP_COUNT = 10;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('CoinFlip', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should win many times consecutively', async () => {
    const attackerContract = await ethers
      .getContractFactory('CoinFlipAttacker', attacker)
      .then(f => f.deploy(contract.address));
    await attackerContract.deployed();

    // do psychic flips, guessing the correct side each time
    for (let i = 0; i < COIN_FLIP_COUNT; ++i) {
      await attackerContract.psychicFlip();
    }
  });

  after(async () => {
    expect(await contract.consecutiveWins()).to.eq(COIN_FLIP_COUNT);
  });
});
