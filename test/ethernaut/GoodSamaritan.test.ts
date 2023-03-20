import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {GoodSamaritan, GoodSamaritanCoin, GoodSamaritanWallet} from '../../types/typechain';
import {BigNumber} from 'ethers';

describe('Ethernaut 27: Good Samaritan', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: GoodSamaritan;
  let wallet: GoodSamaritanWallet;
  let coin: GoodSamaritanCoin;

  let walletInitialBalance: BigNumber;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    // deploy good samaritan, it deploys wallet & coin automatically
    contract = await ethers.getContractFactory('GoodSamaritan', owner).then(f => f.deploy());
    await contract.deployed();

    // attach to wallet
    const walletAddress = await contract.wallet();
    wallet = await ethers.getContractFactory('GoodSamaritanWallet', owner).then(f => f.attach(walletAddress));
    expect(await wallet.owner()).to.eq(contract.address);

    // attach to coin
    const coinAddress = await contract.coin();
    coin = await ethers.getContractFactory('GoodSamaritanCoin', owner).then(f => f.attach(coinAddress));
    walletInitialBalance = await coin.balances(contract.address);
  });

  it('should deplete tokens', async () => {
    const attackerContract = await ethers.getContractFactory('GoodSamaritanAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();
  });

  after(async () => {
    // contract should be depleted
    expect(await coin.balances(contract.address)).to.eq(0);
    // attacker should have everything
    expect(await coin.balances(attacker.address)).to.eq(walletInitialBalance);
  });
});
