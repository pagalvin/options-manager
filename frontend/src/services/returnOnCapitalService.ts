// No need for utility import - using direct URL like other services

export interface ReturnOnCapitalData {
  symbol: string;
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  returnOnCapital: number;
  transactionCount: number;
  firstTransactionDate: Date;
  lastTransactionDate: Date;
}

export interface MonthlyReturnOnCapitalData {
  month: string;
  year: number;
  monthNumber: number;
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  returnOnCapital: number;
  activeSymbols: number;
}

export interface AggregatedReturnOnCapitalData {
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  overallReturnOnCapital: number;
  numberOfPositions: number;
  timeRangeStart: Date;
  timeRangeEnd: Date;
}

export interface ReturnOnCapitalPieChartData {
  label: string;
  value: number;
  premium: number;
  capital: number;
}

export interface ReturnOnCapitalBarChartData {
  period: string;
  returnOnCapital: number;
  premiumCollected: number;
  capitalInvested: number;
  activeSymbols: number;
}

class ReturnOnCapitalService {
  private baseUrl = 'http://localhost:3001/api/return-on-capital';

  async getReturnOnCapitalBySymbol(): Promise<ReturnOnCapitalData[]> {
    const response = await fetch(`${this.baseUrl}/symbol`);
    if (!response.ok) {
      throw new Error(`Failed to fetch return on capital by symbol: ${response.statusText}`);
    }
    return response.json();
  }

  async getReturnOnCapitalBySymbolName(symbol: string): Promise<ReturnOnCapitalData | null> {
    const response = await fetch(`${this.baseUrl}/symbol/${encodeURIComponent(symbol)}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch return on capital for symbol ${symbol}: ${response.statusText}`);
    }
    return response.json();
  }

  async getMonthlyReturnOnCapital(): Promise<MonthlyReturnOnCapitalData[]> {
    const response = await fetch(`${this.baseUrl}/monthly`);
    if (!response.ok) {
      throw new Error(`Failed to fetch monthly return on capital: ${response.statusText}`);
    }
    return response.json();
  }

  async getAggregatedReturnOnCapital(): Promise<AggregatedReturnOnCapitalData> {
    const response = await fetch(`${this.baseUrl}/aggregated`);
    if (!response.ok) {
      throw new Error(`Failed to fetch aggregated return on capital: ${response.statusText}`);
    }
    return response.json();
  }

  async getReturnOnCapitalPieChartData(): Promise<ReturnOnCapitalPieChartData[]> {
    const response = await fetch(`${this.baseUrl}/pie-chart-data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch return on capital pie chart data: ${response.statusText}`);
    }
    return response.json();
  }

  async getReturnOnCapitalBarChartData(): Promise<ReturnOnCapitalBarChartData[]> {
    const response = await fetch(`${this.baseUrl}/bar-chart-data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch return on capital bar chart data: ${response.statusText}`);
    }
    return response.json();
  }

  async getTopPerformingSymbolsByRoC(limit: number = 10): Promise<ReturnOnCapitalData[]> {
    const response = await fetch(`${this.baseUrl}/top-performers/${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch top performing symbols: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export singleton instance
export const returnOnCapitalService = new ReturnOnCapitalService();
export default returnOnCapitalService;