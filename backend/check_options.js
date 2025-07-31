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

async function getOptionTransactionTypes() {
  try {
    const result = await pool.query(`
      SELECT DISTINCT transaction_type, security_type 
      FROM overlord.transactions 
      WHERE security_type = 'OPTN' 
      ORDER BY transaction_type
    `);
    console.log('Option Transaction Types:');
    result.rows.forEach(row => {
      console.log(`- ${row.transaction_type} (${row.security_type})`);
    });
    
    console.log('\nBBAI Option Transactions:');
    const bbaiResult = await pool.query(`
      SELECT transaction_date, transaction_type, symbol, quantity, amount, description
      FROM overlord.transactions 
      WHERE calculated_symbol = 'BBAI' AND security_type = 'OPTN'
      ORDER BY transaction_date
    `);
    bbaiResult.rows.forEach(row => {
      console.log(`${row.transaction_date} | ${row.transaction_type} | ${row.symbol} | Qty: ${row.quantity} | ${row.description}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

getOptionTransactionTypes();
