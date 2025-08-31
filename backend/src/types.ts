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

export interface Note {
  id: number;
  date_created: string;
  date_modified: string;
  key_date?: string | null;
  symbol?: string | null;
  note_type: string;
  title: string;
  body: string;
}