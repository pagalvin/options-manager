// Test the calculateOpenOptions function with SOUN data

// Mock SOUN transactions based on user's description
const sounTransactions = [
  // Previous transactions that opened positions (6 total)
  { transaction_type: 'Sold Short', security_type: 'OPTN', calculated_symbol: 'SOUN', quantity: -3 },
  { transaction_type: 'Sold Short', security_type: 'OPTN', calculated_symbol: 'SOUN', quantity: -3 },
  
  // Recent option assignments from 8/16/2025 (3 closed)
  { transaction_type: 'Option Assigned', security_type: 'OPTN', calculated_symbol: 'SOUN', quantity: 1 },
  { transaction_type: 'Option Assigned', security_type: 'OPTN', calculated_symbol: 'SOUN', quantity: 2 },
  
  // This should leave 3 contracts open: 6 opened - 3 closed = 3
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

    console.log(`${targetSymbol}: type='${type}' qty=${quantity}`);

    if (quantity && !isNaN(quantity) && type && secType === 'OPTN') {
      // SELL SHORT (or equivalent) = opening a new short option position
      if (type === 'SOLD SHORT') {
        totalOptionContracts += Math.abs(quantity);
        console.log(`  -> Added ${Math.abs(quantity)}, total: ${totalOptionContracts}`);
      }
      // BUY TO COVER = closing a short option position
      // OPTION ASSIGNED/EXPIRED = option position closed
      else if (type === 'BOUGHT TO COVER' || type === 'OPTION ASSIGNED' || type === 'OPTION EXPIRED') {
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

// Test with SOUN data
console.log('Testing calculateOpenOptions with SOUN data...');
const result = calculateOpenOptions(sounTransactions, 'SOUN');
console.log(`Expected: 3, Got: ${result}`);
