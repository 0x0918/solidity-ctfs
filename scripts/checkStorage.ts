import {getStorage} from '../utils';

// target contract
const CONTRACT = '0x971e55F02367DcDd1535A7faeD0a500B64f2742d';

/**
 * Checks the storage slots in `[from, to)` of any contract.
 * Prints the output to console.
 */
export default async function checkStorageRange(from: number, to: number) {
  for (let i = from; i < to; i++) {
    console.log(i, ':', await getStorage(CONTRACT, i));
  }
}

if (require.main === module) {
  checkStorageRange(0, 8);
}
