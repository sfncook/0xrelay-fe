import axios, {
    AxiosAdapter,
    AxiosBasicCredentials,
    AxiosProxyConfig,
    AxiosRequestConfig,
    AxiosTransformer,
    CancelToken
} from 'axios';
import * as React from 'react';

import {
    assetDataUtils,
    BigNumber,
    ContractWrappers,
    generatePseudoRandomSalt,
    Order,
    orderHashUtils,
    signatureUtils,
    SignerType,
} from '0x.js';
import { Web3Wrapper } from '@0xproject/web3-wrapper';

import { NETWORK_CONFIGS } from '../configs';
import { DECIMALS, NULL_ADDRESS } from '../constants';
import { providerEngine } from '../provider_engine';
import { getRandomFutureDateInSeconds } from '../utils';

class OrderCreate extends React.Component {

    private async createOrder() {
        // Initialize the ContractWrappers, this provides helper functions around calling
        // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
        const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
        // Initialize the Web3Wrapper, this provides helper functions around fetching
        // account information, balances, general contract logs
        const web3Wrapper = new Web3Wrapper(providerEngine);
        const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
        const zrxTokenAddress = contractWrappers.exchange.getZRXTokenAddress();
        const etherTokenAddress = contractWrappers.etherToken.getContractAddressIfExists();
        if (!etherTokenAddress) {
            throw new Error('Ether Token not found on this network');
        }

        const makerAssetData = assetDataUtils.encodeERC20AssetData(zrxTokenAddress);
        const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
        // the amount the maker is selling of maker asset
        const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(5), DECIMALS);
        // the amount the maker wants of taker asset
        const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);

        // Allow the 0x ERC20 Proxy to move ZRX on behalf of makerAccount
        const makerZRXApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
            zrxTokenAddress,
            maker,
        );
        await web3Wrapper.awaitTransactionMinedAsync(makerZRXApprovalTxHash);

        // Allow the 0x ERC20 Proxy to move WETH on behalf of takerAccount
        const takerWETHApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
            etherTokenAddress,
            taker,
        );
        await web3Wrapper.awaitTransactionMinedAsync(takerWETHApprovalTxHash);

        // Convert ETH into WETH for taker by depositing ETH into the WETH contract
        const takerWETHDepositTxHash = await contractWrappers.etherToken.depositAsync(
            etherTokenAddress,
            takerAssetAmount,
            taker,
        );
        await web3Wrapper.awaitTransactionMinedAsync(takerWETHDepositTxHash);

        // Generate and expiration time and find the exchange smart contract address
        const randomExpiration = getRandomFutureDateInSeconds();
        const exchangeAddress = contractWrappers.exchange.getContractAddress();

        // Ask the relayer about the parameters they require for the order
        const orderConfigRequest = {
            exchangeAddress,
            makerAddress: maker,
            takerAddress: NULL_ADDRESS,
            expirationTimeSeconds: randomExpiration,
            makerAssetAmount,
            takerAssetAmount,
            makerAssetData,
            takerAssetData,
        };
        const res= await axios.get('http://localhost:3300/v2/order_config?networkId=50');
        const orderConfig = res.data;

        // Create the order
        const order: Order = {
            salt: generatePseudoRandomSalt(),
            ...orderConfigRequest,
            ...orderConfig,
        };

        // Generate the order hash and sign it
        const orderHashHex = orderHashUtils.getOrderHashHex(order);
        const signature = await signatureUtils.ecSignOrderHashAsync(
            providerEngine,
            orderHashHex,
            maker,
            SignerType.Default,
        );
        const signedOrder = { ...order, signature };

        // Validate this order
        await contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);

        // Submit the order to the SRA Endpoint
        try {
            const res2 = await axios.post('http://localhost:3300/v2/order?networkId=50', signedOrder);
            console.log('res2:',res2);
        } catch(e) {
            console.log('e:',e);
        }

        // await httpClient.submitOrderAsync(signedOrder, { networkId: NETWORK_CONFIGS.networkId });
    }


    public render() {
        return (
            <div>
                <h1>Create Order</h1>
                <button onClick={this.createOrder}>Create Order HERE</button>
            </div>
        );
    }
}

export default OrderCreate;
