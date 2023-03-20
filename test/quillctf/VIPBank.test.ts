import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {VIPBank} from '../../types/typechain';

describe('QuillCTF 2: VIP Bank', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: VIPBank;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('VIPBank', owner).then(f => f.deploy());
    await contract.deployed();

    // add VIP & deposit some funds
    await contract.addVIP(owner.address);
    await contract.deposit({value: ethers.utils.parseEther('0.025')});
  });

  it('should lock funds', async () => {
    const attackerContract = await ethers
      .getContractFactory('VIPBankAttacker', attacker)
      .then(f => f.deploy(contract.address, {value: ethers.utils.parseEther('0.51')}));
    await attackerContract.deployed();
  });

  after(async () => {
    await expect(contract.withdraw(ethers.utils.parseEther('0.001'))).to.be.revertedWith(
      'Cannot withdraw more than 0.5 ETH per transaction'
    );
  });
});
