export interface Transaction {
  id?: number;
  transaction_date: string;
  transaction_type: string;
  security_type: string;
  calculated_symbol: string;
  symbol: string;
  quantity: number;
  amount: number;
  price: number;
  commission: number;
  strike: number;
  description: string;
  etrade_unique_id?: string;
  created_at?: Date;
}

export interface Position {
  id?: number;
  security_id?: number;
  symbol: string;
  quantity: number;
  average_cost: number;
  total_invested: number;
  current_value: number;
  unrealized_gain_loss: number;
  last_updated?: Date;
  security_name?: string;
}

export interface Option {
  id?: number;
  underlying_security_id?: number;
  underlying_symbol: string;
  option_symbol: string;
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  expiration_date: string;
  quantity: number;
  premium_collected: number;
  premium_paid: number;
  net_premium: number;
  is_covered: boolean;
  status: 'OPEN' | 'CLOSED' | 'ASSIGNED' | 'EXPIRED';
  opened_date?: string;
  closed_date?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface MonthlyPerformance {
  id?: number;
  year: number;
  month: number;
  total_premium_collected: number;
  total_premium_paid: number;
  net_premium: number;
  realized_gains: number;
  total_roi: number;
  created_at?: Date;
  updated_at?: Date;
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

export interface PerformanceSummary {
  totalPremiumCollected: number;
  totalPremiumPaid: number;
  netPremium: number;
  totalRealizedGains: number;
  totalROI: number;
}

export interface SystemStats {
  totalTransactions: number;
  totalPositions: number;
  totalOptions: number;
  openOptions: number;
  lastTransactionDate: string | null;
  databaseSize: string;
}

export interface UploadResult {
  message: string;
  totalRows: number;
  processedCount: number;
  skippedCount: number;
}
