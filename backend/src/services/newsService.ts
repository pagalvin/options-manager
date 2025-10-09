import pool from '../database';
import { geminiService } from './geminiService';

export interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  publicationDate?: string;
}

export interface TickerNews {
  ticker: string;
  analysisDate: string;
  articles: NewsArticle[];
  error?: string;
}

export interface NewsSnapshot {
  id: number;
  date_generated: Date;
  gemini_response: TickerNews[];
  created_at: Date;
  updated_at: Date;
}

class NewsService {
  /**
   * Get news snapshot for a specific date
   */
  async getNewsSnapshotByDate(date: Date): Promise<NewsSnapshot | null> {
    try {
      // Extract just the YYYY-MM-DD part to avoid timezone issues
      const dateStr = date.toISOString().split('T')[0]; // e.g., "2025-10-08"
      
      // Query for snapshots on the same day using DATE comparison
      // Using string comparison to avoid timezone conversion issues
      const query = `
        SELECT * FROM overlord.news_snapshots
        WHERE DATE(date_generated) = $1::date
        ORDER BY date_generated DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [dateStr]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching news snapshot by date:', error);
      throw error;
    }
  }

  /**
   * Get all news snapshots
   */
  async getAllNewsSnapshots(): Promise<NewsSnapshot[]> {
    try {
      const query = `
        SELECT * FROM overlord.news_snapshots
        ORDER BY date_generated DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all news snapshots:', error);
      throw error;
    }
  }

  /**
   * Get news snapshot dates (for navigation)
   */
  async getSnapshotDates(): Promise<Date[]> {
    try {
      const query = `
        SELECT DISTINCT DATE(date_generated) as snapshot_date
        FROM overlord.news_snapshots
        ORDER BY snapshot_date DESC
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => new Date(row.snapshot_date));
    } catch (error) {
      console.error('Error fetching snapshot dates:', error);
      throw error;
    }
  }

  /**
   * Generate news snapshot for given tickers
   * Runs sequentially to avoid rate limits
   */
  async generateNewsSnapshot(
    tickers: string[],
    progressCallback?: (ticker: string, index: number, total: number, data: TickerNews) => void
  ): Promise<NewsSnapshot> {
    try {
      const newsData: TickerNews[] = [];
      
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        console.log(`Generating news for ${ticker} (${i + 1}/${tickers.length})`);
        
        try {
          // Wait a bit between requests to avoid rate limiting
          if (i > 0) {
            await this.sleep(2000); // 2 second delay between requests
          }
          
          const tickerNews = await geminiService.generateNewsAnalysis(ticker);
          newsData.push(tickerNews);
          
          // Call progress callback if provided
          if (progressCallback) {
            progressCallback(ticker, i + 1, tickers.length, tickerNews);
          }
          
        } catch (error: any) {
          console.error(`Error generating news for ${ticker}:`, error);
          
          // If rate limited, wait longer and retry once
          if (error.message === 'RATE_LIMITED') {
            console.log(`Rate limited for ${ticker}, waiting 10 seconds...`);
            await this.sleep(10000);
            
            try {
              const tickerNews = await geminiService.generateNewsAnalysis(ticker);
              newsData.push(tickerNews);
              
              if (progressCallback) {
                progressCallback(ticker, i + 1, tickers.length, tickerNews);
              }
            } catch (retryError: any) {
              console.error(`Retry failed for ${ticker}:`, retryError);
              newsData.push({
                ticker,
                analysisDate: new Date().toISOString(),
                articles: [],
                error: retryError.message
              });
              
              if (progressCallback) {
                progressCallback(ticker, i + 1, tickers.length, {
                  ticker,
                  analysisDate: new Date().toISOString(),
                  articles: [],
                  error: retryError.message
                });
              }
            }
          } else {
            // Other error - log and continue
            newsData.push({
              ticker,
              analysisDate: new Date().toISOString(),
              articles: [],
              error: error.message
            });
            
            if (progressCallback) {
              progressCallback(ticker, i + 1, tickers.length, {
                ticker,
                analysisDate: new Date().toISOString(),
                articles: [],
                error: error.message
              });
            }
          }
        }
      }
      
      // Save to database
      const query = `
        INSERT INTO overlord.news_snapshots (date_generated, gemini_response)
        VALUES ($1, $2)
        RETURNING *
      `;
      
      const result = await pool.query(query, [new Date(), JSON.stringify(newsData)]);
      return result.rows[0];
      
    } catch (error) {
      console.error('Error generating news snapshot:', error);
      throw error;
    }
  }

  /**
   * Delete a news snapshot
   */
  async deleteNewsSnapshot(id: number): Promise<void> {
    try {
      const query = `DELETE FROM overlord.news_snapshots WHERE id = $1`;
      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error deleting news snapshot:', error);
      throw error;
    }
  }

  /**
   * Helper function to sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const newsService = new NewsService();
