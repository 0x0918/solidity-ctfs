import {BigNumber} from 'ethers';
import {ethers} from 'hardhat';

/**
 * Returns the 32-byte value at a given address.
 * This works for on-chain contracts too, not just local Hardhat!
 * @param address contract address
 * @param slot storage slot (0 indexed)
 * @returns bytes32 value as hex string
 */
export async function getStorage(address: string, slot: number): Promise<string> {
  return await ethers.provider.getStorageAt(address, ethers.utils.hexValue(slot));
}

/**
 * Increases the timestamp for the next block, which will take effect when it is mined.
 * Only to be used locally.
 * @param time object with `s seconds`, `m minutes`, `h hours` and `d days` where `undefined` fields are considered 0.
 */
export async function fastForward(time: {s?: number; m?: number; h?: number; d?: number}) {
  let seconds = 0;
  seconds += (time.s || 0) * 1; // for the sake of alignment <3
  seconds += (time.m || 0) * 60;
  seconds += (time.h || 0) * 60 * 60;
  seconds += (time.d || 0) * 24 * 60 * 60;
  await ethers.provider.send('evm_increaseTime', [seconds]);
}

/**
 * Sets the balance of an account to the given value.
 * Only to be used with Hardhat network of course.
 * @param address target address
 * @param balance new balance
 */
export async function setBalance(address: string, balance: BigNumber) {
  await ethers.provider.send('hardhat_setBalance', [address, balance.toHexString()]);
}

/**
 * Resets the balance of an account to
 * Only to be used with Hardhat network of course.
 * @param address target address
 * @param balance new balance
 */

export async function resetBalance(address: string) {
  await ethers.provider.send('hardhat_setBalance', [address, '0x21e19e0c9bab2400000']); // 1000 ETH
}

/**
 * Sets the runtime code of an address.
 * Only to be used with Hardhat network of course.
 * @param address target address
 * @param code runtime code (with 0x prefix)
 */
export async function setCode(address: string, code: string) {
  await ethers.provider.send('hardhat_setCode', [address, code]);
}
