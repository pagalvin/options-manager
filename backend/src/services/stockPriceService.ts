import axios from 'axios';
import { StockPrice } from '../types';

export class StockPriceService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.STOCK_API_KEY || '';
    this.baseUrl = process.env.STOCK_API_URL || 'https://finnhub.io/api/v1';
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // Using Finnhub.io as the free stock price API
      // You can get a free API key at https://finnhub.io/
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol.toUpperCase(),
          token: this.apiKey,
        },
      });

      const data = response.data;
      
      if (data.c === 0) {
        // No data available
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        price: data.c, // Current price
        change: data.d, // Change
        changePercent: data.dp, // Percent change
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleStockPrices(symbols: string[]): Promise<StockPrice[]> {
    const prices: StockPrice[] = [];
    
    // Add delay to avoid rate limiting
    for (const symbol of symbols) {
      try {
        const price = await this.getStockPrice(symbol);
        if (price) {
          prices.push(price);
        }
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }
    
    return prices;
  }

  // Alternative free API: Alpha Vantage (backup implementation)
  async getStockPriceAlphaVantage(symbol: string): Promise<StockPrice | null> {
    try {
      // This is a backup implementation using Alpha Vantage
      // You can get a free API key at https://www.alphavantage.co/
      const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
      
      if (!alphaVantageKey) {
        console.warn('Alpha Vantage API key not configured');
        return null;
      }

      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol.toUpperCase(),
          apikey: alphaVantageKey,
        },
      });

      const quote = response.data['Global Quote'];
      
      if (!quote || !quote['05. price']) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching Alpha Vantage price for ${symbol}:`, error);
      return null;
    }
  }

  // Yahoo Finance alternative (free but unofficial)
  async getStockPriceYahoo(symbol: string): Promise<StockPrice | null> {
    try {
      // This uses the unofficial Yahoo Finance API
      // Note: This is not officially supported and may break
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const result = response.data.chart.result[0];
      
      if (!result || !result.meta) {
        return null;
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching Yahoo price for ${symbol}:`, error);
      return null;
    }
  }

  // Stub method for testing without API calls
  async getStockPriceStub(symbol: string): Promise<StockPrice> {
    // Returns mock data for testing
    const mockPrices: { [key: string]: number } = {
      'AAPL': 150.00,
      'MSFT': 300.00,
      'GOOGL': 2500.00,
      'TSLA': 200.00,
      'NVDA': 400.00,
    };

    const basePrice = mockPrices[symbol.toUpperCase()] || 100.00;
    const randomChange = (Math.random() - 0.5) * 10; // Random change between -5 and +5
    const currentPrice = basePrice + randomChange;
    const changePercent = (randomChange / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: randomChange,
      changePercent: changePercent,
      timestamp: Date.now(),
    };
  }
}
