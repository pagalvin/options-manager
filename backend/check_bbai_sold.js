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

async function checkAllBBAI() {
  console.log('=== ALL BBAI Sold Short Transactions ===');
  const soldResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, description, calculated_symbol
    FROM overlord.transactions 
    WHERE (calculated_symbol = 'BBAI' OR symbol LIKE '%BBAI%' OR description LIKE '%BBAI%')
    AND transaction_type = 'Sold Short'
    ORDER BY transaction_date
  `);
  
  console.log(`Found ${soldResult.rows.length} Sold Short transactions for BBAI:`);
  soldResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | Amt: ${row.amount} | Calc Symbol: ${row.calculated_symbol}`);
  });
  
  console.log('\n=== ALL BBAI Bought To Cover Transactions ===');
  const buyResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, description, calculated_symbol
    FROM overlord.transactions 
    WHERE (calculated_symbol = 'BBAI' OR symbol LIKE '%BBAI%' OR description LIKE '%BBAI%')
    AND transaction_type = 'Bought To Cover'
    ORDER BY transaction_date
  `);
  
  console.log(`Found ${buyResult.rows.length} Bought To Cover transactions for BBAI:`);
  buyResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | Amt: ${row.amount} | Calc Symbol: ${row.calculated_symbol}`);
  });

  // Let's also check for any BBAI transactions with different calculated_symbol
  console.log('\n=== ALL BBAI-related transactions (any calculated_symbol) ===');
  const allResult = await pool.query(`
    SELECT DISTINCT calculated_symbol, COUNT(*) as count
    FROM overlord.transactions 
    WHERE (symbol LIKE '%BBAI%' OR description LIKE '%BBAI%')
    GROUP BY calculated_symbol
    ORDER BY count DESC
  `);
  
  console.log('Calculated symbols containing BBAI data:');
  allResult.rows.forEach(row => {
    console.log(`${row.calculated_symbol}: ${row.count} transactions`);
  });
  
  await pool.end();
}

checkAllBBAI().catch(console.error);
