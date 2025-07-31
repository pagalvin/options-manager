import { type ClassValue, clsx } from "clsx"
import type { Transaction } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ====================================================================
// OPTIONS CALCULATION UTILITIES
// ====================================================================

/**
 * Interface for transaction data used in open options calculation
 * Uses a subset of Transaction properties needed for the calculation
 */
interface OptionsTransaction {
  calculated_symbol: string;
  transaction_type: string;
  description: string;
  quantity: number | string;
}

/**
 * Calculates the total number of open options for a given symbol
 * @param transactions - Array of transactions to analyze (can be full Transaction objects or minimal OptionsTransaction objects)
 * @param targetSymbol - Optional symbol to filter by. If not provided, calculates for all symbols
 * @returns The total number of open option contracts
 * 
 * @example
 * // Calculate open options for all symbols
 * const totalOpen = calculateOpenOptions(transactions);
 * 
 * @example
 * // Calculate open options for a specific symbol
 * const aaplOpen = calculateOpenOptions(transactions, 'AAPL');
 */
export function calculateOpenOptions(
  transactions: (Transaction | OptionsTransaction)[], 
  targetSymbol?: string
): number {
  let totalOptionContracts = 0;

  // Filter transactions by symbol if targetSymbol is provided
  const filteredTransactions = targetSymbol 
    ? transactions.filter(t => t.calculated_symbol === targetSymbol)
    : transactions;

  filteredTransactions.forEach(transaction => {
    const quantity = parseFloat(String(transaction.quantity || '0'));
    
    // Only count if this looks like an options transaction
    const type = (transaction.transaction_type || '').toUpperCase();
    const description = (transaction.description || '').toUpperCase();
    const symbol = (transaction.calculated_symbol || '').toUpperCase();
    
    const isOptionTransaction = (
      type.includes('OPTION') ||
      type.includes('CALL') ||
      type.includes('PUT') ||
      description.includes('OPTION') ||
      description.includes('CALL') ||
      description.includes('PUT') ||
      symbol.includes('C') && /\d{6}/.test(symbol) ||
      symbol.includes('P') && /\d{6}/.test(symbol) ||
      /[A-Z]+\d{6}[CP]\d+/.test(symbol) ||
      // Common option transaction types
      transaction.transaction_type === 'Sold Short' ||
      transaction.transaction_type === 'Bought To Cover' ||
      transaction.transaction_type === 'Option Assigned' ||
      transaction.transaction_type === 'Option Expired'
    );

    if (isOptionTransaction) {
      // Add contracts for opening positions (selling options)
      if (transaction.transaction_type === 'Sold Short') {
        totalOptionContracts += Math.abs(quantity);
      } 
      // Subtract contracts for closing positions
      else if (['Bought To Cover', 'Option Assigned', 'Option Expired'].includes(transaction.transaction_type)) {
        totalOptionContracts -= Math.abs(quantity);
      }
    }
  });

  // Ensure we never return negative values (can't have negative open contracts)
  return Math.max(0, totalOptionContracts);
}

/**
 * Calculates open options grouped by symbol
 * @param transactions - Array of transactions to analyze (can be full Transaction objects or minimal OptionsTransaction objects)
 * @returns Object with symbols as keys and open contract counts as values
 * 
 * @example
 * // Get open options count for each symbol
 * const openBySymbol = calculateOpenOptionsBySymbol(transactions);
 * // Returns: { 'AAPL': 5, 'MSFT': 2, 'TSLA': 0 }
 */
export function calculateOpenOptionsBySymbol(
  transactions: (Transaction | OptionsTransaction)[]
): Record<string, number> {
  const openOptionsBySymbol: Record<string, number> = {};
  
  // Get unique symbols from transactions
  const symbols = Array.from(new Set(
    transactions.map(t => t.calculated_symbol).filter(Boolean)
  ));
  
  // Calculate open options for each symbol
  symbols.forEach(symbol => {
    openOptionsBySymbol[symbol] = calculateOpenOptions(transactions, symbol);
  });
  
  return openOptionsBySymbol;
}
