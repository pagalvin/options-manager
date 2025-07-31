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


async function calculatePremium(symbol) {
  console.log(`\n=== ${symbol} Premium Calculation ===`);
  
  const result = await pool.query(`
    SELECT transaction_date, transaction_type, security_type, symbol, quantity, amount, strike, description
    FROM overlord.transactions 
    WHERE calculated_symbol = $1 AND security_type = 'OPTN'
    ORDER BY transaction_date
  `, [symbol]);
  
  let totalPremiumReceived = 0;
  let totalPremiumPaid = 0;
  
  result.rows.forEach(row => {
    const amount = parseFloat(row.amount);
    const transactionType = row.transaction_type;
    
    console.log(`${row.transaction_date.toDateString()} | ${transactionType} | ${row.symbol} | Amt: ${amount}`);
    
    if (transactionType === 'Sold Short') {
      totalPremiumReceived += amount;
      console.log(`  -> Added to premium received: ${amount}`);
    } else if (transactionType === 'Bought To Cover') {
      totalPremiumPaid += Math.abs(amount);
      console.log(`  -> Added to premium paid: ${Math.abs(amount)}`);
    } else {
      console.log(`  -> Ignored (${transactionType})`);
    }
  });
  
  const netPremium = totalPremiumReceived - totalPremiumPaid;
  
  console.log(`\nSummary for ${symbol}:`);
  console.log(`Premium Received: $${totalPremiumReceived.toFixed(2)}`);
  console.log(`Premium Paid: $${totalPremiumPaid.toFixed(2)}`);
  console.log(`Net Premium: $${netPremium.toFixed(2)}`);
  
  return netPremium;
}

async function main() {
  await calculatePremium('BBAI');
  await calculatePremium('CIFR');
  await calculatePremium('URGN');
  await pool.end();
}

main().catch(console.error);
