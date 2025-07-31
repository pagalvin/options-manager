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

async function checkRecentTransactions() {
  const client = await pool.connect();
  try {
    console.log('=== Transaction Count Check ===');
    const total = await client.query('SELECT COUNT(*) FROM overlord.transactions');
    console.log('Total transactions:', total.rows[0].count);
    
    console.log('\n=== Most Recent 10 Transactions ===');
    const recent = await client.query(`
      SELECT transaction_date, transaction_type, calculated_symbol, symbol, amount 
      FROM overlord.transactions 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    recent.rows.forEach(row => {
      console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.calculated_symbol} | $${row.amount}`);
    });
    
    console.log('\n=== Looking for new BBAI Sold Short transactions ===');
    const bbaiSold = await client.query(`
      SELECT transaction_date, transaction_type, symbol, amount 
      FROM overlord.transactions 
      WHERE calculated_symbol = 'BBAI' AND transaction_type = 'Sold Short' 
      ORDER BY transaction_date
    `);
    
    console.log(`Found ${bbaiSold.rows.length} BBAI Sold Short transactions:`);
    bbaiSold.rows.forEach(row => {
      console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.symbol} | $${row.amount}`);
    });
    
    console.log('\n=== Checking for specific dates from CSV ===');
    const specificDates = ['2025-07-21', '2025-07-09', '2025-07-08', '2025-07-02', '2025-06-23', '2025-06-20'];
    
    for (const date of specificDates) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM overlord.transactions 
        WHERE calculated_symbol = 'BBAI' 
        AND transaction_type = 'Sold Short' 
        AND transaction_date = $1
      `, [date]);
      
      console.log(`${date}: ${result.rows[0].count} BBAI Sold Short transactions`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRecentTransactions();
