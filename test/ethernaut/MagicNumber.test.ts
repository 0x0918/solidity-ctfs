import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {MagicNum} from '../../types/typechain';

describe('Ethernaut 18: Magic Number', () => {
  // accounts
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: MagicNum;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('MagicNum', owner).then(f => f.deploy());
    await contract.deployed();
  });

  it('should set solver', async () => {
    // contract bytecodes
    const initializationCode = '600a600C600039600a6000F3';
    const runtimeCode = '602a60805260206080F3';

    // deploy your contract
    const tx = await attacker.sendTransaction({
      to: undefined, // contract creation
      data: '0x' + initializationCode + runtimeCode,
    });
    const receipt = await tx.wait();

    // get address from receipt
    const addr = receipt.contractAddress;
    expect(addr).to.be.properAddress;

    // set solver
    await contract.connect(attacker).setSolver(addr);
  });

  after(async () => {
    expect(await contract.check()).to.be.true;
  });
});
