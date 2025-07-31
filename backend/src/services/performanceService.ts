import pool from '../database';
import { MonthlyPerformance } from '../types';

export class PerformanceService {
  async getMonthlyPerformance(): Promise<MonthlyPerformance[]> {
    // First, update the monthly performance table
    await this.updateMonthlyPerformance();
    
    const query = `
      SELECT * FROM monthly_performance 
      ORDER BY year DESC, month DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getMonthlyPerformanceByYear(year: number): Promise<MonthlyPerformance[]> {
    await this.updateMonthlyPerformance();
    
    const query = `
      SELECT * FROM monthly_performance 
      WHERE year = $1
      ORDER BY month ASC
    `;
    const result = await pool.query(query, [year]);
    return result.rows;
  }

  private async updateMonthlyPerformance(): Promise<void> {
    const query = `
      INSERT INTO monthly_performance (year, month, total_premium_collected, total_premium_paid, net_premium, realized_gains)
      SELECT 
        EXTRACT(YEAR FROM t.transaction_date) as year,
        EXTRACT(MONTH FROM t.transaction_date) as month,
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'OPTN' AND t.transaction_type = 'Sold Short' 
          THEN t.amount 
          ELSE 0 
        END), 0) as total_premium_collected,
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'OPTN' AND t.transaction_type = 'Bought To Cover' 
          THEN ABS(t.amount) 
          ELSE 0 
        END), 0) as total_premium_paid,
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'OPTN' 
          THEN CASE 
            WHEN t.transaction_type = 'Sold Short' THEN t.amount
            WHEN t.transaction_type = 'Bought To Cover' THEN -ABS(t.amount)
            ELSE 0
          END
          ELSE 0 
        END), 0) as net_premium,
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'EQ' AND t.transaction_type = 'Sold' 
          THEN t.amount - t.commission
          WHEN t.security_type = 'EQ' AND t.transaction_type = 'Bought'
          THEN -(t.amount + t.commission)
          ELSE 0 
        END), 0) as realized_gains
      FROM transactions t
      GROUP BY EXTRACT(YEAR FROM t.transaction_date), EXTRACT(MONTH FROM t.transaction_date)
      ON CONFLICT (year, month) 
      DO UPDATE SET
        total_premium_collected = EXCLUDED.total_premium_collected,
        total_premium_paid = EXCLUDED.total_premium_paid,
        net_premium = EXCLUDED.net_premium,
        realized_gains = EXCLUDED.realized_gains,
        total_roi = CASE 
          WHEN EXCLUDED.realized_gains + EXCLUDED.net_premium != 0 
          THEN ((EXCLUDED.realized_gains + EXCLUDED.net_premium) / NULLIF(ABS(EXCLUDED.realized_gains), 0)) * 100 
          ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(query);
  }

  async getTotalPerformance(): Promise<{
    totalPremiumCollected: number;
    totalPremiumPaid: number;
    netPremium: number;
    totalRealizedGains: number;
    totalROI: number;
  }> {
    const query = `
      SELECT 
        COALESCE(SUM(total_premium_collected), 0) as total_premium_collected,
        COALESCE(SUM(total_premium_paid), 0) as total_premium_paid,
        COALESCE(SUM(net_premium), 0) as net_premium,
        COALESCE(SUM(realized_gains), 0) as total_realized_gains,
        CASE 
          WHEN SUM(ABS(realized_gains)) > 0 
          THEN (SUM(realized_gains + net_premium) / SUM(ABS(realized_gains))) * 100 
          ELSE 0 
        END as total_roi
      FROM monthly_performance
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }

  async getPremiumByMonth(): Promise<{ month: string; premium: number }[]> {
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') as month,
        SUM(CASE 
          WHEN security_type = 'OPTN' AND transaction_type = 'Sold Short' 
          THEN amount 
          ELSE 0 
        END) as premium
      FROM transactions
      WHERE security_type = 'OPTN' AND transaction_type = 'Sold Short'
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY month DESC
      LIMIT 12
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}
