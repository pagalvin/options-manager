/**
 * Example usage of the calculateOpenOptions utility functions
 * 
 * This file demonstrates how to use the options calculation utilities
 * from the utils library to calculate open option positions.
 */

import { calculateOpenOptions, calculateOpenOptionsBySymbol } from '@/lib/utils';

// Example transaction data
const sampleTransactions = [
  {
    calculated_symbol: 'AAPL240119C150',
    transaction_type: 'Sold Short',
    description: 'SOLD 2 AAPL JAN 19 2024 $150.00 CALL',
    quantity: 2
  },
  {
    calculated_symbol: 'AAPL240119C150',
    transaction_type: 'Bought To Cover',
    description: 'BOUGHT 1 AAPL JAN 19 2024 $150.00 CALL',
    quantity: 1
  },
  {
    calculated_symbol: 'MSFT240215P300',
    transaction_type: 'Sold Short',
    description: 'SOLD 3 MSFT FEB 15 2024 $300.00 PUT',
    quantity: 3
  },
  {
    calculated_symbol: 'TSLA240301C200',
    transaction_type: 'Sold Short',
    description: 'SOLD 1 TSLA MAR 01 2024 $200.00 CALL',
    quantity: 1
  },
  {
    calculated_symbol: 'TSLA240301C200',
    transaction_type: 'Option Expired',
    description: 'EXPIRED 1 TSLA MAR 01 2024 $200.00 CALL',
    quantity: 1
  }
];

// Example usage functions
export function demonstrateUsage() {
  console.log('=== Options Calculation Examples ===');
  
  // Calculate total open options across all symbols
  const totalOpen = calculateOpenOptions(sampleTransactions);
  console.log('Total open options:', totalOpen);
  // Expected: 4 (2-1 for AAPL + 3 for MSFT + 1-1 for TSLA = 4)
  
  // Calculate open options for specific symbol
  const aaplOpen = calculateOpenOptions(sampleTransactions, 'AAPL240119C150');
  console.log('AAPL open options:', aaplOpen);
  // Expected: 1 (sold 2, bought back 1)
  
  const msftOpen = calculateOpenOptions(sampleTransactions, 'MSFT240215P300');
  console.log('MSFT open options:', msftOpen);
  // Expected: 3 (sold 3, none closed)
  
  const tslaOpen = calculateOpenOptions(sampleTransactions, 'TSLA240301C200');
  console.log('TSLA open options:', tslaOpen);
  // Expected: 0 (sold 1, expired 1)
  
  // Calculate open options grouped by symbol
  const openBySymbol = calculateOpenOptionsBySymbol(sampleTransactions);
  console.log('Open options by symbol:', openBySymbol);
  // Expected: { 'AAPL240119C150': 1, 'MSFT240215P300': 3, 'TSLA240301C200': 0 }
}

// Usage in React components:
/*
import { calculateOpenOptions } from '@/lib/utils';

function OptionsAnalysis() {
  const [transactions, setTransactions] = useState([]);
  
  // Calculate open options for display
  const totalOpenOptions = calculateOpenOptions(transactions);
  const openBySymbol = calculateOpenOptionsBySymbol(transactions);
  
  return (
    <div>
      <h2>Total Open Options: {totalOpenOptions}</h2>
      {Object.entries(openBySymbol).map(([symbol, count]) => (
        <div key={symbol}>
          {symbol}: {count} open contracts
        </div>
      ))}
    </div>
  );
}
*/
