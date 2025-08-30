import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const fetchUniqueSymbols = async (): Promise<string[]> => {
  const response = await api.get('/transactions/symbols');
  return response.data;
};

// Margin API functions
export interface MarginTransaction {
  date: string;
  type: 'DRAW' | 'PAYMENT';
  amount: number;
  description: string;
  running_balance: number;
  cash_balance: number;
  daily_interest: number;
  cumulative_interest: number;
}

export interface MarginSummary {
  current_balance: number;
  current_cash_balance: number;
  total_interest_accrued: number;
  total_draws: number;
  total_payments: number;
  average_daily_balance: number;
  days_with_balance: number;
}

export interface DailySummary {
  date: string;
  margin_balance: number;
  cash_balance: number;
  interest_today: number;
  accumulated_interest: number;
}

export interface MarginAnalysis {
  transactions: MarginTransaction[];
  dailySummaries: DailySummary[];
  summary: MarginSummary;
}

export const fetchMarginAnalysis = async (): Promise<MarginAnalysis> => {
  const response = await api.get('/margin/analysis');
  return response.data;
};

export const fetchMarginBalance = async (): Promise<number> => {
  const response = await api.get('/margin/balance');
  return response.data.balance;
};
