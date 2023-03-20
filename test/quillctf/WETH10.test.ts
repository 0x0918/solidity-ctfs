import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {WETH10, WETH10Attacker} from '../../types/typechain';

describe('QuillCTF: 9. WETH10', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: WETH10;
  let bob: WETH10Attacker;

  const CONTRACT_INITIAL_BALANCE = ethers.utils.parseEther('10');
  const BOB_INITIAL_BALANCE = ethers.utils.parseEther('1');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('WETH10', owner).then(f => f.deploy());
    await contract.deployed();

    // weth contract should have 10 ether
    await ethers.provider.send('hardhat_setBalance', [contract.address, '0x8ac7230489e80000']);
    expect(await ethers.provider.getBalance(contract.address)).to.eq(CONTRACT_INITIAL_BALANCE);
  });

  it('should rescue funds', async () => {
    bob = await ethers.getContractFactory('WETH10Attacker', attacker).then(f => f.deploy(contract.address));
    await bob.deployed();

    // bob should have 1 ether
    await ethers.provider.send('hardhat_setBalance', [bob.address, '0xde0b6b3a7640000']);
    expect(await ethers.provider.getBalance(bob.address)).to.eq(BOB_INITIAL_BALANCE);

    // pwn
    await bob.pwn();
  });

  after(async () => {
    // empty weth contract
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);

    // bob balance should be 11 ETH
    expect(await ethers.provider.getBalance(bob.address)).to.eq(ethers.utils.parseEther('11'));
  });
});
