import pool from '../database';

export interface ReturnOnCapitalData {
  symbol: string;
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  returnOnCapital: number;
  transactionCount: number;
  firstTransactionDate: Date;
  lastTransactionDate: Date;
}

export interface MonthlyReturnOnCapitalData {
  month: string;
  year: number;
  monthNumber: number;
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  returnOnCapital: number;
  activeSymbols: number;
}

export interface AggregatedReturnOnCapitalData {
  totalPremiumCollected: number;
  totalCapitalInvested: number;
  overallReturnOnCapital: number;
  numberOfPositions: number;
  timeRangeStart: Date;
  timeRangeEnd: Date;
}

export class ReturnOnCapitalService {
  /**
   * Calculate Return on Capital for all symbols over the last 12 months
   */
  async getReturnOnCapitalBySymbol(): Promise<ReturnOnCapitalData[]> {
    const query = `
      WITH date_range AS (
        SELECT 
          CURRENT_DATE - INTERVAL '12 months' as start_date,
          CURRENT_DATE as end_date
      ),
      symbol_calculations AS (
        SELECT 
          t.calculated_symbol as symbol,
          -- Net premium collected (option sales minus option purchases)
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%sold%' OR t.transaction_type = 'Sold Short')
            THEN ABS(t.amount)
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%bought%' OR t.transaction_type = 'Bought To Cover')
            THEN -ABS(t.amount)
            ELSE 0 
          END), 0) as total_premium_collected,
          
          -- Total capital invested (stock purchases)
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'EQ' 
              AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
            THEN ABS(t.amount)
            ELSE 0 
          END), 0) as total_capital_invested,
          
          COUNT(*) as transaction_count,
          MIN(t.transaction_date) as first_transaction_date,
          MAX(t.transaction_date) as last_transaction_date
          
        FROM overlord.transactions t
        CROSS JOIN date_range dr
        WHERE t.transaction_date >= dr.start_date
          AND t.transaction_date <= dr.end_date
          AND t.calculated_symbol IS NOT NULL
          AND t.calculated_symbol != ''
          AND t.calculated_symbol NOT ILIKE '%transfer%'
          AND t.calculated_symbol NOT ILIKE '%deposit%'
          AND t.calculated_symbol NOT ILIKE '%withdrawal%'
        GROUP BY t.calculated_symbol
      )
      SELECT 
        symbol,
        total_premium_collected as "totalPremiumCollected",
        total_capital_invested as "totalCapitalInvested",
        CASE 
          WHEN total_capital_invested > 0 
          THEN (total_premium_collected / total_capital_invested) * 100
          ELSE 0
        END as "returnOnCapital",
        transaction_count as "transactionCount",
        first_transaction_date as "firstTransactionDate",
        last_transaction_date as "lastTransactionDate"
      FROM symbol_calculations
      WHERE total_capital_invested > 0 OR total_premium_collected > 0
      ORDER BY "returnOnCapital" DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Calculate Monthly Return on Capital breakdown for the last 12 months
   */
  async getMonthlyReturnOnCapital(): Promise<MonthlyReturnOnCapitalData[]> {
    const query = `
      WITH date_range AS (
        SELECT 
          CURRENT_DATE - INTERVAL '12 months' as start_date,
          CURRENT_DATE as end_date
      ),
      monthly_calculations AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'Mon') as month,
          EXTRACT(YEAR FROM DATE_TRUNC('month', t.transaction_date)) as year,
          EXTRACT(MONTH FROM DATE_TRUNC('month', t.transaction_date)) as month_number,
          DATE_TRUNC('month', t.transaction_date) as month_date,
          
          -- Net premium collected per month (option sales minus option purchases)
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%sold%' OR t.transaction_type = 'Sold Short')
            THEN ABS(t.amount)
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%bought%' OR t.transaction_type = 'Bought To Cover')
            THEN -ABS(t.amount)
            ELSE 0 
          END), 0) as total_premium_collected,
          
          -- Total capital invested per month
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'EQ' 
              AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
            THEN ABS(t.amount)
            ELSE 0 
          END), 0) as total_capital_invested,
          
          COUNT(DISTINCT t.calculated_symbol) as active_symbols
          
        FROM overlord.transactions t
        CROSS JOIN date_range dr
        WHERE t.transaction_date >= dr.start_date
          AND t.transaction_date <= dr.end_date
          AND t.calculated_symbol IS NOT NULL
          AND t.calculated_symbol != ''
          AND t.calculated_symbol NOT ILIKE '%transfer%'
          AND t.calculated_symbol NOT ILIKE '%deposit%'
          AND t.calculated_symbol NOT ILIKE '%withdrawal%'
        GROUP BY 
          DATE_TRUNC('month', t.transaction_date)
      )
      SELECT 
        month,
        year::integer,
        month_number::integer as "monthNumber",
        total_premium_collected as "totalPremiumCollected",
        total_capital_invested as "totalCapitalInvested",
        CASE 
          WHEN total_capital_invested > 0 
          THEN (total_premium_collected / total_capital_invested) * 100
          ELSE 0
        END as "returnOnCapital",
        active_symbols as "activeSymbols"
      FROM monthly_calculations
      WHERE total_capital_invested > 0 OR total_premium_collected > 0
      ORDER BY year ASC, "monthNumber" ASC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Calculate aggregated Return on Capital for the entire portfolio over the last 12 months
   */
  async getAggregatedReturnOnCapital(): Promise<AggregatedReturnOnCapitalData> {
    const query = `
      WITH date_range AS (
        SELECT 
          CURRENT_DATE - INTERVAL '12 months' as start_date,
          CURRENT_DATE as end_date
      ),
      portfolio_calculations AS (
        SELECT 
          -- Net premium collected across all positions (option sales minus option purchases)
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%sold%' OR t.transaction_type = 'Sold Short')
            THEN ABS(t.amount)
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%bought%' OR t.transaction_type = 'Bought To Cover')
            THEN -ABS(t.amount)
            ELSE 0 
          END), 0) as total_premium_collected,
          
          -- Total capital invested across all positions
          COALESCE(SUM(CASE 
            WHEN t.security_type = 'EQ' 
              AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
            THEN ABS(t.amount)
            ELSE 0 
          END), 0) as total_capital_invested,
          
          COUNT(DISTINCT t.calculated_symbol) as number_of_positions,
          MIN(t.transaction_date) as time_range_start,
          MAX(t.transaction_date) as time_range_end
          
        FROM overlord.transactions t
        CROSS JOIN date_range dr
        WHERE t.transaction_date >= dr.start_date
          AND t.transaction_date <= dr.end_date
          AND t.calculated_symbol IS NOT NULL
          AND t.calculated_symbol != ''
          AND t.calculated_symbol NOT ILIKE '%transfer%'
          AND t.calculated_symbol NOT ILIKE '%deposit%'
          AND t.calculated_symbol NOT ILIKE '%withdrawal%'
      )
      SELECT 
        total_premium_collected as "totalPremiumCollected",
        total_capital_invested as "totalCapitalInvested",
        CASE 
          WHEN total_capital_invested > 0 
          THEN (total_premium_collected / total_capital_invested) * 100
          ELSE 0
        END as "overallReturnOnCapital",
        number_of_positions as "numberOfPositions",
        time_range_start as "timeRangeStart",
        time_range_end as "timeRangeEnd"
      FROM portfolio_calculations;
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get Return on Capital data formatted for pie chart visualization
   */
  async getReturnOnCapitalPieChartData(): Promise<Array<{
    label: string;
    value: number;
    premium: number;
    capital: number;
  }>> {
    const symbolData = await this.getReturnOnCapitalBySymbol();
    
    // Filter out symbols with very low RoC or capital to avoid chart clutter  
    const significantPositions = symbolData
      .filter(item => item.returnOnCapital > 0); // Show all positions with positive RoC

    return significantPositions.map(item => ({
      label: item.symbol,
      value: item.returnOnCapital,
      premium: item.totalPremiumCollected,
      capital: item.totalCapitalInvested
    }));
  }

  /**
   * Get Return on Capital data formatted for bar chart visualization
   */
  async getReturnOnCapitalBarChartData(): Promise<Array<{
    period: string;
    returnOnCapital: number;
    premiumCollected: number;
    capitalInvested: number;
    activeSymbols: number;
  }>> {
    const monthlyData = await this.getMonthlyReturnOnCapital();
    
    return monthlyData.map(item => ({
      period: `${item.month} ${item.year}`,
      returnOnCapital: item.returnOnCapital,
      premiumCollected: item.totalPremiumCollected,
      capitalInvested: item.totalCapitalInvested,
      activeSymbols: item.activeSymbols
    }));
  }

  /**
   * Get top performing symbols by Return on Capital
   */
  async getTopPerformingSymbolsByRoC(limit: number = 10): Promise<ReturnOnCapitalData[]> {
    const allSymbols = await this.getReturnOnCapitalBySymbol();
    
    return allSymbols
      .filter(item => item.totalCapitalInvested >= 500 && item.returnOnCapital > 0)
      .slice(0, limit);
  }

  /**
   * Calculate Return on Capital for a specific symbol over the last 12 months
   */
  async getReturnOnCapitalBySymbolName(symbol: string): Promise<ReturnOnCapitalData | null> {
    const query = `
      WITH date_range AS (
        SELECT 
          CURRENT_DATE - INTERVAL '12 months' as start_date,
          CURRENT_DATE as end_date
      )
      SELECT 
        t.calculated_symbol as symbol,
        -- Net premium collected (option sales minus option purchases)
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'OPTN' 
            AND (t.transaction_type ILIKE '%sold%' OR t.transaction_type = 'Sold Short')
          THEN ABS(t.amount)
          WHEN t.security_type = 'OPTN' 
            AND (t.transaction_type ILIKE '%bought%' OR t.transaction_type = 'Bought To Cover')
          THEN -ABS(t.amount)
          ELSE 0 
        END), 0) as "totalPremiumCollected",
        
        -- Total capital invested (stock purchases)
        COALESCE(SUM(CASE 
          WHEN t.security_type = 'EQ' 
            AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
          THEN ABS(t.amount)
          ELSE 0 
        END), 0) as "totalCapitalInvested",
        
        CASE 
          WHEN SUM(CASE 
            WHEN t.security_type = 'EQ' 
              AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
            THEN ABS(t.amount)
            ELSE 0 
          END) > 0 
          THEN (SUM(CASE 
            WHEN t.security_type = 'OPTN' 
              AND (t.transaction_type ILIKE '%sold%' OR t.transaction_type = 'Sold Short')
            THEN ABS(t.amount)
            ELSE 0 
          END) / SUM(CASE 
            WHEN t.security_type = 'EQ' 
              AND (t.transaction_type = 'Bought' OR t.transaction_type ILIKE '%buy%')
            THEN ABS(t.amount)
            ELSE 0 
          END)) * 100
          ELSE 0
        END as "returnOnCapital",
        
        COUNT(*) as "transactionCount",
        MIN(t.transaction_date) as "firstTransactionDate",
        MAX(t.transaction_date) as "lastTransactionDate"
        
      FROM overlord.transactions t
      CROSS JOIN date_range dr
      WHERE t.transaction_date >= dr.start_date
        AND t.transaction_date <= dr.end_date
        AND t.calculated_symbol = $1
      GROUP BY t.calculated_symbol
    `;

    const result = await pool.query(query, [symbol]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

export const returnOnCapitalService = new ReturnOnCapitalService();