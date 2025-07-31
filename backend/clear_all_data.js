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

async function clearAllTransactions() {
  const client = await pool.connect();
  try {
    console.log('=== WARNING: This will delete ALL transactions! ===');
    console.log('Current transaction count:');
    const beforeCount = await client.query('SELECT COUNT(*) FROM overlord.transactions');
    console.log('Before deletion:', beforeCount.rows[0].count);
    
    // Also clear related tables that might reference transactions
    console.log('\nClearing all transaction data...');
    
    await client.query('TRUNCATE TABLE overlord.options RESTART IDENTITY CASCADE');
    console.log('✓ Options table cleared');
    
    await client.query('TRUNCATE TABLE overlord.positions RESTART IDENTITY CASCADE');
    console.log('✓ Positions table cleared');
    
    await client.query('TRUNCATE TABLE overlord.securities RESTART IDENTITY CASCADE');
    console.log('✓ Securities table cleared');
    
    await client.query('TRUNCATE TABLE overlord.monthly_performance RESTART IDENTITY CASCADE');
    console.log('✓ Monthly performance table cleared');
    
    await client.query('TRUNCATE TABLE overlord.transactions RESTART IDENTITY CASCADE');
    console.log('✓ Transactions table cleared');
    
    const afterCount = await client.query('SELECT COUNT(*) FROM overlord.transactions');
    console.log('\nAfter deletion:', afterCount.rows[0].count);
    
    console.log('\n✅ SUCCESS: All transaction data cleared!');
    console.log('You can now upload your CSV file and all transactions should be imported properly.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllTransactions();
