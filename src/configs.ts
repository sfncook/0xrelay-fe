import { GANACHE_NETWORK_ID, KOVAN_NETWORK_ID, ROPSTEN_NETWORK_ID } from './constants';
import { NetworkSpecificConfigs } from './types';

export const TX_DEFAULTS = { gas: 400000 };
export const MNEMONIC = 'concert load couple harbor equip island argue ramp clarify fence smart topic';
export const BASE_DERIVATION_PATH = `44'/60'/0'/0`;
export const GANACHE_CONFIGS: NetworkSpecificConfigs = {
    networkId: GANACHE_NETWORK_ID,
    rpcUrl: 'http://127.0.0.1:8545',
};
export const KOVAN_CONFIGS: NetworkSpecificConfigs = {
    networkId: KOVAN_NETWORK_ID,
    rpcUrl: 'https://kovan.infura.io/',
};
export const ROPSTEN_CONFIGS: NetworkSpecificConfigs = {
    networkId: ROPSTEN_NETWORK_ID,
    rpcUrl: 'https://ropsten.infura.io/',
};
export const NETWORK_CONFIGS = GANACHE_CONFIGS; // or KOVAN_CONFIGS or ROPSTEN_CONFIGS
