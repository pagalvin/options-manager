export interface ETradeStockQuote {
  quoteResponse: {
    quoteData: {
      product: {
        symbol: string;
        companyName: string;
      };
      all: {
        lastTrade: number;
        bid: number;
        ask: number;
        bidSize: number;
        askSize: number;
        volume: number;
        open: number;
        high: number;
        low: number;
        close: number;
        changeClose: number;
        changeClosePercentage: number;
        lastTradeTime: number;
      };
    }[];
  };
}

export interface ETradeOptionGreeks {
  rho: number;
  vega: number;
  theta: number;
  delta: number;
  gamma: number;
  iv: number;
  currentValue: boolean;
}

export interface ETradeOptionDetails {
  optionCategory: string;
  optionRootSymbol: string;
  timeStamp: number;
  adjustedFlag: boolean;
  displaySymbol: string;
  optionType: string;
  strikePrice: number;
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  inTheMoney: string;
  volume: number;
  openInterest: number;
  netChange: number;
  lastPrice: number;
  quoteDetail: string;
  osiKey: string;
  OptionGreeks: ETradeOptionGreeks;
}

export interface ETradeOptionChainPair {
  Call?: ETradeOptionDetails;
  Put?: ETradeOptionDetails;
  pairType?: string;
}

export interface ETradeSelectedED {
  month: number;
  year: number;
  day: number;
}

export interface ETradeOptionChain {
  optionPairs?: ETradeOptionChainPair[];
  OptionPair?: ETradeOptionChainPair[];
  timeStamp: number;
  quoteType: string;
  nearPrice: number;
  selected?: ETradeSelectedED;
  SelectedED?: ETradeSelectedED;
}

export interface ETradeOptionChainResponse {
  OptionChainResponse: {
    timeStamp: number;
    quoteType: string;
    nearPrice: number;
    OptionPair: ETradeOptionChainPair[];
    SelectedED: ETradeSelectedED;
  };
}

export interface ETradeExpirationDate {
  year: number;
  month: number;
  day: number;
  expiryType: string;
}

export interface ETradeLookupData {
  symbol: string;
  description: string;
  type: string;
}

export interface ETradeLookupResponse {
  data?: ETradeLookupData[];
  Data?: ETradeLookupData[];
}

export interface ETradeAuthResponse {
  sessionId: string;
  authUrl: string;
}

export interface ETradeAuthStatus {
  authenticated: boolean;
}

export interface ETradeExpirationDates {
  expirationDates: ETradeExpirationDate[];
}
