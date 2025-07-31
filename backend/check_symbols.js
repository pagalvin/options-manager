const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  schema: 'overlord'
});

async function checkTransactions() {
  console.log('=== BBAI Transactions ===');
  const bbaiResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, strike, description
    FROM overlord.transactions 
    WHERE calculated_symbol = 'BBAI'
    ORDER BY transaction_date
  `);
  bbaiResult.rows.forEach(row => {
    console.log(`${row.transaction_date} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | Qty: ${row.quantity} | Amt: ${row.amount} | Strike: ${row.strike}`);
  });
  
  console.log('\n=== CIFR Transactions ===');
  const cifrResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, strike, description
    FROM overlord.transactions 
    WHERE calculated_symbol = 'CIFR'
    ORDER BY transaction_date
  `);
  cifrResult.rows.forEach(row => {
    console.log(`${row.transaction_date} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | Qty: ${row.quantity} | Amt: ${row.amount} | Strike: ${row.strike}`);
  });
  
  console.log('\n=== URGN Transactions ===');
  const urgnResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, strike, description
    FROM overlord.transactions 
    WHERE calculated_symbol = 'URGN'
    ORDER BY transaction_date
  `);
  urgnResult.rows.forEach(row => {
    console.log(`${row.transaction_date} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | Qty: ${row.quantity} | Amt: ${row.amount} | Strike: ${row.strike}`);
  });
  
  await pool.end();
}

checkTransactions().catch(console.error);
