import pool from '../database';

// Helper functions to clamp values to database-safe ranges
function clampImpliedVolatility(iv: number): number | null {
  if (typeof iv !== 'number' || isNaN(iv) || iv < 0) {
    console.log(`clampImpliedVolatility: Invalid IV value: ${iv} (type: ${typeof iv})`);
    return null;
  }
  
  // E*TRADE already provides IV as percentage, so don't multiply by 100
  // Just clamp to database safe range: 0.1% to 99.99% (to fit DECIMAL(8,6))
  const clamped = Math.max(0.1, Math.min(99.99, iv));
  console.log(`clampImpliedVolatility: ${iv}% → ${clamped}%`);
  return clamped;
}

function clampDelta(delta: number): number | null {
  if (typeof delta !== 'number' || isNaN(delta)) {
    console.log(`clampDelta: Invalid delta value: ${delta} (type: ${typeof delta})`);
    return null;
  }
  // Clamp to valid option delta range: -1 to +1
  const clamped = Math.max(-1, Math.min(1, delta));
  console.log(`clampDelta: ${delta} → ${clamped}`);
  return clamped;
}

export interface ManualOptionsAnalysis {
  id?: number;
  security: string;
  market_price?: number | null;
  lots?: number | null;
  option_date?: string | null;
  strike_price?: number | null;
  premium_per_contract?: number | null;
  implied_volatility?: number | null;
  delta?: number | null;
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
        security, market_price, lots, option_date, strike_price, premium_per_contract, implied_volatility, delta, notes,
        next_earnings_date, company_name, ex_dividend_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      entry.security,
      entry.market_price,
      entry.lots,
      entry.option_date,
      entry.strike_price,
      entry.premium_per_contract,
      entry.implied_volatility !== null && entry.implied_volatility !== undefined ? clampImpliedVolatility(entry.implied_volatility) : null,
      entry.delta !== null && entry.delta !== undefined ? clampDelta(entry.delta) : null,
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
    if (entry.implied_volatility !== undefined) {
      fields.push(`implied_volatility = $${paramCount++}`);
      values.push(entry.implied_volatility !== null ? clampImpliedVolatility(entry.implied_volatility) : null);
    }
    if (entry.delta !== undefined) {
      fields.push(`delta = $${paramCount++}`);
      values.push(entry.delta !== null ? clampDelta(entry.delta) : null);
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
