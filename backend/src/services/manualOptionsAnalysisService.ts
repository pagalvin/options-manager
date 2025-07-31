import pool from '../database';

export interface ManualOptionsAnalysis {
  id?: number;
  security: string;
  market_price?: number | null;
  lots?: number | null;
  option_date?: string | null;
  strike_price?: number | null;
  premium_per_contract?: number | null;
  notes?: string | null;
  next_earnings_date?: string | null;
  company_name?: string | null;
  ex_dividend_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export class ManualOptionsAnalysisService {
  async getAllEntries(): Promise<ManualOptionsAnalysis[]> {
    const query = `
      SELECT * FROM overlord.manual_options_analysis 
      ORDER BY security ASC, option_date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getEntriesBySecurity(security: string): Promise<ManualOptionsAnalysis[]> {
    const query = `
      SELECT * FROM overlord.manual_options_analysis 
      WHERE security = $1
      ORDER BY option_date DESC
    `;
    const result = await pool.query(query, [security]);
    return result.rows;
  }

  async getEntryById(id: number): Promise<ManualOptionsAnalysis | null> {
    const query = `
      SELECT * FROM overlord.manual_options_analysis 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async createEntry(entry: Omit<ManualOptionsAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<ManualOptionsAnalysis> {
    const query = `
      INSERT INTO overlord.manual_options_analysis (
        security, market_price, lots, option_date, strike_price, premium_per_contract, notes,
        next_earnings_date, company_name, ex_dividend_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      entry.security,
      entry.market_price,
      entry.lots,
      entry.option_date,
      entry.strike_price,
      entry.premium_per_contract,
      entry.notes,
      entry.next_earnings_date,
      entry.company_name,
      entry.ex_dividend_date
    ]);
    
    return result.rows[0];
  }

  async updateEntry(id: number, entry: Partial<ManualOptionsAnalysis>): Promise<ManualOptionsAnalysis | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (entry.security !== undefined) {
      fields.push(`security = $${paramCount++}`);
      values.push(entry.security);
    }
    if (entry.market_price !== undefined) {
      fields.push(`market_price = $${paramCount++}`);
      values.push(entry.market_price);
    }
    if (entry.lots !== undefined) {
      fields.push(`lots = $${paramCount++}`);
      values.push(entry.lots);
    }
    if (entry.option_date !== undefined) {
      fields.push(`option_date = $${paramCount++}`);
      values.push(entry.option_date);
    }
    if (entry.strike_price !== undefined) {
      fields.push(`strike_price = $${paramCount++}`);
      values.push(entry.strike_price);
    }
    if (entry.premium_per_contract !== undefined) {
      fields.push(`premium_per_contract = $${paramCount++}`);
      values.push(entry.premium_per_contract);
    }
    if (entry.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(entry.notes);
    }
    if (entry.next_earnings_date !== undefined) {
      fields.push(`next_earnings_date = $${paramCount++}`);
      values.push(entry.next_earnings_date);
    }
    if (entry.company_name !== undefined) {
      fields.push(`company_name = $${paramCount++}`);
      values.push(entry.company_name);
    }
    if (entry.ex_dividend_date !== undefined) {
      fields.push(`ex_dividend_date = $${paramCount++}`);
      values.push(entry.ex_dividend_date);
    }

    if (fields.length === 0) {
      return this.getEntryById(id);
    }

    values.push(id);
    const query = `
      UPDATE overlord.manual_options_analysis 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async deleteEntry(id: number): Promise<boolean> {
    const query = `
      DELETE FROM overlord.manual_options_analysis 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteEntriesBySecurity(security: string): Promise<number> {
    const query = `
      DELETE FROM overlord.manual_options_analysis 
      WHERE security = $1
    `;
    const result = await pool.query(query, [security]);
    return result.rowCount ?? 0;
  }
}
