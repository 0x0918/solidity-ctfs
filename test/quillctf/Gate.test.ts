import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Gate} from '../../types/typechain';

describe('QuillCTF 9: Gate', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Gate;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Gate', owner).then(f => f.deploy());
    await contract.deployed();

    // gate is closed initially
    expect(await contract.opened()).to.be.false;
  });

  it('should open the gate', async () => {
    // contract bytecodes
    const initializationCode = '60208060093d393df3';
    const runtimeCode = '32333d3560e01c5b801561001857905060019003610007565b503d5260203df3';

    // deploy your contract
    const tx = await attacker.sendTransaction({
      to: undefined, // contract creation
      data: '0x' + initializationCode + runtimeCode,
    });
    const receipt = await tx.wait();

    // get address from receipt
    const addr = receipt.contractAddress;
    expect(addr).to.be.properAddress;

    // open the gate
    await contract.connect(attacker).open(addr);
  });

  after(async () => {
    // gate should be opened
    expect(await contract.opened()).to.be.true;
  });
});
