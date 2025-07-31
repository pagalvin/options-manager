const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA || 'overlord'
});

async function checkConstraints() {
  const client = await pool.connect();
  try {
    console.log('=== Checking for any remaining unique constraints ===');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'transactions' 
      AND table_schema = 'overlord'
      AND constraint_type = 'UNIQUE'
    `);
    
    console.log(`Found ${constraints.rows.length} unique constraints:`);
    constraints.rows.forEach(row => {
      console.log(`- ${row.constraint_name} (${row.constraint_type})`);
    });
    
    if (constraints.rows.length === 0) {
      console.log('✅ No unique constraints found - should allow duplicates');
    }
    
    console.log('\n=== Testing a simple insert ===');
    const testResult = await client.query(`
      INSERT INTO overlord.transactions (
        transaction_date, transaction_type, security_type, calculated_symbol,
        symbol, quantity, amount, price, commission, strike, description
      ) VALUES ('2025-01-01', 'Test', 'TEST', 'TEST', 'TEST', 1, 100.00, 100.00, 0, 0, 'Test transaction')
      RETURNING id
    `);
    
    console.log('Test insert result rows:', testResult.rows.length);
    console.log('Test insert returned ID:', testResult.rows[0]?.id);
    
    if (testResult.rows.length > 0) {
      console.log('✅ INSERT works and returns rows');
    } else {
      console.log('❌ INSERT not returning rows - there might be another issue');
    }
    
    // Clean up test
    await client.query("DELETE FROM overlord.transactions WHERE description = 'Test transaction'");
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkConstraints();
