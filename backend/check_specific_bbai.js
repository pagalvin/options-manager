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

async function checkSpecificBBAISold() {
  console.log('=== Checking for specific BBAI Sold Short transactions from your CSV ===');
  
  // Check for some specific transactions from your CSV data
  const specificTransactions = [
    { date: '2025-07-21', symbol: 'BBAI Aug 15 \'25 $6.50 Call', amount: 197.48 },
    { date: '2025-07-09', symbol: 'BBAI Aug 08 \'25 $6.50 Call', amount: 158.48 },
    { date: '2025-07-08', symbol: 'BBAI Aug 01 \'25 $6.50 Call', amount: 208.48 },
    { date: '2025-07-02', symbol: 'BBAI Jul 25 \'25 $6.50 Call', amount: 118.48 },
    { date: '2025-06-23', symbol: 'BBAI Jul 25 \'25 $4 Call', amount: 52.48 },
    { date: '2025-06-20', symbol: 'BBAI Jul 25 \'25 $3.50 Call', amount: 148.96 }
  ];

  for (const tx of specificTransactions) {
    const result = await pool.query(`
      SELECT transaction_date, transaction_type, symbol, amount, description
      FROM overlord.transactions 
      WHERE calculated_symbol = 'BBAI' 
      AND transaction_type = 'Sold Short'
      AND symbol LIKE '%BBAI%'
      AND ABS(amount - $1) < 0.1
    `, [tx.amount]);
    
    console.log(`Looking for ${tx.date} ${tx.symbol} (Amount: $${tx.amount}):`);
    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`  FOUND: ${row.transaction_date.toDateString()} | ${row.symbol} | $${row.amount}`);
      });
    } else {
      console.log(`  NOT FOUND in database`);
    }
  }

  // Let's also check the total count of transactions for July 2025
  console.log('\n=== Checking July 2025 transactions for BBAI ===');
  const julyResult = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, amount
    FROM overlord.transactions 
    WHERE calculated_symbol = 'BBAI' 
    AND transaction_date >= '2025-07-01'
    AND transaction_date < '2025-08-01'
    ORDER BY transaction_date, transaction_type
  `);
  
  console.log(`Found ${julyResult.rows.length} BBAI transactions in July 2025:`);
  julyResult.rows.forEach(row => {
    console.log(`${row.transaction_date.toDateString()} | ${row.transaction_type} | ${row.security_type} | ${row.symbol} | $${row.amount}`);
  });

  await pool.end();
}

checkSpecificBBAISold().catch(console.error);
