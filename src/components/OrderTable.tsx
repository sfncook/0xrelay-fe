import axios from 'axios';
import * as React from 'react';

import {
  ContractWrappers,
} from '0x.js';

import { NETWORK_CONFIGS } from '../configs';
import { providerEngine } from '../provider_engine';


import '../App.css';

class OrderTable extends React.Component {

    constructor(props:any) {
        super(props);

        this.state = {
            orderBookAsks: {},
            orderBookBids: {},
        };

        OrderTable.getOrderBook();
    }

  private static async getOrderBook() {
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    const etherTokenAddress = contractWrappers.etherToken.getContractAddressIfExists();
    if (!etherTokenAddress) {
      throw new Error('Ether Token not found on this network');
    }

    const config = {headers:{'Access-Control-Allow-Origin':'*'}};
    const res = await axios.get('http://localhost:3300/v2/orderbook?networkId=50', config);
    console.log('res.data.asks:',res.data.asks);
    console.log('res.data.bids:',res.data.bids);
  }

  public render() {
    return (
      <div>
          <table>
              <tbody>
              <tr><td>FOO</td></tr>
              <tr><td>BAR</td></tr>
              </tbody>
          </table>
      </div>
    );
  }
}

export default OrderTable;
