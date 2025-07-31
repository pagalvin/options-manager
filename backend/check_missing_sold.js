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

async function checkMissingTransactions() {
  console.log('=== ALL BBAI Transaction Types ===');
  const typesResult = await pool.query(`
    SELECT transaction_type, security_type, COUNT(*) as count, MIN(transaction_date) as earliest, MAX(transaction_date) as latest
    FROM overlord.transactions 
    WHERE calculated_symbol = 'BBAI'
    GROUP BY transaction_type, security_type
    ORDER BY security_type, transaction_type
  `);
  
  console.log('Transaction types for BBAI:');
  typesResult.rows.forEach(row => {
    console.log(`${row.security_type} | ${row.transaction_type}: ${row.count} transactions (${row.earliest.toDateString()} to ${row.latest.toDateString()})`);
  });

  console.log('\n=== Date Range of All Transactions ===');
  const dateResult = await pool.query(`
    SELECT MIN(transaction_date) as earliest, MAX(transaction_date) as latest, COUNT(*) as total
    FROM overlord.transactions
  `);
  
  console.log(`Database contains transactions from ${dateResult.rows[0].earliest.toDateString()} to ${dateResult.rows[0].latest.toDateString()} (${dateResult.rows[0].total} total)`);

  console.log('\n=== Sample of earliest transactions ===');
  const earlyResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, calculated_symbol, symbol, amount
    FROM overlord.transactions 
    ORDER BY transaction_date 
    LIMIT 10
  `);
  
  earlyResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.security_type} | ${row.calculated_symbol} | ${row.amount}`);
  });

  console.log('\n=== Check for any negative quantity option transactions (might be sells) ===');
  const negResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount
    FROM overlord.transactions 
    WHERE calculated_symbol = 'BBAI' AND security_type = 'OPTN' AND quantity < 0
    ORDER BY transaction_date
  `);
  
  console.log(`Found ${negResult.rows.length} negative quantity option transactions for BBAI:`);
  negResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.symbol} | Qty: ${row.quantity} | Amt: ${row.amount}`);
  });
  
  await pool.end();
}

checkMissingTransactions().catch(console.error);
