import { StockSnapshot } from '../types/stockAnalysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface StockAnalysisResponse {
  success: boolean;
  snapshot: StockSnapshot;
  message?: string;
}

export interface StockAnalysisHistoryResponse {
  success: boolean;
  snapshots: StockSnapshot[];
}

export interface StockAnalysisError {
  error: string;
  message: string;
}

class StockAnalysisService {
  /**
   * Get or generate stock analysis for a ticker
   */
  async getStockAnalysis(ticker: string, forceRefresh: boolean = false): Promise<StockSnapshot> {
    try {
      const url = `${API_BASE_URL}/stock-analysis/${ticker.toUpperCase()}${forceRefresh ? '?refresh=true' : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData: StockAnalysisError = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stock analysis');
      }

      const data: StockAnalysisResponse = await response.json();
      return data.snapshot;
    } catch (error: any) {
      console.error('Error fetching stock analysis:', error);
      throw error;
    }
  }

  /**
   * Force refresh the stock analysis for a ticker
   */
  async refreshStockAnalysis(ticker: string): Promise<StockSnapshot> {
    try {
      const url = `${API_BASE_URL}/stock-analysis/${ticker.toUpperCase()}/refresh`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData: StockAnalysisError = await response.json();
        throw new Error(errorData.message || 'Failed to refresh stock analysis');
      }

      const data: StockAnalysisResponse = await response.json();
      return data.snapshot;
    } catch (error: any) {
      console.error('Error refreshing stock analysis:', error);
      throw error;
    }
  }

  /**
   * Get historical snapshots for a ticker
   */
  async getSnapshotHistory(ticker: string): Promise<StockSnapshot[]> {
    try {
      const url = `${API_BASE_URL}/stock-analysis/${ticker.toUpperCase()}/history`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData: StockAnalysisError = await response.json();
        throw new Error(errorData.message || 'Failed to fetch snapshot history');
      }

      const data: StockAnalysisHistoryResponse = await response.json();
      return data.snapshots;
    } catch (error: any) {
      console.error('Error fetching snapshot history:', error);
      throw error;
    }
  }

  /**
   * Delete all snapshots for a ticker
   */
  async deleteSnapshots(ticker: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/stock-analysis/${ticker.toUpperCase()}`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData: StockAnalysisError = await response.json();
        throw new Error(errorData.message || 'Failed to delete snapshots');
      }
    } catch (error: any) {
      console.error('Error deleting snapshots:', error);
      throw error;
    }
  }

  /**
   * Get current stock price from E*TRADE (runtime retrieval)
   */
  async getCurrentPrice(ticker: string, sessionId?: string): Promise<{
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    lastTradeTime: number;
    companyName?: string;
  } | null> {
    try {
      const url = `${API_BASE_URL}/stock-analysis/${ticker.toUpperCase()}/current-price`;
      
      const headers: HeadersInit = {};
      if (sessionId) {
        headers['x-session-id'] = sessionId;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // If authentication is required, return null (UI will handle gracefully)
        if (errorData.needsAuth || response.status === 401) {
          console.warn('E*TRADE authentication required for current price');
          return null;
        }

        console.error('stockAnalysisService: Error response from current price API:', errorData);
        
        throw new Error(errorData.message || 'Failed to fetch current price');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching current price:', error);
      // Return null instead of throwing to allow the UI to function without price
      return null;
    }
  }
}

export const stockAnalysisService = new StockAnalysisService();
