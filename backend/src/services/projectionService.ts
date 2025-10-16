import { Pool, PoolClient } from 'pg';

type PeriodType = 'MONTH' | 'YEAR';

export interface ProjectionSummary {
  id: number;
  name: string;
  description: string | null;
  assumed_roc_percent: number;
  projection_start_date: string;
  starting_capital: number;
  monthly_infusion: number;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectionPeriod {
  id: number;
  projection_id: number;
  period_type: PeriodType;
  period_index: number;
  period_start: string | null;
  period_end: string | null;
  expected_balance: number | null;
  actual_balance: number | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectionDetail extends ProjectionSummary {
  periods: {
    monthly: ProjectionPeriod[];
    yearly: ProjectionPeriod[];
  };
}

interface ProjectionInput {
  name: string;
  description?: string | null;
  assumed_roc_percent: number;
  projection_start_date: string;
  starting_capital: number;
  monthly_infusion: number;
}

interface ProjectionPeriodUpdate {
  expected_balance?: number | null;
  actual_balance?: number | null;
  is_manual?: boolean;
}

export class ProjectionService {
  constructor(private readonly pool: Pool) {}

  async getProjections(): Promise<ProjectionSummary[]> {
    const result = await this.pool.query('SELECT * FROM overlord.projection ORDER BY name DESC');
    return result.rows.map((row) => this.mapProjectionSummary(row));
  }

  async getProjectionById(id: number): Promise<ProjectionDetail | null> {
    const projectionResult = await this.pool.query('SELECT * FROM overlord.projection WHERE id = $1', [id]);
    if (projectionResult.rowCount === 0) {
      return null;
    }

    const projection = this.mapProjectionSummary(projectionResult.rows[0]);
    const periods = await this.fetchPeriods(this.pool, id);

    return {
      ...projection,
      periods,
    };
  }

  async createProjection(data: ProjectionInput): Promise<ProjectionDetail> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO overlord.projection (name, description, assumed_roc_percent, projection_start_date, starting_capital, monthly_infusion)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.name,
          data.description ?? null,
          data.assumed_roc_percent,
          data.projection_start_date,
          data.starting_capital,
          data.monthly_infusion,
        ]
      );

      const projectionRow = insertResult.rows[0];
      const projectionId = projectionRow.id as number;
      const startDate = toUTCDate(data.projection_start_date);

      await this.ensurePeriods(client, projectionId, startDate, true);

      await client.query('COMMIT');

      const projection = this.mapProjectionSummary(projectionRow);
      const periods = await this.fetchPeriods(this.pool, projectionId);

      return {
        ...projection,
        periods,
      };
    } catch (error) {
      await safeRollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProjection(id: number, data: Partial<ProjectionInput>): Promise<ProjectionDetail | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM overlord.projection WHERE id = $1', [id]);
      if (existing.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const current = existing.rows[0];
      const nextName = data.name !== undefined ? data.name : current.name;
      const nextDescription = data.description !== undefined ? data.description : current.description;
      const nextRoc = data.assumed_roc_percent !== undefined ? data.assumed_roc_percent : current.assumed_roc_percent;
      const nextStartDateRaw = data.projection_start_date !== undefined ? data.projection_start_date : current.projection_start_date;
      const currentStartDateStr = mapDate(current.projection_start_date) ?? String(current.projection_start_date);
      const nextStartDateStr = mapDate(nextStartDateRaw) ?? String(nextStartDateRaw);
      const startDateChanged = data.projection_start_date !== undefined && nextStartDateStr !== currentStartDateStr;
      const nextStartingCapital = data.starting_capital !== undefined ? data.starting_capital : current.starting_capital;
      const nextMonthlyInfusion = data.monthly_infusion !== undefined ? data.monthly_infusion : current.monthly_infusion;

      const updateResult = await client.query(
        `UPDATE overlord.projection
         SET name = $1,
             description = $2,
             assumed_roc_percent = $3,
             projection_start_date = $4,
             starting_capital = $5,
             monthly_infusion = $6
         WHERE id = $7
         RETURNING *`,
        [
          nextName,
          nextDescription,
          nextRoc,
          nextStartDateStr,
          nextStartingCapital,
          nextMonthlyInfusion,
          id,
        ]
      );

      const updatedRow = updateResult.rows[0];
      const startDateForEnsure = toUTCDate(nextStartDateStr);
      await this.ensurePeriods(client, id, startDateForEnsure, startDateChanged);

      await client.query('COMMIT');

      const projection = this.mapProjectionSummary(updatedRow);
      const periods = await this.fetchPeriods(this.pool, id);

      return {
        ...projection,
        periods,
      };
    } catch (error) {
      await safeRollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProjection(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM overlord.projection WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateProjectionPeriod(
    projectionId: number,
    periodId: number,
    updates: ProjectionPeriodUpdate
  ): Promise<ProjectionPeriod | null> {
    const existing = await this.pool.query(
      'SELECT * FROM overlord.projection_period WHERE id = $1 AND projection_id = $2',
      [periodId, projectionId]
    );

    if (existing.rowCount === 0) {
      return null;
    }

    const current = existing.rows[0];
    const nextExpected = updates.expected_balance !== undefined ? updates.expected_balance : current.expected_balance;
    const nextActual = updates.actual_balance !== undefined ? updates.actual_balance : current.actual_balance;

    let nextIsManual: boolean;
    if (updates.is_manual !== undefined) {
      nextIsManual = updates.is_manual;
    } else if (updates.expected_balance !== undefined) {
      nextIsManual = true;
    } else {
      nextIsManual = current.is_manual;
    }

    const result = await this.pool.query(
      `UPDATE overlord.projection_period
       SET expected_balance = $1,
           actual_balance = $2,
           is_manual = $3
       WHERE id = $4 AND projection_id = $5
       RETURNING *`,
      [nextExpected, nextActual, nextIsManual, periodId, projectionId]
    );

    return this.mapProjectionPeriod(result.rows[0]);
  }

  async calculateProjection(id: number): Promise<ProjectionDetail | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const projectionResult = await client.query('SELECT * FROM overlord.projection WHERE id = $1', [id]);
      if (projectionResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const projectionRow = projectionResult.rows[0];
      const projection = this.mapProjectionSummary(projectionRow);

      const monthlyRate = toMonthlyRate(projection.assumed_roc_percent);
      const balances = computeBalances(
        projection.starting_capital,
        projection.monthly_infusion,
        monthlyRate,
        60
      );

      const monthlyPeriods = await client.query(
        `SELECT id, period_index, is_manual FROM overlord.projection_period
         WHERE projection_id = $1 AND period_type = 'MONTH'
         ORDER BY period_index`,
        [id]
      );

      for (const period of monthlyPeriods.rows) {
        const index = period.period_index - 1;
        const value = index >= 0 && index < balances.length ? balances[index] : null;
        if (!period.is_manual) {
          await client.query(
            `UPDATE overlord.projection_period SET expected_balance = $1 WHERE id = $2`,
            [value, period.id]
          );
        }
      }

      const yearlyPeriods = await client.query(
        `SELECT id, period_index, is_manual FROM overlord.projection_period
         WHERE projection_id = $1 AND period_type = 'YEAR'
         ORDER BY period_index`,
        [id]
      );

      for (const period of yearlyPeriods.rows) {
        const monthsIndex = period.period_index * 12 - 1;
        const value = monthsIndex >= 0 && monthsIndex < balances.length ? balances[monthsIndex] : null;
        if (!period.is_manual) {
          await client.query(
            `UPDATE overlord.projection_period SET expected_balance = $1 WHERE id = $2`,
            [value, period.id]
          );
        }
      }

      await client.query(
        `UPDATE overlord.projection
         SET last_calculated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      const periods = await this.fetchPeriods(this.pool, id);
      return {
        ...projection,
        periods,
      };
    } catch (error) {
      await safeRollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensurePeriods(
    client: PoolClient,
    projectionId: number,
    startDate: Date,
    forceRegenerate = false
  ): Promise<void> {
    if (forceRegenerate) {
      await client.query('DELETE FROM overlord.projection_period WHERE projection_id = $1', [projectionId]);
    }

    const monthPeriods = buildMonthlyPeriods(startDate, 12);
    for (let i = 0; i < monthPeriods.length; i++) {
      const period = monthPeriods[i];
      await client.query(
        `INSERT INTO overlord.projection_period (
           projection_id, period_type, period_index, period_start, period_end
         ) VALUES ($1, 'MONTH', $2, $3, $4)
         ON CONFLICT (projection_id, period_type, period_index) DO NOTHING`,
        [projectionId, i + 1, period.start, period.end]
      );
    }

    const yearPeriods = buildYearlyPeriods(startDate, 5);
    for (let i = 0; i < yearPeriods.length; i++) {
      const period = yearPeriods[i];
      await client.query(
        `INSERT INTO overlord.projection_period (
           projection_id, period_type, period_index, period_start, period_end
         ) VALUES ($1, 'YEAR', $2, $3, $4)
         ON CONFLICT (projection_id, period_type, period_index) DO NOTHING`,
        [projectionId, i + 1, period.start, period.end]
      );
    }
  }

  private async fetchPeriods(client: Pool | PoolClient, projectionId: number): Promise<{
    monthly: ProjectionPeriod[];
    yearly: ProjectionPeriod[];
  }> {
    const result = await client.query(
      `SELECT * FROM overlord.projection_period WHERE projection_id = $1 ORDER BY period_type, period_index`,
      [projectionId]
    );
    const periods = result.rows.map((row) => this.mapProjectionPeriod(row));
    return {
      monthly: periods.filter((period) => period.period_type === 'MONTH'),
      yearly: periods.filter((period) => period.period_type === 'YEAR'),
    };
  }

  private mapProjectionSummary(row: any): ProjectionSummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      assumed_roc_percent: parseNumber(row.assumed_roc_percent) ?? 0,
      projection_start_date: mapDate(row.projection_start_date)!,
      starting_capital: parseNumber(row.starting_capital) ?? 0,
      monthly_infusion: parseNumber(row.monthly_infusion) ?? 0,
      last_calculated_at: mapDateTime(row.last_calculated_at),
      created_at: mapDateTime(row.created_at)!,
      updated_at: mapDateTime(row.updated_at)!,
    };
  }

  private mapProjectionPeriod(row: any): ProjectionPeriod {
    return {
      id: row.id,
      projection_id: row.projection_id,
      period_type: row.period_type,
      period_index: row.period_index,
      period_start: mapDate(row.period_start),
      period_end: mapDate(row.period_end),
      expected_balance: parseNumber(row.expected_balance),
      actual_balance: parseNumber(row.actual_balance),
      is_manual: row.is_manual,
      created_at: mapDateTime(row.created_at)!,
      updated_at: mapDateTime(row.updated_at)!,
    };
  }
}

function toUTCDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

function mapDate(value: any): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function mapDateTime(value: any): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function safeRollback(client: PoolClient | null): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.query('ROLLBACK');
  } catch (_error) {
    // ignore rollback errors
  }
}

function buildMonthlyPeriods(startDate: Date, count: number): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    periods.push({ start, end });
  }
  return periods;
}

function buildYearlyPeriods(startDate: Date, count: number): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(Date.UTC(startDate.getUTCFullYear() + i, startDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 0));
    periods.push({ start, end });
  }
  return periods;
}

function toMonthlyRate(rocPercent: number): number {
  const annualRate = rocPercent / 100;
  if (annualRate <= -1) {
    return -1;
  }
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function computeBalances(
  startingCapital: number,
  monthlyInfusion: number,
  monthlyRate: number,
  months: number
): number[] {
  const balances: number[] = [];
  let balance = startingCapital;

  for (let i = 0; i < months; i++) {
    balance += monthlyInfusion;
    balance *= 1 + monthlyRate;
    balances.push(Number(balance.toFixed(2)));
  }

  return balances;
}
