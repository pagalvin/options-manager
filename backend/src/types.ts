export interface Transaction {
  id?: number;
  transactionDate: string;
  transactionType: string;
  securityType: string;
  calculatedSymbol: string;
  symbol: string;
  quantity: number;
  amount: number;
  price: number;
  commission: number;
  strike: number;
  description: string;
  etradeUniqueId?: string;
  createdAt?: Date;
}

export interface Security {
  id?: number;
  symbol: string;
  name?: string;
  securityType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Position {
  id?: number;
  securityId?: number;
  symbol: string;
  quantity: number;
  averageCost: number;
  totalInvested: number;
  currentValue: number;
  unrealizedGainLoss: number;
  lastUpdated?: Date;
  manual_avg_strike_price?: number;
  manual_option_contracts?: number;
  recommended_weekly_premium?: number;
}

export interface Option {
  id?: number;
  underlyingSecurityId?: number;
  underlyingSymbol: string;
  optionSymbol: string;
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: string;
  quantity: number;
  premiumCollected: number;
  premiumPaid: number;
  netPremium: number;
  isCovered: boolean;
  status: 'OPEN' | 'CLOSED' | 'ASSIGNED' | 'EXPIRED';
  openedDate?: string;
  closedDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MonthlyPerformance {
  id?: number;
  year: number;
  month: number;
  totalPremiumCollected: number;
  totalPremiumPaid: number;
  netPremium: number;
  realizedGains: number;
  totalRoi: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface ROICalculation {
  symbol: string;
  actualROI?: number;
  potentialROI: number;
  premiumCollected: number;
  totalInvested: number;
  strikeValue?: number;
}

export interface UploadedTransaction {
  'Transaction Date': string;
  'Transaction Type': string;
  'Security Type': string;
  'Calculated Symbol': string;
  'Symbol': string;
  'Quantity': string;
  'Amount': string;
  'Price': string;
  'Commission': string;
  'Strike': string;
  'Description': string;
}

export interface StockAnalysis {
  ticker: string;
  companyName: string;
  keyDates: {
    foundedYear: number;
    mostRecentEarnings: string;
    nextEarningsDate: string;
  };
  headquarters: {
    city: string;
    state: string;
    country: string;
    address?: string;
  };
  industry: {
    gicsSector: string;
    gicsIndustryGroup: string;
    gicsIndustry: string;
    gicsSubIndustry: string;
  };
  industryPosition: {
    rank?: string;
    keyCompetitors: string[];
    peerCompanies: string[];
    keySuppliers?: string[];
  };
  recentNews: {
    title: string;
    summary: string;
    url: string;
  }[];
  analystSentiment?: {
    consensusRating: string;
    numberOfAnalysts: number;
    averagePriceTarget: number;
    highPriceTarget: number;
    lowPriceTarget: number;
    recentChanges: string[];
    summary: string;
  };
  investmentCases: {
    bullish: string[];
    bearish: string[];
  };
  trends: {
    industryTrends: {
      summary: string;
      impactOutlook: string;
    };
    macroeconomicTrends: {
      summary: string;
      impactOutlook: string;
    };
  };
  redFlags: {
    goingConcernLanguage?: boolean;
    legalOrRegulatoryIssues: string[];
    financialPerformance: {
      decliningRevenue?: boolean;
      weakEarningsQuality?: boolean;
      unstableMargins?: boolean;
    };
    balanceSheet: {
      highDebtToEquity?: boolean;
      liquidityIssues?: boolean;
      accountingChanges?: boolean;
    };
    riskDisclosures: {
      lawsuitsOrInvestigations?: boolean;
      customerOrSupplierConcentration?: boolean;
      geopoliticalOrCommodityExposure?: boolean;
    };
    incomeStatement: {
      unexplainedRevenueSpikes?: boolean;
      expenseDropVsRevenue?: boolean;
    };
  };
  technicalAnalysis: {
    supportLevels: number[];
    resistanceLevels: number[];
    movingAverages: {
      fiftyDay: number;
      twoHundredDay: number;
    };
    rsi: number;
    averageVolume: number;
    narrativeSummary?: string;
  };
  investorResources?: {
    investorRelationsPage: string;
    secFilingsPage: string;
  };
  companySummary?: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    searchEntryPoint?: {
      renderedContent?: string;
    };
    retrievalMetadata?: any;
  };
}

export interface StockSnapshot {
  id?: number;
  ticker: string;
  companyName: string;
  snapshotDate: Date;
  analysisData: StockAnalysis;
  createdAt?: Date;
  updatedAt?: Date;
}
