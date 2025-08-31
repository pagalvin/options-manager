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

export interface PremiumCashFlowSummaryResponse {
  summaries: PremiumCashFlowSummary[];
  totalCredits: number;
  totalTransactions: number;
  uniqueSymbols: string[];
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
          AND buy_tx.transaction_type IN ('Bought', 'Bought To Cover')
          AND sell_tx.transaction_type IN ('Sold', 'Sold Short')
          AND buy_tx.transaction_date <= sell_tx.transaction_date
          AND sell_tx.transaction_date <= buy_tx.transaction_date + INTERVAL '7 days'
          AND buy_tx.id < sell_tx.id
        )
        WHERE 
          -- Exclude the very first sell for each symbol (initial covered call)
          NOT EXISTS (
            SELECT 1 FROM option_transactions first_sell
            WHERE first_sell.calculated_symbol = buy_tx.calculated_symbol
            AND first_sell.transaction_type IN ('Sold', 'Sold Short')
            AND first_sell.transaction_date < buy_tx.transaction_date
            AND NOT EXISTS (
              SELECT 1 FROM option_transactions prior_buy
              WHERE prior_buy.calculated_symbol = first_sell.calculated_symbol
              AND prior_buy.transaction_type IN ('Bought', 'Bought To Cover')
              AND prior_buy.transaction_date <= first_sell.transaction_date
            )
          )
          AND buy_tx.transaction_date >= '2025-03-01'  -- Start from March 1st, 2025
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
    return result.rows.map(row => ({
      ...row,
      netCredit: parseFloat(row.net_credit) || 0,
      buyTransaction: {
        ...row.buy_transaction,
        amount: parseFloat(row.buy_transaction.amount) || 0
      },
      sellTransaction: {
        ...row.sell_transaction,
        amount: parseFloat(row.sell_transaction.amount) || 0
      }
    }));
  }

  /**
   * Get net option premium using state machine logic to properly pair equity purchases with option sales
   * Processes transactions in execution order to find closest pairings
   */
  async getSimpleOptionRolls(): Promise<PremiumCashFlowEntry[]> {
    // Get all transactions grouped by date and symbol, ordered by REVERSE import order
    const transactionQuery = `
      SELECT 
        transaction_date,
        calculated_symbol,
        json_agg(
          json_build_object(
            'id', id,
            'transaction_type', transaction_type,
            'security_type', security_type,
            'amount', amount,
            'description', description,
            'created_at', created_at
          ) ORDER BY created_at DESC, id DESC  -- Reverse import order
        ) as transactions
      FROM overlord.transactions 
      WHERE transaction_date >= '2025-03-01'
      AND (
        (security_type = 'OPTN' AND transaction_type IN ('Sold', 'Sold Short', 'Bought', 'Bought To Cover'))
        OR (security_type = 'EQ' AND transaction_type = 'Bought')
      )
      AND calculated_symbol IS NOT NULL 
      AND calculated_symbol != ''
      AND calculated_symbol NOT ILIKE '%transfer%'
      AND calculated_symbol NOT ILIKE '%cash%'
      AND calculated_symbol NOT ILIKE '%sweep%'
      AND calculated_symbol NOT ILIKE '%deposit%'
      AND calculated_symbol NOT ILIKE '%withdrawal%'
      AND calculated_symbol NOT ILIKE '%fund%'
      AND calculated_symbol ~ '^[A-Z]{2,5}$'
      GROUP BY transaction_date, calculated_symbol
      ORDER BY transaction_date DESC, calculated_symbol;
    `;

    const result = await pool.query(transactionQuery);
    const entries: PremiumCashFlowEntry[] = [];

    for (const row of result.rows) {
      const date = row.transaction_date;
      const symbol = row.calculated_symbol;
      const transactions = row.transactions;

      // State machine variables
      const potentialExclusions: any[] = [];
      const openEquities: any[] = [];
      const excludedOptionIds = new Set<number>();

      // Process transactions in REVERSE order (bottom to top)
      for (const tx of transactions) {
        if (tx.security_type === 'EQ' && tx.transaction_type === 'Bought') {
          // Found equity purchase: exclude the most recent (in this order) sold option
          if (potentialExclusions.length > 0) {
            const potentialOption = potentialExclusions.shift();
            excludedOptionIds.add(potentialOption.id);
          } else {
            openEquities.push(tx);
          }
        } else if (tx.security_type === 'OPTN' && ['Sold', 'Sold Short'].includes(tx.transaction_type)) {
          // Found a sold option
          if (openEquities.length > 0) {
            excludedOptionIds.add(tx.id);
            openEquities.shift();
          } else {
            potentialExclusions.push(tx);
          }
        }
      }

      // Calculate net premium excluding the paired options
      let netPremium = 0;
      const includedTransactions: string[] = [];

      // Process in original import order for reporting
      for (const tx of transactions.slice().reverse()) {
        if (tx.security_type === 'OPTN') {
          if (['Sold', 'Sold Short'].includes(tx.transaction_type) && excludedOptionIds.has(tx.id)) {
            continue;
          } else {
            netPremium += parseFloat(tx.amount) || 0;
            includedTransactions.push(`${tx.transaction_type}: $${tx.amount} (${tx.description})`);
          }
        }
      }

      // Only include if there's actual option activity, netPremium is not zero, and at least one unpaired sold option exists
      const allSoldOptions = transactions.filter((tx: any) => tx.security_type === 'OPTN' && ['Sold', 'Sold Short'].includes(tx.transaction_type));
      const unpairedSoldOptions = allSoldOptions.filter((tx: any) => !excludedOptionIds.has(tx.id));
      // If there are any sold options and all are paired, skip this symbol for the day (regardless of other option activity)
      if (allSoldOptions.length > 0 && unpairedSoldOptions.length === 0) {
        continue;
      }
      // Only include if there are no sold options, or at least one unpaired sold option
      if (allSoldOptions.length === 0 || unpairedSoldOptions.length > 0) {
        if (includedTransactions.length > 0 && netPremium !== 0) {
          entries.push({
            date: date.toISOString(),
            symbol,
            netCredit: netPremium,
            rollType: 'state_machine_calculation' as any,
            buyTransaction: {
              amount: 0,
              description: 'State machine calculation'
            },
            sellTransaction: {
              amount: netPremium,
              description: includedTransactions.join('; ')
            }
          });
        }
      }
    }

    return entries;
  }

  /**
   * Get premium cash flow summary by week and month
   */
  /**
   * Get all unhindered premium cash flow
   * Simply returns all option sales excluding those tied to equity purchases
   */
  async getAllUnhinderedPremium(): Promise<PremiumCashFlowEntry[]> {
    return this.getSimpleOptionRolls();
  }

  async getSummary(): Promise<PremiumCashFlowSummaryResponse> {
    const rolls = await this.getAllUnhinderedPremium();
    
    console.log(`Processing ${rolls.length} rolls for summary`); // Debug log
    
    const summaryMap = new Map<string, PremiumCashFlowSummary>();
    
    rolls.forEach(roll => {
      const date = new Date(roll.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = this.getWeekNumber(date);
      
      console.log(`Processing roll: ${roll.date}, ${roll.symbol}, ${roll.netCredit}`); // Debug log
      
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
      monthSummary.totalNetCredit += (typeof roll.netCredit === 'string' ? parseFloat(roll.netCredit) : roll.netCredit) || 0;
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
      weekSummary.totalNetCredit += (typeof roll.netCredit === 'string' ? parseFloat(roll.netCredit) : roll.netCredit) || 0;
      weekSummary.transactionCount += 1;
      if (!weekSummary.symbols.includes(roll.symbol)) {
        weekSummary.symbols.push(roll.symbol);
      }
    });
    
    const summaries = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.month && b.month) return b.month.localeCompare(a.month);
      if (a.week && b.week) return b.week.localeCompare(a.week);
      return 0;
    });
    
    // Calculate totals
    const totalCredits = summaries.reduce((sum, s) => sum + s.totalNetCredit, 0);
    const totalTransactions = summaries.reduce((sum, s) => sum + s.transactionCount, 0);
    const uniqueSymbols = [...new Set(summaries.flatMap(s => s.symbols))];
    
    console.log(`Generated ${summaries.length} summary entries`); // Debug log
    
    return {
      summaries,
      totalCredits,
      totalTransactions,
      uniqueSymbols
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
