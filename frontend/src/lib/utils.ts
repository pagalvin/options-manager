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
  // optional fields to improve detection
  security_type?: string;
  symbol?: string;
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
    const type = (transaction.transaction_type || '').toUpperCase();
    // const description = (transaction.description || '').toUpperCase();
    const secType = ((transaction as any).security_type || '').toUpperCase();
    // const rawSymbol = ((transaction as any).symbol || transaction.calculated_symbol || '').toUpperCase();

    // Heuristic: does this look like an option transaction?
    const isOptionTransaction = (
      secType === 'OPTN'
      //  ||
      // type.includes('OPTION') ||
      // type.includes('CALL') ||
      // type.includes('PUT') ||
      // description.includes('OPTION') ||
      // description.includes('CALL') ||
      // description.includes('PUT') ||
      // /[CP]/.test(rawSymbol) && /\d{6}/.test(rawSymbol)
    );

    if (!isOptionTransaction) return;

    if (secType === 'OPTN') {
      // Use transaction type to determine the correct operation, not quantity sign
      // Fixed: SOUN contract calculation bug - use transaction type not quantity sign
      if (type === 'SOLD SHORT' || type === 'SOLD') {
        totalOptionContracts += Math.abs(quantity);
        return;
      }
      if (type === 'BOUGHT TO COVER' || type === 'BOUGHT' || type === 'OPTION ASSIGNED' || type === 'OPTION EXPIRED') {
        totalOptionContracts -= Math.abs(quantity);
        return;
      }

      // If quantity is 0 or missing, fall back to type/description heuristics
      const isAssigned = type.includes('ASSIGN');
      const isExpired = type.includes('EXPIRE');

      if (isAssigned || isExpired) {
        totalOptionContracts -= 1; // best-effort decrement
      }
      return;
    }

    // Fallback rules when security_type is not available
    if (type.startsWith('SOLD')) {
      totalOptionContracts += Math.abs(quantity);
    } else if (
      type.startsWith('BOUGHT') ||
      type === 'BOUGHT TO COVER' ||
      type === 'OPTION ASSIGNED' ||
      type === 'OPTION EXPIRED'
    ) {
      totalOptionContracts -= Math.abs(quantity);
    }
  });

  // Ensure we never return negative values (can't have negative open contracts)
  const result = Math.max(0, totalOptionContracts);
  
  return result;
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
