import { Pool } from 'pg';

export interface MarginMaster {
  id: number;
  current_outstanding_margin: number;
  current_margin_rate: number;
  last_updated: string;
  notes?: string;
}

export interface MarginPlanningOption {
  id: number;
  symbol: string;
  strike_date: string;
  strike_price: number;
  total_contracts: number;
  rollable: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarginPlan {
  id: number;
  week_ending: string;
  proposed_margin?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarginPlanningGridRow {
  week_ending: string;
  likely_assignments: number;
  symbols_not_rollable: string;
  proposed_margin?: number;
  margin_cost_weekly?: number;
  margin_impact: number;
  notes?: string;
  plan_id?: number;
}

export class MarginOpportunityPlannerService {
  constructor(private pool: Pool) {}

  // Margin Master CRUD
  async getMarginMaster(): Promise<MarginMaster> {
    const result = await this.pool.query(
      'SELECT * FROM overlord.margin_master ORDER BY last_updated DESC LIMIT 1'
    );
    return result.rows[0];
  }

  async updateMarginMaster(data: {
    current_outstanding_margin: number;
    current_margin_rate: number;
    notes?: string;
  }): Promise<MarginMaster> {
    const result = await this.pool.query(
      `UPDATE overlord.margin_master 
       SET current_outstanding_margin = $1, current_margin_rate = $2, notes = $3, last_updated = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM overlord.margin_master ORDER BY last_updated DESC LIMIT 1)
       RETURNING *`,
      [data.current_outstanding_margin, data.current_margin_rate, data.notes]
    );
    return result.rows[0];
  }

  // Margin Planning Options CRUD
  async getMarginPlanningOptions(): Promise<MarginPlanningOption[]> {
    const result = await this.pool.query(
      'SELECT * FROM overlord.margin_planning_options ORDER BY strike_date, symbol'
    );
    return result.rows;
  }

  async createMarginPlanningOption(data: {
    symbol: string;
    strike_date: string;
    strike_price: number;
    total_contracts: number;
    rollable: boolean;
  }): Promise<MarginPlanningOption> {
    const result = await this.pool.query(
      `INSERT INTO overlord.margin_planning_options 
       (symbol, strike_date, strike_price, total_contracts, rollable)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.symbol, data.strike_date, data.strike_price, data.total_contracts, data.rollable]
    );
    return result.rows[0];
  }

  async updateMarginPlanningOption(id: number, data: {
    symbol: string;
    strike_date: string;
    strike_price: number;
    total_contracts: number;
    rollable: boolean;
  }): Promise<MarginPlanningOption> {
    const result = await this.pool.query(
      `UPDATE overlord.margin_planning_options 
       SET symbol = $1, strike_date = $2, strike_price = $3, total_contracts = $4, rollable = $5
       WHERE id = $6 RETURNING *`,
      [data.symbol, data.strike_date, data.strike_price, data.total_contracts, data.rollable, id]
    );
    return result.rows[0];
  }

  async deleteMarginPlanningOption(id: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM overlord.margin_planning_options WHERE id = $1',
      [id]
    );
  }

  // Margin Plan CRUD
  async getMarginPlans(): Promise<MarginPlan[]> {
    const result = await this.pool.query(
      'SELECT * FROM overlord.margin_plan ORDER BY week_ending'
    );
    return result.rows;
  }

  async upsertMarginPlan(data: {
    week_ending: string;
    proposed_margin?: number;
    notes?: string;
  }): Promise<MarginPlan> {
    const result = await this.pool.query(
      `INSERT INTO overlord.margin_plan (week_ending, proposed_margin, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (week_ending) 
       DO UPDATE SET proposed_margin = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.week_ending, data.proposed_margin, data.notes]
    );
    return result.rows[0];
  }

  async deleteMarginPlan(id: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM overlord.margin_plan WHERE id = $1',
      [id]
    );
  }

  async deleteMarginPlanByWeekEnding(weekEnding: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM overlord.margin_plan WHERE week_ending = $1',
      [weekEnding]
    );
  }

  // Planning Grid View
  async getPlanningGrid(): Promise<MarginPlanningGridRow[]> {
    const result = await this.pool.query(`
      SELECT 
        week_ending,
        likely_assignments,
        symbols_not_rollable,
        proposed_margin,
        margin_cost_weekly,
        margin_impact,
        notes,
        plan_id
      FROM overlord.margin_planning_grid
      ORDER BY week_ending
    `);
    return result.rows;
  }

  // Get weeks with option expirations
  async getWeeksWithExpirations(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT DISTINCT DATE_TRUNC('week', strike_date)::date + INTERVAL '6 days' as week_ending
      FROM overlord.margin_planning_options 
      WHERE rollable = false
      ORDER BY week_ending
    `);
    return result.rows.map(row => row.week_ending);
  }

  // Ensure margin plan records exist for all weeks with expirations
  async ensureMarginPlanRecords(): Promise<void> {
    const weeks = await this.getWeeksWithExpirations();
    
    for (const week of weeks) {
      await this.pool.query(`
        INSERT INTO overlord.margin_plan (week_ending)
        VALUES ($1)
        ON CONFLICT (week_ending) DO NOTHING
      `, [week]);
    }
  }
}
