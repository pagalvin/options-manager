import pool from '../database';

export interface MarginTransaction {
  date: string;
  type: 'DRAW' | 'PAYMENT';
  amount: number;
  description: string;
  running_balance: number;
  cash_balance: number;
  daily_interest: number;
  cumulative_interest: number;
}

export interface MarginSummary {
  current_balance: number;
  current_cash_balance: number;
  total_interest_accrued: number;
  total_draws: number;
  total_payments: number;
  average_daily_balance: number;
  days_with_balance: number;
}

export interface DailySummary {
  date: string;
  margin_balance: number;
  cash_balance: number;
  interest_today: number;
  accumulated_interest: number;
}

const MARGIN_INTEREST_RATE = 0.132; // 13.2% annual rate
const DAILY_RATE = MARGIN_INTEREST_RATE / 365;

export class MarginService {
  /**
   * Calculate margin balance and interest over time
   */
  static async calculateMarginAnalysis(): Promise<{
    transactions: MarginTransaction[];
    dailySummaries: DailySummary[];
    summary: MarginSummary;
  }> {
    try {
      // Get all transactions from 8/21/25 onwards ordered by date
      const result = await pool.query(`
        SELECT 
          transaction_date,
          transaction_type,
          security_type,
          amount,
          description
        FROM transactions 
        WHERE transaction_date >= '2025-08-21'
        ORDER BY transaction_date ASC, id ASC
      `);

      const transactions: MarginTransaction[] = [];
      let marginBalance = 0;  // Outstanding margin debt
      let cashBalance = 250.28;    // Available cash as of the start of my margin life (8/21/25)
      let cumulativeInterest = 0;
      let lastDate: Date | null = null;
      
      // Add initial balance transaction to show starting cash position
      transactions.push({
        date: '2025-08-21',
        type: 'PAYMENT',
        amount: 250.28,
        description: 'Initial cash balance at start of margin trading',
        running_balance: 0,
        cash_balance: 250.28,
        daily_interest: 0,
        cumulative_interest: 0
      });
      
      // Process each transaction
      for (const row of result.rows) {
        const currentDate = new Date(row.transaction_date);
        
        // Calculate interest on outstanding margin for days between transactions
        if (lastDate && marginBalance > 0) {
          const daysDiff = Math.max(0, Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
          const periodInterest = marginBalance * DAILY_RATE * daysDiff;
          cumulativeInterest += periodInterest;
          marginBalance += periodInterest;
        }

        const amount = parseFloat(row.amount) || 0;
        const isMarginTransfer = row.description?.includes('TRNSFR MARGIN TO CASH') && amount > 0;
        
        let transactionType: 'DRAW' | 'PAYMENT';
        let marginBefore = marginBalance;
        
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
          // Negative cash flow (expenses): reduce cash first, then increase margin if needed
          const expenseAmount = Math.abs(amount);
          if (cashBalance >= expenseAmount) {
            // Cash covers the expense
            transactionType = 'PAYMENT';
            cashBalance -= expenseAmount;
          } else {
            // Expense exceeds cash - use all cash and put remainder on margin
            const remainingExpense = expenseAmount - cashBalance;
            transactionType = 'DRAW';
            cashBalance = 0;
            marginBalance += remainingExpense;
          }
        }

        const dailyInterest = marginBalance > 0 ? marginBalance * DAILY_RATE : 0;

        // Only record transactions that affect margin or when margin balance > 0
        if (isMarginTransfer || marginBalance > 0 || marginBefore > 0) {
        transactions.push({
          date: row.transaction_date instanceof Date ? row.transaction_date.toISOString().split('T')[0] : row.transaction_date,
          type: transactionType,
          amount: Math.abs(amount),
          description: row.description || '',
          running_balance: Number(marginBalance.toFixed(2)),
          cash_balance: Number(cashBalance.toFixed(2)),
          daily_interest: Number(dailyInterest.toFixed(2)),
          cumulative_interest: Number(cumulativeInterest.toFixed(2))
        });
        }

        lastDate = currentDate;
      }

      // Calculate interest up to today if there's an outstanding balance
      if (lastDate && marginBalance > 0) {
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) {
          const periodInterest = marginBalance * DAILY_RATE * daysDiff;
          cumulativeInterest += periodInterest;
          marginBalance += periodInterest;

          // Add current interest accrual entry
          transactions.push({
            date: today.toISOString().split('T')[0],
            type: 'DRAW',
            amount: 0,
            description: `Interest accrued through ${today.toISOString().split('T')[0]}`,
            running_balance: Number(marginBalance.toFixed(2)),
            cash_balance: Number(cashBalance.toFixed(2)),
            daily_interest: Number((marginBalance * DAILY_RATE).toFixed(2)),
            cumulative_interest: Number(cumulativeInterest.toFixed(2))
          });
        }
      }

      // Calculate summary statistics
      const draws = transactions.filter(t => t.type === 'DRAW');
      const payments = transactions.filter(t => t.type === 'PAYMENT');
      
      const totalDraws = draws.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalPayments = payments.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Generate daily summaries - one entry per day
      const dailySummariesMap = new Map<string, DailySummary>();
      
      for (const transaction of transactions) {
        // Ensure consistent date format - convert to YYYY-MM-DD
        let dateKey: string;
        if (transaction.date.includes('T')) {
          // Already in ISO format, just take date part
          dateKey = transaction.date.split('T')[0];
        } else if (transaction.date.includes('-') && transaction.date.length === 10) {
          // Already in YYYY-MM-DD format
          dateKey = transaction.date;
        } else {
          // Parse as date and format as YYYY-MM-DD
          const parsedDate = new Date(transaction.date);
          dateKey = parsedDate.toISOString().split('T')[0];
        }
        
        const existing = dailySummariesMap.get(dateKey);
        
        if (!existing) {
          // First transaction for this date - create new daily summary
          dailySummariesMap.set(dateKey, {
            date: dateKey,
            margin_balance: transaction.running_balance,
            cash_balance: transaction.cash_balance,
            interest_today: transaction.daily_interest,
            accumulated_interest: transaction.cumulative_interest
          });
        } else {
          // Update with latest values for this date (end of day values)
          existing.margin_balance = transaction.running_balance;
          existing.cash_balance = transaction.cash_balance;
          existing.interest_today = transaction.daily_interest;
          existing.accumulated_interest = transaction.cumulative_interest;
        }
      }
      
      const dailySummaries = Array.from(dailySummariesMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const daysWithBalance = transactions.filter(t => t.running_balance > 0).length;
      const averageDailyBalance = daysWithBalance > 0 
        ? transactions.reduce((sum, t) => sum + t.running_balance, 0) / daysWithBalance 
        : 0;

      const summary: MarginSummary = {
        current_balance: Number(marginBalance.toFixed(2)),
        current_cash_balance: Number(cashBalance.toFixed(2)),
        total_interest_accrued: Number(cumulativeInterest.toFixed(2)),
        total_draws: Number(totalDraws.toFixed(2)),
        total_payments: Number(totalPayments.toFixed(2)),
        average_daily_balance: Number(averageDailyBalance.toFixed(2)),
        days_with_balance: daysWithBalance
      };

      return { transactions, dailySummaries, summary };

    } catch (error) {
      console.error('Error calculating margin analysis:', error);
      throw error;
    }
  }

  /**
   * Get current margin balance
   */
  static async getCurrentMarginBalance(): Promise<number> {
    try {
      const analysis = await this.calculateMarginAnalysis();
      return analysis.summary.current_balance;
    } catch (error) {
      console.error('Error getting current margin balance:', error);
      return 0;
    }
  }
}
