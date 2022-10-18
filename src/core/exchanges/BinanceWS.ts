import { Trade } from "../models/trade";
import ccxt from "ccxt";
import config from "../../config/config";
import axios from "axios";
import { log } from "../Logger";
import { BinanceClient, CandlePeriod, Ticker, Candle } from "ccxws";
import { Market } from "ccxws/dist/src/Market";
//import { OrderType, MarketType } from '../models/enumTypes';
import { roundTo, dynamicSort, isSymbolInArray, capitalize, formatDate, getPercentageDifferenceBetweenCurrentPriceAndOrderPrice } from "../utils";
import { Cex } from '../models/cex';
import { OHLCV } from '../models/ohlcv';
import crypto from 'crypto';
import JSONbigint from 'json-bigint'

export class BinanceWS extends Cex {
    ApiKey:string;
    ApiSecret:string;
    instance:ccxt.binance;
    instanceWS:BinanceClient;
    state:string; //Open|Closed
    timeframe:string;
    marketType:string;
    futuresURL:string;
    constructor(apiKey:string = "", apiSecret:string ="", enableWS:boolean = false) {
        super("Binance");
        this.ApiKey = apiKey;
        this.ApiSecret = apiSecret;
        this.myAssets = this.getMyAssets(this.exchangeName);
        this.timeframe = config.data.timeframe;
        this.marketType = config.data.marketType.toLowerCase();
        this.futuresURL = config.data.BINANCE_FUTURES_URL;

        this.initExchange();
        if(enableWS) {
            this.initExchangeWS();
        }
    }

    initExchange() {
        this.instance = new ccxt.binance({
            apiKey: this.ApiKey,
            secret: this.ApiSecret,
            rateLimit: 1000,
            enableRateLimit: true,
            options: {
                defaultType: this.marketType, //spot | margin | future
                adjustForTimeDifference: true 
            }
        });
    }

    initExchangeWS() {
        this.instanceWS = new BinanceClient();
        this.instanceWS.on("error", err => this.state = err);
        this.instanceWS.on("connecting", data => this.state = "Connecting");
        this.instanceWS.on("connected", data => this.state = "Connected");
        this.instanceWS.on("disconnected", data => this.state = "Disconnected");
        this.instanceWS.on("closed", () => { this.state = "Closed" });

        this.myAssets.forEach(asset => {
            const symbolAsset = asset + "USDT"; //Ex: ETHUSDT
            const subscribeData = {
                id: symbolAsset,
                base: asset,
                quote: "USDT",
                type: this.marketType
            };
            this.instanceWS.candlePeriod = this.getCandlePeriod(this.timeframe);
            this.instanceWS.on("candle", async (candle: Candle, market: Market) => {
                this.saveData(market, candle)
            });
            this.instanceWS.subscribeCandles(subscribeData);
        })
    }

    getCandlePeriod(timeframe:string): CandlePeriod {
        switch (timeframe.toLocaleLowerCase()) {
            case "1m":
                return CandlePeriod._1m;
                break;
            case "5m":
                return CandlePeriod._5m
                break;
            case "15m":
                return CandlePeriod._15m;
                break;
            case "30m":
                return CandlePeriod._30m;
                break;
            case "1h":
                return CandlePeriod._1h;
                break;
            case "2h":
                return CandlePeriod._2h;
                break;
            case "4h":
                return CandlePeriod._4h;
                break;
            case "1d":
                return CandlePeriod._1d;
                break;
            default:
                return CandlePeriod._5m;         
        }
    }

    saveData(market: Market, candle: Candle): void | PromiseLike<void> {
        let symbolWithSlash = this.normalizeAssetWS(market.id, true);
        let symbolsCurrentData = this.symbolsCurrentData.filter(x => x.Symbol !== symbolWithSlash);
        let candleInfo = new OHLCV();
        candleInfo.Exchange = this.exchangeName;
        candleInfo.Symbol = symbolWithSlash;
        candleInfo.Timeframe = this.timeframe;
        candleInfo.O = Number(candle.open);
        candleInfo.H = Number(candle.high);
        candleInfo.L = Number(candle.low);
        candleInfo.C = Number(candle.close);
        candleInfo.V = Number(candle.volume);    
        candleInfo.Timestamp = new Date(candle.timestampMs);
        candleInfo.TimestampMs = candle.timestampMs;
        this.symbolsCurrentData.push(candleInfo);
    }

    reset() {
        this.instanceWS.reconnect();
    }

    normalizeAssetWS = (assetName: string, divideWithSlash:boolean =false) {
        if(divideWithSlash) {
            return assetName.replace("USDT", "") + "/USDT";
        }
        return assetName.replace("/", "");
    }

    public getInstance() {
        return this.instance;
    }

    getCurrencyBalance = async(currency:string, marketType:string = this.marketType) => {
        let result = 0;
        try {
            const balance = await this.getInstance().fetchBalance({type: marketType});
            result = balance.total[currency.toLocaleUpperCase()];
            if(result === undefined) {
                result = 0;
            }
        } catch (error) {
            log.red(error);
        }    
        return result;
    }

    public async getOHLCV(symbol:string, timeframe:string): Promise<OHLCV> {
        let result = new OHLCV();
        result.Exchange = this.exchangeName;
        result.Symbol = symbol;
        let ohlcv = this.symbolsCurrentData.find(x => x.Symbol === symbol);
        if(ohlcv !== undefined) {
            result.Exchange = this.exchangeName;
            result.Symbol = symbol;
            result.Timeframe = timeframe;
            result.O = ohlcv.O;
            result.H = ohlcv.H;
            result.L = ohlcv.L;
            result.C = ohlcv.C;
            result.V = ohlcv.V;
            result.Timestamp = ohlcv.Timestamp;
            result.TimestampMs = ohlcv.TimestampMs;
        } else {
            this.symbolsCurrentData.push(result);
        }
        return result;
    }

    deletePendingOrders = async(e:OHLCV, orderType:string = "stop_market", percentageOpenStopOrders:number = 0) => {
        let result = false;
        let minDifference = percentageOpenStopOrders / 2;
        let maxDifference = percentageOpenStopOrders * 2;
        try {
            if(config.data.demoMode) {
                this.currentTrades = this.currentTrades.filter(x => x.symbol !== e.Symbol && x.active === true);
                return false;
            }
            const limitOpenOrders = await this.instance.fetchOpenOrders(e.Symbol, Date.now() - (1000 * 60 * 60), 4, {type: this.marketType}); //since Now - 1 hour
            let buyLimitOrder = limitOpenOrders.find(x => x.side === 'buy' && x.type === orderType && x.symbol === e.Symbol && x.filled === 0);
            if(buyLimitOrder !== undefined && 
            (minDifference < getPercentageDifferenceBetweenCurrentPriceAndOrderPrice(e.C, buyLimitOrder.price) || 
            maxDifference > getPercentageDifferenceBetweenCurrentPriceAndOrderPrice(e.C, buyLimitOrder.price))) {
                await this.instance.cancelOrder(buyLimitOrder.id, e.Symbol, {type: this.marketType});
                this.currentTrades = this.currentTrades.filter(x => x.orderId !== buyLimitOrder.id);
                result = true;
            }
            let sellLimitOrder = limitOpenOrders.find(x => x.side === 'sell' && x.type === orderType && x.symbol === e.Symbol && x.filled === 0);
            if(sellLimitOrder !== undefined && 
            (minDifference < getPercentageDifferenceBetweenCurrentPriceAndOrderPrice(e.C, sellLimitOrder.price) ||
            maxDifference > getPercentageDifferenceBetweenCurrentPriceAndOrderPrice(e.C, sellLimitOrder.price))) {
                await this.instance.cancelOrder(sellLimitOrder.id, e.Symbol, {type: this.marketType});
                this.currentTrades = this.currentTrades.filter(x => x.orderId !== sellLimitOrder.id);
                result = true;
            }
        } catch (error) {
            log.red(error)
        }
        return result;
    }

    getOpenOrder = async(symbol:string, orderType:string = 'stop_market') => {
        let result = undefined;   
        try {
            const localOpenOrder = this.currentTrades.find(x => x.symbol === symbol && x.active === true && x.open === true);
            if(localOpenOrder === undefined) {
                const queryStringOpenOrder = `symbol=${symbol.replace("/", "")}&timestamp=${Date.now()}`;
                const urlOpenOrder = this.futuresURL + "/fapi/v2/positionRisk?symbol=" + symbol.replace("/", "") + "&timestamp=" + Date.now() + "&signature=" + this.buildSignature(queryStringOpenOrder);
                const queryStringLastOrders = `symbol=${symbol.replace("/", "")}&limit=20&timestamp=${Date.now()}`;
                const urlLastOrders = this.futuresURL + "/fapi/v1/allOrders?symbol=" + symbol.replace("/", "") + "&limit=20&timestamp=" + Date.now() + "&signature=" + this.buildSignature(queryStringLastOrders);
                let axiosConfig = {
                    headers: {
                        'X-MBX-APIKEY': config.data.BINANCE_MARGIN_KEY
                    },
                    transformResponse: [function (data) {
                        return JSONbigint.parse(data)
                    }]
                };
                let orders = [];
                let exchangeOpenOrder = undefined;
                const responseLastOrders = [];
                const responseOpenOrder = await axios.get(urlOpenOrder, axiosConfig);           
                if(responseOpenOrder.status === 200) {
                    console.log("RESPONSE ORDER DATA", responseOpenOrder.data);
                    orders = responseOpenOrder.data;
                    orders = orders.filter(x => x.positionAmt != 0 && x.entryPrice > 0);
                    if(orders.length > 0) {
                        const responseLastOrders = await axios.get(urlLastOrders, axiosConfig);
                        if(responseLastOrders.status === 200) {
                            let exchangeOpenOrders = responseLastOrders.data;
                            exchangeOpenOrders = exchangeOpenOrders.filter(x => x.reduceOnly === false && x.status === 'FILLED' && x.avgPrice > 0)
                                                                    .map(item => { return {...item, orderId: item.orderId.toString()}});
                            if(exchangeOpenOrders.length > 0) {
                                exchangeOpenOrders = exchangeOpenOrders.sort(await dynamicSort("time"));
                                exchangeOpenOrder = exchangeOpenOrders[exchangeOpenOrders.length - 1];
                            }
                        }
                    }
                }
                
                if(exchangeOpenOrder !== undefined) {
                    let newTrade = new Trade();
                    newTrade.exchangeName = this.exchangeName;
                    newTrade.orderId = exchangeOpenOrder.orderId;
                    newTrade.symbol = symbol;
                    newTrade.side = exchangeOpenOrder.side.toLocaleLowerCase();
                    newTrade.buyPrice = exchangeOpenOrder.side.toLocaleLowerCase() === "buy" ? exchangeOpenOrder.avgPrice : 0;
                    newTrade.sellPrice = exchangeOpenOrder.side.toLocaleLowerCase() === "sell" ? exchangeOpenOrder.avgPrice : 0;

                    newTrade.trailingStopPercentage = config.data.trailingStopPercentage;
                    newTrade.trailingStopPrice = exchangeOpenOrder.side.toLocaleLowerCase() === "buy" ? 
                                                roundTo(newTrade.buyPrice * (1 + (config.data.trailingStopPercentage / 100)),4):
                                                roundTo(newTrade.sellPrice * (1 - (config.data.trailingStopPercentage / 100)),4);
                    newTrade.stepTrailPercentage = config.data.stepTrailPercentage; 
                    newTrade.stepTrailPrice = exchangeOpenOrder.side.toLocaleLowerCase() === "buy" ? 
                                            roundTo(newTrade.trailingStopPrice * (1 - (config.data.stepTrailPercentage / 100)),4) :
                                            roundTo(newTrade.trailingStopPrice * (1 + (config.data.stepTrailPercentage / 100)),4);
                    newTrade.SL = exchangeOpenOrder.side.toLocaleLowerCase() === "buy" ?
                                roundTo(newTrade.buyPrice * (1 + (config.data.percentageChangeToStopLoss / 100)),4) : 
                                roundTo(newTrade.sellPrice * (1 - (config.data.percentageChangeToStopLoss / 100)),4);
                    newTrade.TP = exchangeOpenOrder.side.toLocaleLowerCase() === "buy" ?
                                    roundTo(newTrade.buyPrice * (1 + (config.data.percentageChangeToTakeProffit / 100)),4) : 
                                    roundTo(newTrade.sellPrice * (1 - (config.data.percentageChangeToTakeProffit / 100)),4);
                    newTrade.coinAmount = exchangeOpenOrder.executedQty;
                    newTrade.timestamp = new Date(exchangeOpenOrder.time);
                    newTrade.orderType = orderType;                     
                    newTrade.open = true;
                    this.currentTrades.push(newTrade);
                    result = newTrade;
                }
            } else { 
                result = localOpenOrder;
            }
        } catch (error) {
            log.red(error);
        } 
        
        return result;
    }

    buildSignature(query_string: string) {
        return crypto.createHmac('sha256', config.data.BINANCE_MARGIN_SECRET).update(query_string).digest('hex');
    }



}
