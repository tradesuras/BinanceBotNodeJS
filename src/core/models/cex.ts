import { Trade } from "./trade";
import { OHLCV } from "./ohlcv";
import { SessionData } from "./sessionData";
import assets from '../../config/assets.json';
import { roundTo } from '../utils';

export abstract class Cex {
    exchangeName: string = "";
    instance: any;
    currentTrades: Trade[] = [];
    symbolsPreviousData: OHLCV[] = [];
    symbolsCurrentData: OHLCV[] = [];
    startDay: Date;
    myAssets: string[];
    session: SessionData;

    constructor(exchangeName: string = "") {
        this.exchangeName = exchangeName;
        this.currentTrades = new Array<Trade>();
        this.symbolsPreviousData = new Array<OHLCV>();
        this.symbolsCurrentData = new Array<OHLCV>();
        this.startDay = new Date();
        this.session = new SessionData();
    }

    abstract getInstance();

    abstract getCurrencyBalance(currency: string, marketType?: string): Promise<number>;

    abstract getOHLCV(symbol: string, timeframe: string): Promise<OHLCV>;

    abstract deletePendingOrders(candle: OHLCV, orderType?: string, minDifference?: number): Promise<boolean>;

    abstract getOHLCVHistory(symbol: string, timeframe: string, candlesQuantity?: number): Promise<OHLCV[]>;

    abstract getOrderStatus(orderId: any, symbol: string): Promise<string>;

    abstract createOrder(trade: Trade): Promise<any>;

    abstract getOpenOrder(symbol: string, orderType?: string): Promise<Trade>;

    getMyAssets(exchange: string): string[] {
        let ex = assets.exchangeAssets.find(e => e.exchangeName.toLocaleLowerCase() === exchange.toLocaleLowerCase());
        return ex !== undefined ? ex.assets : [];
    }

    newTrade(trade: Trade): Trade {
        this.currentTrades.push(trade);
        return trade;
    }

    calculateChangePercentage = (currentPrice: number, previousPrice: number = 0) => {
        if (currentPrice > 0 && previousPrice > 0)
            return (currentPrice * 100 / previousPrice) - 100;
        else
            return 0;
    }

    removeTrade(trade: Trade, currentPrice: number, percentageSinceOpen: number = 0) {
        trade.change = roundTo(percentageSinceOpen, 2);
        if (trade.side === "buy") {
            trade.sellPrice = roundTo(currentPrice, 4);
            if (percentageSinceOpen !== 0) {
                if ((currentPrice - trade.buyPrice) > 0) {
                    let profit = trade.coinAmount * (currentPrice - trade.buyPrice);
                    trade.profit = roundTo(profit, 2);
                } else {
                    let loss = trade.coinAmount * (currentPrice - trade.buyPrice);
                    trade.loss = roundTo(loss, 2);
                }
            }
        } else if (trade.side === "sell") {
            trade.buyPrice = roundTo(currentPrice, 4);
            if(percentageSinceOpen !== 0) {
                if((currentPrice - trade.sellPrice) < 0) {
                    let profit = trade.coinAmount * (trade.sellPrice - currentPrice);
                    trade.profit = roundTo(profit, 2);
                } else {
                    let loss = trade.coinAmount * (trade.sellPrice - currentPrice);
                    trade.loss = roundTo(loss, 2);
                }
            }
        }
        trade.open = false;
        trade.active = false;
    }

    cleanHistoricalTrades(hoursToKeep = 3, changeHours=false) {
        if(changeHours) {
            let hoursBefore = new Date();
            hoursBefore.setHours(hoursBefore.getHours() - hoursToKeep);
            this.currentTrades = this.currentTrades.filter(trade => new Date(trade.timestamp) > hoursBefore);
        }
        else {
            let now = new Date();
            if(now.getDate() > this.startDay.getDate() || 
            now.getMonth() > this.startDay.getMonth() ||
            now.getFullYear() > this.startDay.getFullYear()) {
                this.startDay = now;
                this.session = new SessionData();
                this.currentTrades = this.currentTrades.filter(trade => new Date(trade.timestamp).getDate() === this.startDay.getDate() || trade.active === true);
            }
        }
    }

    getTrade(symbol:string, onlyOpen:boolean = false): Trade {
        return onlyOpen ? this.currentTrades.find(trade => trade.symbol === symbol && trade.active === true && trade.open  === true) :
        this.currentTrades.find(trade => trade.symbol === symbol && trade.active === true);
    }

    getAllTrades(includeInactives = true, orderType = "all") : Trade[] {
        let result;
        if(includeInactives) {
            orderType === "all" ?
            result = this.currentTrades :
            result = this.currentTrades.filter(trade => trade.orderType === orderType); //market or limit
        }
        else {
            orderType === "all" ?
            result = this.currentTrades.filter(trade => trade.active === true) :
            result = this.currentTrades.filter(trade => trade.active === true && trade.orderType === orderType);
        }
        return result;
    }

    getSessionData(): SessionData {
        let totalProfits = 0;
        let totalLoss = 0;
        let profits = 0;
        let losses = 0;
        let tradesQuantity = 0;
        this.currentTrades.forEach(element => {
            totalProfits=totalProfits + element.profit;
            totalLoss=totalLoss + element.loss;
            if(element.open) tradesQuantity++;
            if(element.profit > 0) profits++;
            if(element.loss < 0) losses++;
        });
        let balance = totalProfits + totalLoss;
        this.session.balance = balance;
        this.session.tradesQuantity = tradesQuantity;
        this.session.profits = profits;
        this.session.losses = losses;

        return this.session;
    }

    getActiveTrades(): number {
        let result: Trade[] = new Array<Trade>();
        this.currentTrades.forEach(element => {
            if(element.active && element.open) {
                result.push(element);
            }
        })
        return result.length;
    }

    getAllHistoricalTrades(): number {
        return this.currentTrades.length;
    }
}

