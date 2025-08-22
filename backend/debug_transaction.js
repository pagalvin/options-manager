const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'xyzzy',
  port: 5432,
});

async function debugTransaction() {
  try {
    // Set search path to overlord schema
    await pool.query('SET search_path TO overlord, public');
    console.log('Set search path to overlord schema');

    // Check table schema
    console.log('=== TRANSACTIONS TABLE SCHEMA ===');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND table_schema = 'overlord'
      ORDER BY ordinal_position;
    `);
    
    schemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    // Test a simple insert to see what fails
    console.log('\n=== TESTING MANUAL TRANSACTION INSERT ===');
    const testTransaction = {
      transactionDate: '2025-08-18',
      transactionType: 'BUY',
      securityType: 'EQ',
      calculatedSymbol: 'TEST',
      symbol: 'TEST',
      quantity: 100,
      amount: 1500.00,
      price: 15.00,
      commission: 0,
      strike: 0,
      description: 'Test manual transaction'
    };

    console.log('Test transaction data:', testTransaction);

    const insertQuery = `
      INSERT INTO transactions (
        transaction_date, transaction_type, security_type, calculated_symbol,
        symbol, quantity, amount, price, commission, strike, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      testTransaction.transactionDate,
      testTransaction.transactionType,
      testTransaction.securityType,
      testTransaction.calculatedSymbol,
      testTransaction.symbol,
      testTransaction.quantity,
      testTransaction.amount,
      testTransaction.price,
      testTransaction.commission,
      testTransaction.strike,
      testTransaction.description,
    ]);

    console.log('Successfully inserted test transaction:', result.rows[0]);

    // Clean up - delete the test transaction
    await pool.query('DELETE FROM transactions WHERE calculated_symbol = $1 AND description = $2', ['TEST', 'Test manual transaction']);
    console.log('Test transaction cleaned up');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
  } finally {
    await pool.end();
  }
}

debugTransaction();
