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
import { HttpClient } from '@0xproject/connect';
import { Web3Wrapper } from '@0xproject/web3-wrapper';

import { NETWORK_CONFIGS } from './configs';
import { DECIMALS, NULL_ADDRESS } from './constants';
import { PrintUtils } from './print_utils';
import { providerEngine } from './provider_engine';
import { getRandomFutureDateInSeconds } from './utils';


import './App.css';

class App extends React.Component {

    private async init() {
        PrintUtils.printScenario('Fill Order Standard Relayer API');
        // Initialize the ContractWrappers, this provides helper functions around calling
        // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
        const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
        // Initialize the Web3Wrapper, this provides helper functions around fetching
        const web3Wrapper = new Web3Wrapper(providerEngine);
        // account information, balances, general contract logs
        const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
        const zrxTokenAddress = contractWrappers.exchange.getZRXTokenAddress();
        const etherTokenAddress = contractWrappers.etherToken.getContractAddressIfExists();
        if (!etherTokenAddress) {
            throw new Error('Ether Token not found on this network');
        }
        const printUtils = new PrintUtils(
            web3Wrapper,
            contractWrappers,
            { maker, taker },
            { WETH: etherTokenAddress, ZRX: zrxTokenAddress },
        );
        printUtils.printAccounts();

        const makerAssetData = assetDataUtils.encodeERC20AssetData(zrxTokenAddress);
        const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
        // the amount the maker is selling of maker asset
        const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(5), DECIMALS);
        // the amount the maker wants of taker asset
        const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);

        // let txHash;
        // let txReceipt;

        // Allow the 0x ERC20 Proxy to move ZRX on behalf of makerAccount
        const makerZRXApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
            zrxTokenAddress,
            maker,
        );
        // await printUtils.awaitTransactionMinedSpinnerAsync('Maker ZRX Approval', makerZRXApprovalTxHash);
        await web3Wrapper.awaitTransactionMinedAsync(makerZRXApprovalTxHash);

        // Allow the 0x ERC20 Proxy to move WETH on behalf of takerAccount
        const takerWETHApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
            etherTokenAddress,
            taker,
        );
        // await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Approval', takerWETHApprovalTxHash);
        await web3Wrapper.awaitTransactionMinedAsync(takerWETHApprovalTxHash);

        // Convert ETH into WETH for taker by depositing ETH into the WETH contract
        const takerWETHDepositTxHash = await contractWrappers.etherToken.depositAsync(
            etherTokenAddress,
            takerAssetAmount,
            taker,
        );
        // await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Deposit', takerWETHDepositTxHash);
        await web3Wrapper.awaitTransactionMinedAsync(takerWETHDepositTxHash);

        PrintUtils.printData('Setup', [
            ['Maker ZRX Approval', makerZRXApprovalTxHash],
            ['Taker WETH Approval', takerWETHApprovalTxHash],
            ['Taker WETH Deposit', takerWETHDepositTxHash],
        ]);

        // Initialize the Standard Relayer API client
        const httpClient = new HttpClient('http://localhost:3300/v2/');

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

        console.log('#1');
        const orderConfig = await httpClient.getOrderConfigAsync(
            orderConfigRequest,
            { networkId: NETWORK_CONFIGS.networkId },
        );
        console.log('#2');

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
        console.log('#31');
        await httpClient.submitOrderAsync(signedOrder, { networkId: NETWORK_CONFIGS.networkId });
        console.log('#32');
    }

    public render() {
        return (
            <div className="App">
                <header className="App-header">
                    <h1 className="App-title">Welcome to React</h1>
                </header>
                <p className="App-intro">
                    To get started, edit <code>src/App.tsx</code> and save to reload.
                </p>
                <button onClick={this.init}>CREATE ORDER</button>
            </div>
        );
    }
}

export default App;
