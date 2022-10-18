export class OHLCV {
    Exchange: string = "";
    Timestamp: Date;
    Symbol: string = "";
    Timeframe: string = "";
    O: number = 0.00;
    H: number = 0.00;
    L: number = 0.00;
    C: number = 0.00;
    V: number = 0.00;
    TimeframeChange: number = 0.00;
    TimestampMs: number = 0;
}