import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {CryptoVault, DoubleEntryPoint, Forta, LegacyToken} from '../../types/typechain';

describe('Ethernaut 26: Double Entry Point', () => {
  let owner: SignerWithAddress;
  let player: SignerWithAddress; // you, protecting via detection bot
  let evil: SignerWithAddress; // some attacker, trying to sweep

  let newToken: DoubleEntryPoint;
  let legacyToken: LegacyToken;
  let forta: Forta;
  let vault: CryptoVault;

  const VAULT_LEGACY_BALANCE = ethers.utils.parseEther('100');

  before(async () => {
    [owner, player, evil] = await ethers.getSigners();

    // deploy legacy token
    legacyToken = await ethers.getContractFactory('LegacyToken', owner).then(f => f.deploy());
    await legacyToken.deployed();

    // deploy Forta
    forta = await ethers.getContractFactory('Forta', owner).then(f => f.deploy());
    await forta.deployed();

    // deploy CryptoVault
    vault = await ethers.getContractFactory('CryptoVault', owner).then(f => f.deploy(player.address));
    await vault.deployed();

    // deploy new token
    newToken = await ethers
      .getContractFactory('DoubleEntryPoint', owner)
      .then(f => f.deploy(legacyToken.address, vault.address, forta.address, player.address));

    // set underlying token for vault
    await vault.setUnderlying(newToken.address);

    // update legacy token to delegate to new token
    await legacyToken.delegateToNewContract(newToken.address);

    // mint legacy tokens
    await legacyToken.mint(vault.address, VAULT_LEGACY_BALANCE);
  });

  it('should prevent the sweep attack via detection bot', async () => {
    // deploy your detection bot
    const detectionContract = await ethers
      .getContractFactory('DoubleEntryPointDetectionBot', player)
      .then(f => f.deploy(vault.address));
    await detectionContract.deployed();

    // register
    await forta.connect(player).setDetectionBot(detectionContract.address);
  });

  after(async () => {
    // confirm that detection bot is deployed
    expect(await forta.usersDetectionBots(player.address)).to.not.eq(ethers.constants.AddressZero);

    // when someone tries to sweep, it should be detected by the bot
    await expect(vault.connect(evil).sweepToken(legacyToken.address)).to.be.revertedWith(
      'Alert has been triggered, reverting'
    );
  });
});
