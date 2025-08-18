import pool from '../database';
import { Position, ROICalculation } from '../types';

export class PositionService {
  async getAllPositions(): Promise<Position[]> {
    const query = `
      SELECT p.*, s.name as security_name 
      FROM positions p
      LEFT JOIN securities s ON p.symbol = s.symbol
      WHERE p.quantity != 0
      ORDER BY p.symbol
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getAllPositionsIncludingClosed(): Promise<Position[]> {
    const query = `
      SELECT p.*, s.name as security_name 
      FROM positions p
      LEFT JOIN securities s ON p.symbol = s.symbol
      ORDER BY 
        CASE WHEN p.quantity = 0 THEN 1 ELSE 0 END,
        p.symbol
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getPositionBySymbol(symbol: string): Promise<Position | null> {
    const query = 'SELECT * FROM positions WHERE symbol = $1';
    const result = await pool.query(query, [symbol]);
    return result.rows[0] || null;
  }

  async calculateROI(): Promise<ROICalculation[]> {
    const query = `
      SELECT 
        p.symbol,
        p.quantity,
        p.average_cost,
        p.total_invested,
        COALESCE(SUM(o.premium_collected), 0) as total_premium_collected,
        COALESCE(SUM(o.premium_paid), 0) as total_premium_paid,
        COALESCE(SUM(o.net_premium), 0) as net_premium,
        COALESCE(AVG(CASE WHEN o.status = 'OPEN' THEN o.strike_price END), 0) as avg_strike_price
      FROM positions p
      LEFT JOIN options o ON p.symbol = o.underlying_symbol
      WHERE p.quantity > 0
      GROUP BY p.symbol, p.quantity, p.average_cost, p.total_invested
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map((row: any) => {
      const premiumCollected = parseFloat(row.net_premium) || 0;
      const totalInvested = parseFloat(row.total_invested) || 0;
      const avgStrikePrice = parseFloat(row.avg_strike_price) || 0;
      const quantity = parseInt(row.quantity) || 0;
      
      // Calculate potential ROI if options are assigned at strike
      const strikeValue = avgStrikePrice * quantity;
      const potentialReturn = premiumCollected + (strikeValue > 0 ? strikeValue - totalInvested : 0);
      const potentialROI = totalInvested > 0 ? (potentialReturn / totalInvested) * 100 : 0;

      return {
        symbol: row.symbol,
        potentialROI,
        premiumCollected,
        totalInvested,
        strikeValue: strikeValue > 0 ? strikeValue : undefined,
      };
    });
  }

  async getClosedPositionsROI(): Promise<ROICalculation[]> {
    // Calculate actual ROI for closed positions
    const query = `
      SELECT 
        t.calculated_symbol as symbol,
        SUM(CASE WHEN t.transaction_type IN ('Bought', 'Bought To Cover') THEN ABS(t.amount) ELSE 0 END) as total_invested,
        SUM(CASE WHEN t.transaction_type IN ('Sold', 'Sold Short') THEN t.amount ELSE 0 END) as total_received,
        SUM(CASE WHEN t.security_type = 'OPTN' AND t.transaction_type = 'Sold Short' THEN t.amount ELSE 0 END) as premium_collected
      FROM transactions t
      WHERE t.calculated_symbol NOT IN (SELECT symbol FROM positions WHERE quantity > 0)
      GROUP BY t.calculated_symbol
      HAVING SUM(CASE WHEN t.transaction_type IN ('Bought', 'Bought To Cover') THEN ABS(t.amount) ELSE 0 END) > 0
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map((row: any) => {
      const totalInvested = parseFloat(row.total_invested) || 0;
      const totalReceived = parseFloat(row.total_received) || 0;
      const premiumCollected = parseFloat(row.premium_collected) || 0;
      
      const actualReturn = totalReceived - totalInvested;
      const actualROI = totalInvested > 0 ? (actualReturn / totalInvested) * 100 : 0;

      return {
        symbol: row.symbol,
        actualROI,
        potentialROI: actualROI, // Same as actual for closed positions
        premiumCollected,
        totalInvested,
      };
    });
  }

  async updatePositionValue(symbol: string, currentPrice: number): Promise<void> {
    const query = `
      UPDATE positions 
      SET current_value = quantity * $1,
          unrealized_gain_loss = (quantity * $1) - total_invested,
          last_updated = CURRENT_TIMESTAMP
      WHERE symbol = $2
    `;
    await pool.query(query, [currentPrice, symbol]);
  }

  async getPositionsBySymbol(symbol: string): Promise<Position[]> {
    const query = `
      SELECT p.*, s.name as security_name 
      FROM positions p
      LEFT JOIN securities s ON p.symbol = s.symbol
      WHERE p.symbol = $1
      ORDER BY p.symbol
    `;
    const result = await pool.query(query, [symbol]);
    return result.rows;
  }
}

export const positionService = new PositionService();
