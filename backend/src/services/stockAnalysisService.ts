import pool from '../database';
import { StockAnalysis, StockSnapshot } from '../types';
import { geminiService } from './geminiService';

class StockAnalysisService {
  /**
   * Get the most recent stock snapshot for a given ticker
   */
  async getMostRecentSnapshot(ticker: string): Promise<StockSnapshot | null> {
    const query = `
      SELECT 
        id,
        ticker,
        company_name as "companyName",
        snapshot_date as "snapshotDate",
        analysis_data as "analysisData",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stock_snapshots
      WHERE ticker = $1
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching most recent snapshot:', error);
      throw new Error(`Failed to fetch snapshot for ${ticker}: ${error}`);
    }
  }

  /**
   * Get all snapshots for a ticker (for historical tracking)
   */
  async getSnapshotsByTicker(ticker: string): Promise<StockSnapshot[]> {
    const query = `
      SELECT 
        id,
        ticker,
        company_name as "companyName",
        snapshot_date as "snapshotDate",
        analysis_data as "analysisData",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stock_snapshots
      WHERE ticker = $1
      ORDER BY snapshot_date DESC
    `;

    try {
      const result = await pool.query(query, [ticker.toUpperCase()]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching snapshots by ticker:', error);
      throw new Error(`Failed to fetch snapshots for ${ticker}: ${error}`);
    }
  }

  /**
   * Generate a new stock analysis snapshot using Gemini AI
   */
  async generateSnapshot(ticker: string, forceRefresh: boolean = false): Promise<StockSnapshot> {
    try {
      // Check if we have a recent snapshot (unless force refresh is requested)
      if (!forceRefresh) {
        const recentSnapshot = await this.getMostRecentSnapshot(ticker);
        
        if (recentSnapshot) {
          const snapshotAge = Date.now() - new Date(recentSnapshot.snapshotDate).getTime();
          const oneDayInMs = 24 * 60 * 60 * 1000;
          
          // If snapshot is less than 1 day old, return it
          if (snapshotAge < oneDayInMs) {
            console.log(`Returning cached snapshot for ${ticker} (${Math.round(snapshotAge / 1000 / 60)} minutes old)`);
            return recentSnapshot;
          }
        }
      }

      console.log(`Generating new stock analysis for ${ticker}...`);

      // Generate the analysis using Gemini AI
      const analysis = await geminiService.generateStockAnalysis(ticker);

      // Save the snapshot to the database
      const savedSnapshot = await this.saveSnapshot(ticker, analysis);

      return savedSnapshot;
    } catch (error) {
      console.error('Error generating snapshot:', error);
      throw new Error(`Failed to generate analysis for ${ticker}: ${error}`);
    }
  }

  /**
   * Save a stock analysis snapshot to the database
   */
  async saveSnapshot(ticker: string, analysis: StockAnalysis): Promise<StockSnapshot> {
    const query = `
      INSERT INTO stock_snapshots (ticker, company_name, snapshot_date, analysis_data)
      VALUES ($1, $2, NOW(), $3)
      RETURNING 
        id,
        ticker,
        company_name as "companyName",
        snapshot_date as "snapshotDate",
        analysis_data as "analysisData",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await pool.query(query, [
        ticker.toUpperCase(),
        analysis.companyName,
        JSON.stringify(analysis)
      ]);

      console.log(`Saved stock snapshot for ${ticker}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving snapshot:', error);
      throw new Error(`Failed to save snapshot for ${ticker}: ${error}`);
    }
  }

  /**
   * Delete a snapshot by ID
   */
  async deleteSnapshot(id: number): Promise<void> {
    const query = 'DELETE FROM stock_snapshots WHERE id = $1';

    try {
      await pool.query(query, [id]);
      console.log(`Deleted snapshot with ID ${id}`);
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      throw new Error(`Failed to delete snapshot: ${error}`);
    }
  }

  /**
   * Delete all snapshots for a ticker
   */
  async deleteSnapshotsByTicker(ticker: string): Promise<void> {
    const query = 'DELETE FROM stock_snapshots WHERE ticker = $1';

    try {
      const result = await pool.query(query, [ticker.toUpperCase()]);
      console.log(`Deleted ${result.rowCount} snapshot(s) for ${ticker}`);
    } catch (error) {
      console.error('Error deleting snapshots:', error);
      throw new Error(`Failed to delete snapshots for ${ticker}: ${error}`);
    }
  }
}

export const stockAnalysisService = new StockAnalysisService();
