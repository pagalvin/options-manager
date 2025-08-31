import pool from '../database';

export interface PremiumCashFlowEntry {
  date: string;
  symbol: string;
  netCredit: number;
  rollType: 'roll_forward' | 'roll_up' | 'roll_down' | 'roll_out';
  buyTransaction: any;
  sellTransaction: any;
}

export interface PremiumCashFlowSummary {
  week: string;
  month: string;
  year: number;
  totalNetCredit: number;
  transactionCount: number;
  symbols: string[];
}

export class PremiumCashFlowService {
  
  /**
   * Get all option roll transactions (paired buy/sell that are not initial positions)
   */
  async getOptionRolls(): Promise<PremiumCashFlowEntry[]> {
    const query = `
      WITH option_transactions AS (
        SELECT 
          t.*,
          -- Extract strike price and expiration from description
          CASE 
            WHEN description ~ 'AT\\s+([0-9]+\\.?[0-9]*)\\s+EXPIRES' THEN
              CAST(SUBSTRING(description FROM 'AT\\s+([0-9]+\\.?[0-9]*)\\s+EXPIRES') AS DECIMAL(12,4))
            ELSE 0
          END as extracted_strike,
          CASE 
            WHEN description ~ 'EXPIRES\\s+([0-9]{2}/[0-9]{2}/[0-9]{4})' THEN
              TO_DATE(SUBSTRING(description FROM 'EXPIRES\\s+([0-9]{2}/[0-9]{2}/[0-9]{4})'), 'MM/DD/YYYY')
            ELSE NULL
          END as extracted_expiration
        FROM overlord.transactions t
        WHERE security_type = 'OPTN'
        ORDER BY calculated_symbol, transaction_date, id
      ),
      
      -- Group transactions by symbol and find pairs
      option_pairs AS (
        SELECT 
          buy_tx.transaction_date as roll_date,
          buy_tx.calculated_symbol,
          buy_tx.amount as buy_amount,
          sell_tx.amount as sell_amount,
          (sell_tx.amount + buy_tx.amount) as net_credit,
          buy_tx.extracted_strike as buy_strike,
          sell_tx.extracted_strike as sell_strike,
          buy_tx.extracted_expiration as buy_expiration,
          sell_tx.extracted_expiration as sell_expiration,
          buy_tx.description as buy_description,
          sell_tx.description as sell_description,
          ROW_NUMBER() OVER (PARTITION BY buy_tx.calculated_symbol ORDER BY buy_tx.transaction_date) as pair_sequence
        FROM option_transactions buy_tx
        JOIN option_transactions sell_tx ON (
          buy_tx.calculated_symbol = sell_tx.calculated_symbol
          AND buy_tx.transaction_type = 'Bought'
          AND sell_tx.transaction_type = 'Sold'
          AND buy_tx.transaction_date <= sell_tx.transaction_date
          AND sell_tx.transaction_date <= buy_tx.transaction_date + INTERVAL '7 days'
          AND buy_tx.id < sell_tx.id
        )
        WHERE 
          -- Exclude the very first sell for each symbol (initial covered call)
          NOT EXISTS (
            SELECT 1 FROM option_transactions first_sell
            WHERE first_sell.calculated_symbol = buy_tx.calculated_symbol
            AND first_sell.transaction_type = 'Sold'
            AND first_sell.transaction_date < buy_tx.transaction_date
            AND NOT EXISTS (
              SELECT 1 FROM option_transactions prior_buy
              WHERE prior_buy.calculated_symbol = first_sell.calculated_symbol
              AND prior_buy.transaction_type = 'Bought'
              AND prior_buy.transaction_date <= first_sell.transaction_date
            )
          )
      )
      
      SELECT 
        roll_date as date,
        calculated_symbol as symbol,
        net_credit,
        CASE 
          WHEN sell_expiration > buy_expiration THEN 'roll_forward'
          WHEN sell_strike > buy_strike THEN 'roll_up'
          WHEN sell_strike < buy_strike THEN 'roll_down'
          ELSE 'roll_out'
        END as roll_type,
        json_build_object(
          'amount', buy_amount,
          'strike', buy_strike,
          'expiration', buy_expiration,
          'description', buy_description
        ) as buy_transaction,
        json_build_object(
          'amount', sell_amount,
          'strike', sell_strike,
          'expiration', sell_expiration,
          'description', sell_description
        ) as sell_transaction
      FROM option_pairs
      WHERE net_credit > 0  -- Only profitable rolls
      ORDER BY roll_date DESC, calculated_symbol;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get a simpler version focusing on consecutive buy/sell pairs after initial position
   */
  async getSimpleOptionRolls(): Promise<PremiumCashFlowEntry[]> {
    const query = `
      WITH ordered_options AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY calculated_symbol ORDER BY transaction_date, id) as seq_num,
          LAG(transaction_type) OVER (PARTITION BY calculated_symbol ORDER BY transaction_date, id) as prev_type,
          LEAD(transaction_type) OVER (PARTITION BY calculated_symbol ORDER BY transaction_date, id) as next_type
        FROM overlord.transactions 
        WHERE security_type = 'OPTN'
      ),
      
      roll_pairs AS (
        SELECT 
          buy_tx.transaction_date as date,
          buy_tx.calculated_symbol as symbol,
          buy_tx.amount as buy_amount,
          sell_tx.amount as sell_amount,
          (sell_tx.amount + buy_tx.amount) as net_credit,
          buy_tx.description as buy_description,
          sell_tx.description as sell_description
        FROM ordered_options buy_tx
        JOIN ordered_options sell_tx ON (
          buy_tx.calculated_symbol = sell_tx.calculated_symbol
          AND buy_tx.seq_num = sell_tx.seq_num - 1
          AND buy_tx.transaction_type = 'Bought'
          AND sell_tx.transaction_type = 'Sold'
        )
        WHERE buy_tx.seq_num > 1  -- Skip the first sell (initial covered call)
      )
      
      SELECT 
        date,
        symbol,
        net_credit,
        'roll_forward' as roll_type,
        json_build_object(
          'amount', buy_amount,
          'description', buy_description
        ) as buy_transaction,
        json_build_object(
          'amount', sell_amount,
          'description', sell_description
        ) as sell_transaction
      FROM roll_pairs
      WHERE net_credit > 0
      ORDER BY date DESC, symbol;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get premium cash flow summary by week and month
   */
  async getPremiumCashFlowSummary(): Promise<PremiumCashFlowSummary[]> {
    const rolls = await this.getSimpleOptionRolls();
    
    const summaryMap = new Map<string, PremiumCashFlowSummary>();
    
    rolls.forEach(roll => {
      const date = new Date(roll.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = this.getWeekNumber(date);
      
      // Monthly summary
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      if (!summaryMap.has(monthKey)) {
        summaryMap.set(monthKey, {
          week: '',
          month: monthKey,
          year,
          totalNetCredit: 0,
          transactionCount: 0,
          symbols: []
        });
      }
      
      const monthSummary = summaryMap.get(monthKey)!;
      monthSummary.totalNetCredit += roll.netCredit;
      monthSummary.transactionCount += 1;
      if (!monthSummary.symbols.includes(roll.symbol)) {
        monthSummary.symbols.push(roll.symbol);
      }
      
      // Weekly summary
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
      if (!summaryMap.has(weekKey)) {
        summaryMap.set(weekKey, {
          week: weekKey,
          month: '',
          year,
          totalNetCredit: 0,
          transactionCount: 0,
          symbols: []
        });
      }
      
      const weekSummary = summaryMap.get(weekKey)!;
      weekSummary.totalNetCredit += roll.netCredit;
      weekSummary.transactionCount += 1;
      if (!weekSummary.symbols.includes(roll.symbol)) {
        weekSummary.symbols.push(roll.symbol);
      }
    });
    
    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.month && b.month) return b.month.localeCompare(a.month);
      if (a.week && b.week) return b.week.localeCompare(a.week);
      return 0;
    });
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
