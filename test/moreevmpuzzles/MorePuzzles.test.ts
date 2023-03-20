import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {setCode} from '../../utils';

// Each puzzle consists of the runtime code
const puzzles: {[num: number]: string} = {
  1: '0x36340A56FEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFE5B58360156FEFE5B00',
  2: '0x3660006000373660006000F0600080808080945AF13D600a14601F57FEFEFE5B00',
  3: '0x3660006000373660006000F06000808080935AF460055460aa14601e57fe5b00',
  4: '0x30313660006000373660003031F0319004600214601857FD5B00',
  5: '0x60203611600857FD5B366000600037365903600314601957FD5B00',
  6: '0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03401600114602a57fd5b00',
  7: '0x5a345b60019003806000146011576002565b5a90910360a614601d57fd5b00',
  8: '0x341519600757fd5b3660006000373660006000f047600060006000600047865af1600114602857fd5b4714602f57fd5b00',
  9: '0x34600052602060002060F81C60A814601657FDFDFDFD5B00',
  10: '0x602060006000376000517ff0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f01660206020600037600051177fabababababababababababababababababababababababababababababababab14605d57fd5b00',
};

// Solutions are made of callvalue and/or calldata.
const solutions: {[num: number]: {data?: string; value?: number}} = {
  1: {
    value: 2,
    data: '0x112233445566',
  },
  2: {
    data: '0x600a600C600039600a6000f360FF608052600a80f3',
  },
  3: {
    data: '0x6005600c60003960056000f360aa600555',
  },
  4: {
    value: 8, // any even number would work
    data: '0x600080808060023404815af1600080f3',
  },
  5: {
    data: '0x11223344112233441122334411223344112233441122334411223344112233441122334411223344112233441122334411223344112233441122334411',
  },
  6: {
    value: 17,
  },
  7: {
    value: 4,
  },
  8: {
    value: 8,
    data: '0x600f600c600039600f6000f3600160805260016080808047335af1',
  },
  9: {
    value: 47,
  },
  10: {
    data: '0xA0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A00B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B',
  },
};

describe('More EVM Puzzles', () => {
  let game: SignerWithAddress;
  const NUM_PUZZLES = Object.keys(puzzles).length;
  const CHALLENGE = '0xfffffffffffffffffffffffffffffffffffffff1';

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
