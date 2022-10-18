export class Trade {
    exchangeName: string = "";
    orderId: string = "";
    symbol: string = "";
    coinAmount: number = 0.00;
    side: string = ""; // buy or sell
    buyPrice: number = 0.00;
    sellPrice: number = 0.00;
    SL: number = 0.00;
    TP: number = 0.00;
    timestamp: Date = new Date();
    profit: number = 0.00;
    loss: number = 0.00;
    change: number = 0.00;
    orderType: string = ""; // market or limit
    trailingStopPercentage: number = 0.00;
    trailingStopPrice: number = 0.00;
    stepTrailPercentage: number = 0.00;
    stepTrailPrice: number = 0.00;
    open: boolean = false; //orden ya en mercado
    active: boolean = false; //orden en mercado pero no abierta (ej: orden pendiente)

    constructor() {
        this.active = true;
    }
}