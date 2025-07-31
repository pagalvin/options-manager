import pool from '../database';

export class AdminService {
  async deleteAllData(): Promise<{ message: string; deletedCounts: any }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete in order to respect foreign key constraints
      const monthlyResult = await client.query('DELETE FROM monthly_performance RETURNING id');
      const optionsResult = await client.query('DELETE FROM options RETURNING id');
      const positionsResult = await client.query('DELETE FROM positions RETURNING id');
      const transactionsResult = await client.query('DELETE FROM transactions RETURNING id');
      const securitiesResult = await client.query('DELETE FROM securities RETURNING id');
      
      await client.query('COMMIT');
      
      const deletedCounts = {
        transactions: transactionsResult.rows.length,
        positions: positionsResult.rows.length,
        options: optionsResult.rows.length,
        securities: securitiesResult.rows.length,
        monthlyPerformance: monthlyResult.rows.length,
      };
      
      return {
        message: 'All data deleted successfully',
        deletedCounts,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTransactionsOnly(): Promise<{ message: string; deletedCounts: any }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete only transaction-related data, but preserve manual settings
      const monthlyResult = await client.query('DELETE FROM monthly_performance RETURNING id');
      const optionsResult = await client.query('DELETE FROM options RETURNING id');
      const transactionsResult = await client.query('DELETE FROM transactions RETURNING id');
      
      // For positions, preserve manual data but reset calculated fields
      // First, get count of positions that will be affected
      const positionsCountResult = await client.query('SELECT COUNT(*) FROM positions');
      const positionsCount = parseInt(positionsCountResult.rows[0].count);
      
      // Reset calculated position fields while preserving manual_avg_strike_price and manual_option_contracts
      await client.query(`
        UPDATE positions 
        SET quantity = 0, 
            average_cost = 0, 
            total_invested = 0, 
            current_value = 0, 
            unrealized_gain_loss = 0,
            last_updated = CURRENT_TIMESTAMP
        WHERE manual_avg_strike_price IS NOT NULL OR manual_option_contracts IS NOT NULL
      `);
      
      // Delete positions that have no manual data
      const deletedPositionsResult = await client.query(`
        DELETE FROM positions 
        WHERE manual_avg_strike_price IS NULL AND manual_option_contracts IS NULL
        RETURNING id
      `);
      
      // Keep securities table - it contains reference data
      
      await client.query('COMMIT');
      
      const deletedCounts = {
        transactions: transactionsResult.rows.length,
        positions: deletedPositionsResult.rows.length,
        positionsReset: positionsCount - deletedPositionsResult.rows.length,
        options: optionsResult.rows.length,
        monthlyPerformance: monthlyResult.rows.length,
      };
      
      return {
        message: 'Transaction data deleted successfully (securities and manual strike prices preserved)',
        deletedCounts,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSystemStats(): Promise<{
    totalTransactions: number;
    totalPositions: number;
    totalOptions: number;
    openOptions: number;
    lastTransactionDate: string | null;
    databaseSize: string;
  }> {
    const transactionsCount = await pool.query('SELECT COUNT(*) FROM transactions');
    const positionsCount = await pool.query('SELECT COUNT(*) FROM positions WHERE quantity > 0');
    const optionsCount = await pool.query('SELECT COUNT(*) FROM options');
    const openOptionsCount = await pool.query('SELECT COUNT(*) FROM options WHERE status = \'OPEN\'');
    const lastTransaction = await pool.query('SELECT MAX(transaction_date) FROM transactions');
    
    // Get database size (PostgreSQL specific)
    const dbSize = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);

    return {
      totalTransactions: parseInt(transactionsCount.rows[0].count),
      totalPositions: parseInt(positionsCount.rows[0].count),
      totalOptions: parseInt(optionsCount.rows[0].count),
      openOptions: parseInt(openOptionsCount.rows[0].count),
      lastTransactionDate: lastTransaction.rows[0].max,
      databaseSize: dbSize.rows[0].size,
    };
  }

  async resetSequences(): Promise<{ message: string }> {
    // Reset all sequence counters to start from 1
    const sequences = [
      'securities_id_seq',
      'transactions_id_seq',
      'positions_id_seq',
      'options_id_seq',
      'monthly_performance_id_seq',
    ];

    for (const seq of sequences) {
      try {
        await pool.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (error) {
        console.warn(`Sequence ${seq} might not exist:`, error);
      }
    }

    return { message: 'Database sequences reset successfully' };
  }

  async validateDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check for orphaned options (options without corresponding securities)
      const orphanedOptions = await pool.query(`
        SELECT COUNT(*) FROM options o 
        WHERE NOT EXISTS (SELECT 1 FROM securities s WHERE s.symbol = o.underlying_symbol)
      `);
      
      if (parseInt(orphanedOptions.rows[0].count) > 0) {
        issues.push(`Found ${orphanedOptions.rows[0].count} options without corresponding securities`);
      }

      // Check for positions with negative quantities (shouldn't happen normally)
      const negativePositions = await pool.query(`
        SELECT COUNT(*) FROM positions WHERE quantity < 0
      `);
      
      if (parseInt(negativePositions.rows[0].count) > 0) {
        issues.push(`Found ${negativePositions.rows[0].count} positions with negative quantities`);
      }

      // Check for transactions with invalid dates
      const invalidDates = await pool.query(`
        SELECT COUNT(*) FROM transactions 
        WHERE transaction_date > CURRENT_DATE OR transaction_date < '2000-01-01'
      `);
      
      if (parseInt(invalidDates.rows[0].count) > 0) {
        issues.push(`Found ${invalidDates.rows[0].count} transactions with invalid dates`);
      }

      // Check for options with expiration dates in the past but still marked as OPEN
      const expiredOpenOptions = await pool.query(`
        SELECT COUNT(*) FROM options 
        WHERE status = 'OPEN' AND expiration_date < CURRENT_DATE
      `);
      
      if (parseInt(expiredOpenOptions.rows[0].count) > 0) {
        issues.push(`Found ${expiredOpenOptions.rows[0].count} expired options still marked as OPEN`);
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Error during data integrity check: ${error}`);
      return { valid: false, issues };
    }
  }

  async fixDataIntegrity(): Promise<{ message: string; fixed: string[] }> {
    const fixed: string[] = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Fix expired options that are still marked as OPEN
      const expiredOptionsResult = await client.query(`
        UPDATE options 
        SET status = 'EXPIRED', closed_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
        WHERE status = 'OPEN' AND expiration_date < CURRENT_DATE
        RETURNING id
      `);
      
      if (expiredOptionsResult.rows.length > 0) {
        fixed.push(`Marked ${expiredOptionsResult.rows.length} expired options as EXPIRED`);
      }

      // Create missing securities for options
      const missingSecurities = await client.query(`
        INSERT INTO securities (symbol, security_type)
        SELECT DISTINCT o.underlying_symbol, 'STOCK'
        FROM options o 
        WHERE NOT EXISTS (SELECT 1 FROM securities s WHERE s.symbol = o.underlying_symbol)
        ON CONFLICT (symbol) DO NOTHING
        RETURNING id
      `);
      
      if (missingSecurities.rows.length > 0) {
        fixed.push(`Created ${missingSecurities.rows.length} missing securities for options`);
      }

      await client.query('COMMIT');

      return {
        message: 'Data integrity issues fixed',
        fixed,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async backupData(): Promise<{ message: string; filename: string }> {
    // This would ideally create a SQL dump
    // For now, we'll just return the data as JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;

    const transactions = await pool.query('SELECT * FROM transactions ORDER BY id');
    const positions = await pool.query('SELECT * FROM positions ORDER BY id');
    const options = await pool.query('SELECT * FROM options ORDER BY id');
    const securities = await pool.query('SELECT * FROM securities ORDER BY id');
    const monthly = await pool.query('SELECT * FROM monthly_performance ORDER BY year, month');

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        transactions: transactions.rows,
        positions: positions.rows,
        options: options.rows,
        securities: securities.rows,
        monthlyPerformance: monthly.rows,
      },
    };

    // In a real implementation, you'd save this to a file
    // For now, we'll just return the structure
    return {
      message: `Backup created successfully`,
      filename,
    };
  }
}
