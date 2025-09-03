import pool from '../database';

export interface MarginAccount {
  id: number;
  name: string;
  broker: string;
  account_number?: string;
  interest_rate: number;
  margin_maintenance_rate: number;
  initial_margin_rate: number;
  max_margin_limit?: number;
  is_active: boolean;
}

export interface MarginTransaction {
  id: number;
  margin_account_id: number;
  transaction_date: string;
  transaction_type: 'DRAW' | 'PAYMENT' | 'INTEREST' | 'FEE';
  amount: number;
  description?: string;
  margin_balance_after: number;
  cash_balance_after: number;
  interest_rate_applied?: number;
}

export interface MarginDailyBalance {
  id: number;
  margin_account_id: number;
  balance_date: string;
  opening_balance: number;
  closing_balance: number;
  daily_interest: number;
  cash_balance: number;
  portfolio_value?: number;
  margin_requirement?: number;
  excess_margin?: number;
}

export interface MarginPlanningScenario {
  id?: number;
  name: string;
  description?: string;
  margin_account_id: number;
  scenario_date: string;
  planned_draw_amount?: number;
  planned_payment_amount?: number;
  projected_portfolio_value?: number;
  projected_margin_balance: number;
  projected_daily_interest: number;
  projected_monthly_interest: number;
  projected_annual_interest: number;
  margin_utilization_percent?: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export interface MarginAlert {
  id: number;
  margin_account_id: number;
  alert_type: 'MARGIN_CALL' | 'HIGH_UTILIZATION' | 'INTEREST_THRESHOLD' | 'PAYMENT_DUE';
  threshold_value?: number;
  threshold_percentage?: number;
  is_active: boolean;
  alert_frequency: 'DAILY' | 'WEEKLY' | 'IMMEDIATE';
  last_triggered?: string;
}

export interface MarginCurrentStatus {
  account_id: number;
  account_name: string;
  broker: string;
  current_margin_balance: number;
  current_cash_balance: number;
  portfolio_value: number;
  margin_requirement: number;
  excess_margin: number;
  daily_interest: number;
  projected_daily_interest: number;
  projected_monthly_interest: number;
  projected_annual_interest: number;
  margin_utilization_percent: number;
  last_updated: string;
}

export interface MarginAnalysisResult {
  current_status: MarginCurrentStatus[];
  recent_transactions: MarginTransaction[];
  daily_balances: MarginDailyBalance[];
  active_alerts: MarginAlert[];
  scenarios: MarginPlanningScenario[];
}

export class MarginPlanningService {
  /**
   * Get comprehensive margin analysis including current status, transactions, and scenarios
   */
  async getMarginAnalysis(): Promise<MarginAnalysisResult> {
    try {
      const [
        currentStatusResult,
        recentTransactionsResult,
        dailyBalancesResult,
        alertsResult,
        scenariosResult
      ] = await Promise.all([
        pool.query('SELECT * FROM overlord.v_current_margin_status ORDER BY account_id'),
        pool.query(`
          SELECT * FROM overlord.margin_transactions 
          WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY transaction_date DESC, id DESC
          LIMIT 100
        `),
        pool.query(`
          SELECT * FROM overlord.margin_daily_balances
          WHERE balance_date >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY balance_date DESC
          LIMIT 100
        `),
        pool.query(`
          SELECT * FROM overlord.margin_alerts
          WHERE is_active = true
          ORDER BY margin_account_id, alert_type
        `),
        pool.query(`
          SELECT * FROM overlord.margin_planning_scenarios
          ORDER BY created_at DESC
          LIMIT 20
        `)
      ]);

      return {
        current_status: currentStatusResult.rows,
        recent_transactions: recentTransactionsResult.rows,
        daily_balances: dailyBalancesResult.rows,
        active_alerts: alertsResult.rows,
        scenarios: scenariosResult.rows
      };
    } catch (error) {
      console.error('Error getting margin analysis:', error);
      throw error;
    }
  }

  /**
   * Get all margin accounts
   */
  async getMarginAccounts(): Promise<MarginAccount[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM overlord.margin_accounts 
        WHERE is_active = true 
        ORDER BY name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting margin accounts:', error);
      throw error;
    }
  }

  /**
   * Create a new margin account
   */
  async createMarginAccount(account: Omit<MarginAccount, 'id'>): Promise<MarginAccount> {
    try {
      const result = await pool.query(`
        INSERT INTO overlord.margin_accounts 
        (name, broker, account_number, interest_rate, margin_maintenance_rate, initial_margin_rate, max_margin_limit, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        account.name,
        account.broker,
        account.account_number,
        account.interest_rate,
        account.margin_maintenance_rate,
        account.initial_margin_rate,
        account.max_margin_limit,
        account.is_active
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating margin account:', error);
      throw error;
    }
  }

  /**
   * Record a margin transaction
   */
  async recordMarginTransaction(transaction: Omit<MarginTransaction, 'id'>): Promise<MarginTransaction> {
    try {
      const result = await pool.query(`
        INSERT INTO overlord.margin_transactions 
        (margin_account_id, transaction_date, transaction_type, amount, description, 
         margin_balance_after, cash_balance_after, interest_rate_applied)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        transaction.margin_account_id,
        transaction.transaction_date,
        transaction.transaction_type,
        transaction.amount,
        transaction.description,
        transaction.margin_balance_after,
        transaction.cash_balance_after,
        transaction.interest_rate_applied
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error recording margin transaction:', error);
      throw error;
    }
  }

  /**
   * Update daily margin balance
   */
  async updateDailyBalance(balance: Omit<MarginDailyBalance, 'id'>): Promise<MarginDailyBalance> {
    try {
      const result = await pool.query(`
        INSERT INTO overlord.margin_daily_balances 
        (margin_account_id, balance_date, opening_balance, closing_balance, daily_interest, 
         cash_balance, portfolio_value, margin_requirement, excess_margin)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (margin_account_id, balance_date) 
        DO UPDATE SET 
          opening_balance = EXCLUDED.opening_balance,
          closing_balance = EXCLUDED.closing_balance,
          daily_interest = EXCLUDED.daily_interest,
          cash_balance = EXCLUDED.cash_balance,
          portfolio_value = EXCLUDED.portfolio_value,
          margin_requirement = EXCLUDED.margin_requirement,
          excess_margin = EXCLUDED.excess_margin
        RETURNING *
      `, [
        balance.margin_account_id,
        balance.balance_date,
        balance.opening_balance,
        balance.closing_balance,
        balance.daily_interest,
        balance.cash_balance,
        balance.portfolio_value,
        balance.margin_requirement,
        balance.excess_margin
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating daily balance:', error);
      throw error;
    }
  }

  /**
   * Create a margin planning scenario
   */
  async createPlanningScenario(scenario: Omit<MarginPlanningScenario, 'id'>): Promise<MarginPlanningScenario> {
    try {
      const result = await pool.query(`
        INSERT INTO overlord.margin_planning_scenarios 
        (name, description, margin_account_id, scenario_date, planned_draw_amount, 
         planned_payment_amount, projected_portfolio_value, projected_margin_balance,
         projected_daily_interest, projected_monthly_interest, projected_annual_interest,
         margin_utilization_percent, risk_level, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        scenario.name,
        scenario.description,
        scenario.margin_account_id,
        scenario.scenario_date,
        scenario.planned_draw_amount,
        scenario.planned_payment_amount,
        scenario.projected_portfolio_value,
        scenario.projected_margin_balance,
        scenario.projected_daily_interest,
        scenario.projected_monthly_interest,
        scenario.projected_annual_interest,
        scenario.margin_utilization_percent,
        scenario.risk_level,
        scenario.notes
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating planning scenario:', error);
      throw error;
    }
  }

  /**
   * Calculate margin scenario projections
   */
  async calculateScenarioProjections(
    accountId: number,
    drawAmount: number = 0,
    paymentAmount: number = 0,
    projectionDays: number = 30
  ): Promise<{
    projected_margin_balance: number;
    projected_daily_interest: number;
    projected_monthly_interest: number;
    projected_annual_interest: number;
    margin_utilization_percent: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    try {
      // Get current status
      const statusResult = await pool.query(`
        SELECT * FROM overlord.v_current_margin_status 
        WHERE account_id = $1
      `, [accountId]);

      if (statusResult.rows.length === 0) {
        throw new Error('Margin account not found');
      }

      const currentStatus = statusResult.rows[0];
      const account = await this.getMarginAccountById(accountId);

      // Calculate projected balance
      const projectedMarginBalance = Math.max(0, 
        currentStatus.current_margin_balance + drawAmount - paymentAmount
      );

      // Calculate interest projections
      const projectedDailyInterest = projectedMarginBalance * account.interest_rate / 365;
      const projectedMonthlyInterest = projectedMarginBalance * account.interest_rate / 12;
      const projectedAnnualInterest = projectedMarginBalance * account.interest_rate;

      // Calculate utilization and risk
      const marginUtilizationPercent = (account.max_margin_limit && account.max_margin_limit > 0)
        ? (projectedMarginBalance / account.max_margin_limit) * 100 
        : 0;

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (marginUtilizationPercent > 80) {
        riskLevel = 'HIGH';
      } else if (marginUtilizationPercent > 50) {
        riskLevel = 'MEDIUM';
      }

      return {
        projected_margin_balance: Number(projectedMarginBalance.toFixed(2)),
        projected_daily_interest: Number(projectedDailyInterest.toFixed(2)),
        projected_monthly_interest: Number(projectedMonthlyInterest.toFixed(2)),
        projected_annual_interest: Number(projectedAnnualInterest.toFixed(2)),
        margin_utilization_percent: Number(marginUtilizationPercent.toFixed(2)),
        risk_level: riskLevel
      };
    } catch (error) {
      console.error('Error calculating scenario projections:', error);
      throw error;
    }
  }

  /**
   * Get margin account by ID
   */
  private async getMarginAccountById(id: number): Promise<MarginAccount> {
    const result = await pool.query(`
      SELECT * FROM overlord.margin_accounts WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Margin account not found');
    }
    
    return result.rows[0];
  }

  /**
   * Check and trigger margin alerts
   */
  async checkMarginAlerts(): Promise<MarginAlert[]> {
    try {
      const triggeredAlerts: MarginAlert[] = [];
      
      // Get all active alerts
      const alertsResult = await pool.query(`
        SELECT * FROM overlord.margin_alerts 
        WHERE is_active = true
      `);

      // Get current status for all accounts
      const statusResult = await pool.query(`
        SELECT * FROM overlord.v_current_margin_status
      `);

      for (const alert of alertsResult.rows) {
        const accountStatus = statusResult.rows.find(s => s.account_id === alert.margin_account_id);
        if (!accountStatus) continue;

        let shouldTrigger = false;

        switch (alert.alert_type) {
          case 'HIGH_UTILIZATION':
            if (alert.threshold_percentage && 
                accountStatus.margin_utilization_percent >= alert.threshold_percentage) {
              shouldTrigger = true;
            }
            break;
          case 'MARGIN_CALL':
            if (alert.threshold_percentage && 
                accountStatus.margin_utilization_percent >= alert.threshold_percentage) {
              shouldTrigger = true;
            }
            break;
          case 'INTEREST_THRESHOLD':
            if (alert.threshold_value && 
                accountStatus.projected_monthly_interest >= alert.threshold_value) {
              shouldTrigger = true;
            }
            break;
        }

        if (shouldTrigger) {
          // Update last triggered timestamp
          await pool.query(`
            UPDATE overlord.margin_alerts 
            SET last_triggered = CURRENT_TIMESTAMP 
            WHERE id = $1
          `, [alert.id]);

          triggeredAlerts.push(alert);
        }
      }

      return triggeredAlerts;
    } catch (error) {
      console.error('Error checking margin alerts:', error);
      throw error;
    }
  }

  /**
   * Sync transactions from main transactions table to margin transactions
   */
  async syncMarginTransactions(): Promise<void> {
    try {
      // Get the default margin account (assuming ID 1)
      const accountResult = await pool.query(`
        SELECT id FROM overlord.margin_accounts 
        WHERE is_active = true 
        ORDER BY id 
        LIMIT 1
      `);

      if (accountResult.rows.length === 0) {
        throw new Error('No active margin account found');
      }

      const accountId = accountResult.rows[0].id;

      // Get all transactions from 8/21/25 onwards that aren't already synced
      const transactionsResult = await pool.query(`
        SELECT 
          t.id,
          t.transaction_date,
          t.transaction_type,
          t.amount,
          t.description
        FROM overlord.transactions t
        WHERE t.transaction_date >= '2025-08-21'
          AND NOT EXISTS (
            SELECT 1 FROM overlord.margin_transactions mt 
            WHERE mt.related_transaction_id = t.id
          )
        ORDER BY t.transaction_date ASC, t.id ASC
      `);

      let marginBalance = 0;
      let cashBalance = 250.28; // Starting cash balance

      // Get the last known balances if any margin transactions exist
      const lastBalanceResult = await pool.query(`
        SELECT margin_balance_after, cash_balance_after 
        FROM overlord.margin_transactions 
        WHERE margin_account_id = $1 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [accountId]);

      if (lastBalanceResult.rows.length > 0) {
        marginBalance = lastBalanceResult.rows[0].margin_balance_after;
        cashBalance = lastBalanceResult.rows[0].cash_balance_after;
      }

      // Process each transaction
      for (const transaction of transactionsResult.rows) {
        const amount = parseFloat(transaction.amount) || 0;
        const isMarginTransfer = transaction.description?.includes('TRNSFR MARGIN TO CASH') && amount > 0;
        
        let transactionType: 'DRAW' | 'PAYMENT' | 'INTEREST' | 'FEE';
        
        if (isMarginTransfer) {
          // Margin transfer: increase margin debt, set cash to 0
          transactionType = 'DRAW';
          marginBalance += amount;
          cashBalance = 0;
        } else if (amount > 0) {
          // Positive cash flow: pay down margin first, then add to cash
          transactionType = 'PAYMENT';
          const marginPayment = Math.min(amount, marginBalance);
          marginBalance -= marginPayment;
          cashBalance += (amount - marginPayment);
        } else {
          // Negative cash flow: reduce cash first, then increase margin if needed
          const expenseAmount = Math.abs(amount);
          if (cashBalance >= expenseAmount) {
            transactionType = 'PAYMENT';
            cashBalance -= expenseAmount;
          } else {
            const remainingExpense = expenseAmount - cashBalance;
            transactionType = 'DRAW';
            cashBalance = 0;
            marginBalance += remainingExpense;
          }
        }

        // Insert margin transaction
        await pool.query(`
          INSERT INTO overlord.margin_transactions 
          (margin_account_id, transaction_date, transaction_type, amount, description,
           related_transaction_id, margin_balance_after, cash_balance_after)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          accountId,
          transaction.transaction_date,
          transactionType,
          Math.abs(amount),
          transaction.description,
          transaction.id,
          Number(marginBalance.toFixed(2)),
          Number(cashBalance.toFixed(2))
        ]);
      }

      console.log(`Synced ${transactionsResult.rows.length} transactions to margin tracking`);
    } catch (error) {
      console.error('Error syncing margin transactions:', error);
      throw error;
    }
  }
}
