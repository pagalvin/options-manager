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

async function checkDuplicateConflicts() {
  console.log('=== Checking for potential duplicate conflicts ===');
  
  // Look for transactions with same date, symbol, and quantity but different transaction types
  const result = await pool.query(`
    SELECT 
      transaction_date, 
      calculated_symbol, 
      quantity, 
      amount, 
      price,
      COUNT(*) as count,
      STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
      STRING_AGG(DISTINCT symbol, ' | ') as symbols
    FROM overlord.transactions 
    WHERE calculated_symbol IN ('BBAI', 'CIFR')
    GROUP BY transaction_date, calculated_symbol, quantity, amount, price
    HAVING COUNT(*) > 1 OR STRING_AGG(DISTINCT transaction_type, ', ') LIKE '%Sold Short%'
    ORDER BY transaction_date DESC
  `);
  
  console.log(`Found ${result.rows.length} potential conflict scenarios:`);
  result.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.calculated_symbol} | Qty: ${row.quantity} | Amt: ${row.amount} | Types: ${row.transaction_types} | Count: ${row.count}`);
  });

  // Also check what the unique constraint would consider duplicates
  console.log('\n=== Checking for actual unique constraint violations ===');
  const uniqueResult = await pool.query(`
    SELECT 
      transaction_date, 
      calculated_symbol, 
      quantity, 
      amount, 
      price,
      description,
      COUNT(*) as count,
      STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types
    FROM overlord.transactions 
    WHERE calculated_symbol IN ('BBAI', 'CIFR')
    GROUP BY transaction_date, calculated_symbol, quantity, amount, price, description
    HAVING COUNT(*) > 1
    ORDER BY transaction_date DESC
  `);
  
  console.log(`Found ${uniqueResult.rows.length} actual unique constraint violations:`);
  uniqueResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.calculated_symbol} | Qty: ${row.quantity} | Amt: ${row.amount} | Types: ${row.transaction_types} | Count: ${row.count}`);
  });

  await pool.end();
}

checkDuplicateConflicts().catch(console.error);
