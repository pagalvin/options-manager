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
