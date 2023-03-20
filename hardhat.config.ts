import {config as dotEnvConfig} from 'dotenv';
dotEnvConfig();

import type {HardhatUserConfig} from 'hardhat/types';

import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@nomicfoundation/hardhat-chai-matchers';

// setup networks
const networks: HardhatUserConfig['networks'] = {};

// goerli
const ALCHEMY_GOERLI_APIKEY = process.env.ALCHEMY_GOERLI_APIKEY;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;
if (ALCHEMY_GOERLI_APIKEY && GOERLI_PRIVATE_KEY) {
  networks.goerli = {
    url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_GOERLI_APIKEY}`,
    accounts: [GOERLI_PRIVATE_KEY],
  };
}

// hardhat
networks.hardhat = {
  allowUnlimitedContractSize: true,
};

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [{version: '0.8.7'}, {version: '0.6.6'}, {version: '0.7.6'}, {version: '0.5.17'}],
  },
  // generate TypeScript typings from contracts
  typechain: {
    outDir: './types/typechain',
  },
  networks,
};

export default config;
