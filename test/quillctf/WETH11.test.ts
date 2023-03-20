import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {WETH11, WETH11Attacker} from '../../types/typechain';

describe('QuillCTF: 11. WETH11', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: WETH11;
  let bob: WETH11Attacker;

  const BOB_INITIAL_BALANCE = ethers.utils.parseEther('10');

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('WETH11', owner).then(f => f.deploy());
    await contract.deployed();

    // bob is deployed with 10 ether, deposits it to WETH and transfer the WETH mistakenly
    bob = await ethers
      .getContractFactory('WETH11Attacker', owner)
      .then(f => f.deploy(contract.address, {value: BOB_INITIAL_BALANCE}));

    // as a result, contract has 10 ETH and 10 WETH
    expect(await ethers.provider.getBalance(contract.address)).to.eq(BOB_INITIAL_BALANCE);
    expect(await contract.balanceOf(contract.address)).to.eq(BOB_INITIAL_BALANCE);
  });

  it('should rescue funds', async () => {
    await bob.connect(attacker).pwn();
  });

  after(async () => {
    // empty weth contract
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);
    expect(await contract.balanceOf(contract.address)).to.eq(0);

    // bob balance should be 10 ETH
    expect(await ethers.provider.getBalance(bob.address)).to.eq(BOB_INITIAL_BALANCE);
  });
});
