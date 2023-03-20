import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {setCode} from '../../utils';

// Each puzzle consists of the runtime code
const puzzles: {[num: number]: string} = {
  1: '0x3456FDFDFDFDFDFD5B00',
  2: '0x34380356FDFD5B00FDFD',
  3: '0x3656FDFD5B00',
  4: '0x34381856FDFDFDFDFDFD5B00',
  5: '0x34800261010014600C57FDFD5B00FDFD',
  6: '0x60003556FDFDFDFDFDFD5B00',
  7: '0x36600080373660006000F03B600114601357FD5B00',
  8: '0x36600080373660006000F0600080808080945AF1600014601B57FD5B00',
  9: '0x36600310600957FDFD5B343602600814601457FD5B00',
  10: '0x38349011600857FD5B3661000390061534600A0157FDFDFDFD5B00',
};

// Solutions are made of callvalue and/or calldata.
const solutions: {[num: number]: {data?: string; value?: number}} = {
  1: {
    value: 8,
  },
  2: {
    value: 4,
  },
  3: {
    data: '0x11223344',
  },
  4: {
    value: 6,
  },
  5: {
    value: 16,
  },
  6: {
    data: '0x000000000000000000000000000000000000000000000000000000000000000A',
  },
  7: {
    data: '0x6001600C60003960016000F3EE',
  },
  8: {
    data: '0x6005600C60003960056000F360006000FD',
  },
  9: {
    data: '0x11223344',
    value: 2,
  },
  10: {
    value: 15,
  },
};

describe('EVM Puzzles', () => {
  let game: SignerWithAddress;
  const NUM_PUZZLES = Object.keys(puzzles).length;
  const CHALLENGE = '0xfffffffffffffffffffffffffffffffffffffff0';

  before(async () => {
    [game] = await ethers.getSigners();
    expect(Object.keys(puzzles).length).to.eq(Object.keys(solutions).length);
  });

  for (let i = 1; i <= NUM_PUZZLES; ++i) {
    it('should pass puzzle ' + i, async () => {
      await setCode(CHALLENGE, puzzles[i]);
      await expect(
        game.sendTransaction({
          to: CHALLENGE,
          ...solutions[i],
        })
      ).to.not.be.reverted;
    });
  }
});
