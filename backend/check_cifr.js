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

async function getCIFROptionTransactions() {
  try {
    console.log('CIFR Option Transactions:');
    const cifrResult = await pool.query(`
      SELECT transaction_date, transaction_type, symbol, quantity, amount, strike, description
      FROM overlord.transactions 
      WHERE calculated_symbol = 'CIFR' AND security_type = 'OPTN'
      ORDER BY transaction_date
    `);
    cifrResult.rows.forEach(row => {
      console.log(`${row.transaction_date} | ${row.transaction_type} | ${row.symbol} | Qty: ${row.quantity} | Strike: ${row.strike} | ${row.description}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

getCIFROptionTransactions();
