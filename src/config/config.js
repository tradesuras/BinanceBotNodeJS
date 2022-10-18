require("dotenv").config({path: "./.env"});

data = {
    tickInterval: 30,                       //interval in seconds
    demoMode: true,                         //warning: if false bot will create real orders
    enabledExchanges: ["binance"],          //exchanges to run strategies
    marketType: "future",                   //spot | future | margin
    timeframe: "1m",                        //candle timeframe
    strategy: "trend",                       //strategies so far: 'trend' | reverse
    trailingStopEnabled: true,              //enable trailing stop
    trailingStopPercentage: 0.312,              //trailingStop in %
    steTrailPercentage: 0.687,                  //stepTrail in %
    percentageChangeToTrade: 0.5,            //for trend strategy
    reverseChangeToTrade: -2,                //for reverse strategy
    percentageChangeToStopLoss: -2.5,        //stop loss for all strategies
    percentageChangeToTakeProfit: 5,        //take profit for all strategies
    logAnalysis: true,                      //log to console
    logToFile: true,                        //log to file
    maxTrades: 8,                           //trades at the same time
    usdtToBuy: 20,                          //USDT to buy tokens in every trade
    panicProtection: -20,                    //max USDT balance losses in a day to stop trading in that exchange  

    BINANCE_KEY: process.env.BINANCE_KEY,
    BINANCE_SECRET: process.env.BINANCE_SECRET,
    BINANCE_FUTURES_URL: process.env.BINANCE_FUTURES_URL,
    BINANCE_MARGIN_KEY: process.env.BINANCE_MARGIN_KEY,
    BINANCE_MARGIN_SECRET: process.env.BINANCE_MARGIN_SECRET,
    KUCOIN_KEY: process.env.KUCOIN_KEY,
    KUCOIN_SECRET: process.env.KUCOIN_SECRET,
    KUCOIN_PASSPHRASE: process.env.KUCOIN_PASSPHRASE
}

module.exports.data = data;