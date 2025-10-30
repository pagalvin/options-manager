const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'xyzzy'
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
    
    // Check equity position
    const equityResult = await pool.query(`
      SELECT COUNT(*) as total_transactions, SUM(quantity) as net_shares 
      FROM overlord.transactions 
      WHERE calculated_symbol = 'RDW' AND security_type = 'EQ'
    `);
    console.log('=== RDW Equity Position ===');
    console.log(`Net Shares: ${equityResult.rows[0].net_shares} (from ${equityResult.rows[0].total_transactions} transactions)`);
    console.log('');
    
    // Check if there are any transactions we might have missed
    const allRdwResult = await pool.query(`
      SELECT symbol, COUNT(*) as count
      FROM overlord.transactions 
      WHERE symbol LIKE 'RDW%' OR calculated_symbol = 'RDW'
      GROUP BY symbol
      ORDER BY symbol
    `);
    console.log('=== All RDW-related symbols in database ===');
    allRdwResult.rows.forEach(r => console.log(`${r.symbol}: ${r.count} transactions`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRDW();
