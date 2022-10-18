export enum MarketType {
    spot = "spot",
    margin = "margin",
    future = "future",
}

enum OrderType {
    market = "market",
    limit = "limit",
    stopMarket = "stop_market",
    trailingStopMarket = "trailing_stop_market",
    takeProfit = "take_profit",
    takeProfitMarket = "take_profit_market"
}