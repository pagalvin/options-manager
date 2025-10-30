const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkRDW() {
  try {
    const result = await pool.query(`
      SELECT 
        transaction_date, 
        symbol, 
        calculated_symbol, 
        security_type, 
        transaction_type, 
        description, 
        quantity, 
        amount,
        strike
      FROM overlord.transactions 
      WHERE calculated_symbol = 'RDW' 
      ORDER BY transaction_date DESC
    `);
    
    console.log(`\n=== RDW Transactions (${result.rows.length} total) ===\n`);
    result.rows.forEach((row, index) => {
      console.log(`[${index + 1}] ${row.transaction_date.toISOString().split('T')[0]} | ${row.security_type} | ${row.transaction_type}`);
      console.log(`    Symbol: ${row.symbol} (calc: ${row.calculated_symbol})`);
      console.log(`    Description: ${row.description}`);
      console.log(`    Quantity: ${row.quantity}, Amount: ${row.amount}, Strike: ${row.strike}`);
      console.log('');
    });
    
    // Now calculate open options using the same logic as the frontend
    let totalOptionContracts = 0;
    const optionTransactions = result.rows.filter(t => t.security_type === 'OPTN');
    
    console.log(`\n=== Option Transactions Calculation ===`);
    optionTransactions.forEach(t => {
      const quantity = parseFloat(String(t.quantity || '0'));
      const type = (t.transaction_type || '').toUpperCase();
      
      let operation = '';
      if (type === 'SOLD SHORT' || type === 'SOLD') {
        totalOptionContracts += Math.abs(quantity);
        operation = `ADD ${Math.abs(quantity)}`;
      } else if (type === 'BOUGHT TO COVER' || type === 'BOUGHT' || type === 'OPTION ASSIGNED' || type === 'OPTION EXPIRED') {
        totalOptionContracts -= Math.abs(quantity);
        operation = `SUBTRACT ${Math.abs(quantity)}`;
      }
      
      console.log(`${t.transaction_date.toISOString().split('T')[0]} | ${type} | Qty: ${quantity} | ${operation} | Running Total: ${totalOptionContracts}`);
    });
    
    console.log(`\n=== FINAL OPEN OPTIONS FOR RDW: ${Math.max(0, totalOptionContracts)} ===\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRDW();
