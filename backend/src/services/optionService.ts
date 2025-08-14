import pool from '../database';
import { Option } from '../types';

export class OptionService {
  async getAllOptions(): Promise<Option[]> {
    const query = `
      SELECT * FROM options 
      ORDER BY expiration_date ASC, underlying_symbol ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getOpenOptions(): Promise<Option[]> {
    const query = `
      SELECT * FROM options 
      WHERE status = 'OPEN' AND quantity <> 0
      ORDER BY expiration_date ASC, underlying_symbol ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getOptionsBySymbol(underlyingSymbol: string): Promise<Option[]> {
    const query = `
      SELECT * FROM options 
      WHERE underlying_symbol = $1
      ORDER BY expiration_date ASC, strike_price ASC
    `;
    const result = await pool.query(query, [underlyingSymbol]);
    return result.rows;
  }

  async getExpiringOptions(days: number = 30): Promise<Option[]> {
    const query = `
      SELECT * FROM options 
      WHERE status = 'OPEN' 
        AND expiration_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND quantity > 0
      ORDER BY expiration_date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async updateOptionStatus(id: number, status: 'OPEN' | 'CLOSED' | 'ASSIGNED' | 'EXPIRED'): Promise<void> {
    const query = `
      UPDATE options 
      SET status = $1, 
          closed_date = CASE WHEN $1 != 'OPEN' THEN CURRENT_DATE ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [status, id]);
  }

  async markExpiredOptions(): Promise<number> {
    const query = `
      UPDATE options 
      SET status = 'EXPIRED', 
          closed_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'OPEN' 
        AND expiration_date < CURRENT_DATE
        AND quantity > 0
      RETURNING id
    `;
    const result = await pool.query(query);
    return result.rows.length;
  }

  async getCoveredCallAnalysis(): Promise<any[]> {
    const query = `
      SELECT 
        o.underlying_symbol,
        o.strike_price,
        o.expiration_date,
        o.premium_collected,
        o.quantity as option_quantity,
        p.quantity as stock_quantity,
        p.average_cost,
        CASE 
          WHEN p.quantity >= (o.quantity * 100) THEN true 
          ELSE false 
        END as is_fully_covered,
        (o.strike_price - p.average_cost) * o.quantity * 100 as potential_capital_gain,
        o.premium_collected + ((o.strike_price - p.average_cost) * o.quantity * 100) as total_potential_return,
        ((o.premium_collected + ((o.strike_price - p.average_cost) * o.quantity * 100)) / (p.average_cost * o.quantity * 100)) * 100 as potential_roi
      FROM options o
      LEFT JOIN positions p ON o.underlying_symbol = p.symbol
      WHERE o.status = 'OPEN' 
        AND o.option_type = 'CALL'
        AND o.quantity > 0
      ORDER BY o.expiration_date ASC, potential_roi DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}
