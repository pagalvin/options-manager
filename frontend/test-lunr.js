// Test the calculateOpenOptions function with recent LUNR data

const recentLunrTransactions = [
  // Sep 19 '25 $5 Call - still open from March
  { transaction_type: 'Sold Short', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: -1, transaction_date: '2025-03-12' },
  
  // Recent transactions around 8/11-8/13
  { transaction_type: 'Sold', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: -1, transaction_date: '2025-08-11', description: 'CALL LUNR   08/15/25    11.000 OPENING' },
  { transaction_type: 'Bought', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: 1, transaction_date: '2025-08-12', description: 'CALL LUNR   08/15/25    11.000 CLOSING' },
  { transaction_type: 'Sold', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: -1, transaction_date: '2025-08-12', description: 'CALL LUNR   08/22/25    11.000 OPENING' },
  { transaction_type: 'Sold', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: -1, transaction_date: '2025-08-13', description: 'CALL LUNR   08/29/25    11.000 OPENING' },
  { transaction_type: 'Bought', security_type: 'OPTN', calculated_symbol: 'LUNR', quantity: 1, transaction_date: '2025-08-13', description: 'CALL LUNR   08/22/25    11.000 CLOSING' },
];

function calculateOpenOptions(transactions, targetSymbol) {
  let totalOptionContracts = 0;

  const filteredTransactions = transactions.filter(transaction => {
    const symbol = ((transaction.symbol || transaction.calculated_symbol || '').toUpperCase());
    const secType = ((transaction.security_type || '').toUpperCase());
    return symbol.includes(targetSymbol) && secType === 'OPTN';
  });

  console.log(`Found ${filteredTransactions.length} option transactions for ${targetSymbol}`);

  filteredTransactions.forEach(transaction => {
    const quantity = parseFloat(String(transaction.quantity || '0'));
    const type = (transaction.transaction_type || '').toUpperCase();
    const secType = ((transaction.security_type || '').toUpperCase());

    console.log(`${transaction.transaction_date}: ${type} qty=${quantity} - ${transaction.description || ''}`);

    if (quantity && !isNaN(quantity) && type && secType === 'OPTN') {
      // Opening transactions
      if (type === 'SOLD SHORT' || type === 'SOLD') {
        totalOptionContracts += Math.abs(quantity);
        console.log(`  -> Added ${Math.abs(quantity)}, total: ${totalOptionContracts}`);
      }
      // Closing transactions
      else if (type === 'BOUGHT TO COVER' || type === 'BOUGHT' || type === 'OPTION ASSIGNED' || type === 'OPTION EXPIRED') {
        totalOptionContracts -= Math.abs(quantity);
        console.log(`  -> Subtracted ${Math.abs(quantity)}, total: ${totalOptionContracts}`);
      }
    }
  });

  // Ensure we never return negative values (can't have negative open contracts)
  const result = Math.max(0, totalOptionContracts);
  console.log(`Final result for ${targetSymbol}: ${result}`);
  return result;
}

// Test with LUNR data
console.log('Testing calculateOpenOptions with LUNR data...');
const result = calculateOpenOptions(recentLunrTransactions, 'LUNR');
console.log(`Expected: 2, Got: ${result}`);
