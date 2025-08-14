import pool from '../database';
import { v4 as uuidv4 } from 'uuid';

interface Transaction {
  id: number;
  transaction_date: string;
  transaction_type: string;
  security_type: string;
  calculated_symbol: string;
  symbol: string;
  quantity: number;
  amount: number;
  price: number;
  commission: number;
  strike: number;
  description: string;
  transaction_chain_id?: string;
  transaction_chain_close_date?: string;
}

interface EquityLot {
  chainId: string;
  remainingQty: number;
  openDate: string;
  transactionIds: number[];
}

interface OptionSeriesLot {
  chainId: string;
  remainingQty: number;
  openDate: string;
  transactionIds: number[];
  underlying: string;
  optionType: string;
  strike: number;
  expiration: string;
}

interface ChainProcessingStats {
  totalTransactions: number;
  equityChains: number;
  optionChains: number;
  unmatchedCloses: number;
  splitTransactions: number;
}

export class TransactionChainService {
  private longEquityLedger: Map<string, EquityLot[]> = new Map();
  private shortEquityLedger: Map<string, EquityLot[]> = new Map();
  private optionLedger: Map<string, OptionSeriesLot[]> = new Map();
  private chains: Map<string, { transactions: Set<number>; closeDate?: string }> = new Map();

  /**
   * Process all transactions to create transaction chains
   */
  async processTransactionChains(): Promise<ChainProcessingStats> {
    console.log('Starting transaction chain processing...');
    
    // Clear existing chain data
    await this.clearExistingChains();
    
    // Get all transactions sorted chronologically
    const transactions = await this.getAllTransactionsSorted();
    console.log(`Processing ${transactions.length} transactions...`);
    
    const stats: ChainProcessingStats = {
      totalTransactions: transactions.length,
      equityChains: 0,
      optionChains: 0,
      unmatchedCloses: 0,
      splitTransactions: 0
    };
    
    // Process each transaction
    for (const transaction of transactions) {
      await this.processTransaction(transaction, stats);
    }
    
    // Handle option expirations
    await this.handleOptionExpirations();
    
    // Update database with chain assignments
    await this.updateTransactionsWithChains();
    
    console.log('Transaction chain processing completed:', stats);
    return stats;
  }

  private async clearExistingChains(): Promise<void> {
    await pool.query(
      'UPDATE overlord.transactions SET transaction_chain_id = NULL, transaction_chain_close_date = NULL'
    );
    this.longEquityLedger.clear();
    this.shortEquityLedger.clear();
    this.optionLedger.clear();
    this.chains.clear();
  }

  private async getAllTransactionsSorted(): Promise<Transaction[]> {
    const result = await pool.query(`
      SELECT * FROM overlord.transactions 
      WHERE security_type IN ('EQ', 'OPTN')
      ORDER BY transaction_date ASC, id ASC
    `);
    return result.rows;
  }

  private async processTransaction(transaction: Transaction, stats: ChainProcessingStats): Promise<void> {
    const { security_type, calculated_symbol } = transaction;
    
    if (security_type === 'EQ') {
      await this.processEquityTransaction(transaction, stats);
    } else if (security_type === 'OPTN') {
      await this.processOptionTransaction(transaction, stats);
    }
  }

  private async processEquityTransaction(transaction: Transaction, stats: ChainProcessingStats): Promise<void> {
    const { calculated_symbol, transaction_type, quantity, transaction_date, id } = transaction;
    const absQuantity = Math.abs(quantity);
    
    const isLongOpening = transaction_type === 'Bought';
    const isLongClosing = ['Sold', 'Option Assigned'].includes(transaction_type);
    const isShortOpening = transaction_type === 'Sold Short';
    const isShortClosing = transaction_type === 'Bought To Cover';
    
    if (isLongOpening) {
      await this.processLongEquityOpen(calculated_symbol, absQuantity, transaction_date, id, stats);
    } else if (isLongClosing) {
      await this.processLongEquityClose(calculated_symbol, absQuantity, transaction_date, id, stats);
    } else if (isShortOpening) {
      await this.processShortEquityOpen(calculated_symbol, absQuantity, transaction_date, id, stats);
    } else if (isShortClosing) {
      await this.processShortEquityClose(calculated_symbol, absQuantity, transaction_date, id, stats);
    }
  }

  private async processLongEquityOpen(symbol: string, quantity: number, date: string, transactionId: number, stats: ChainProcessingStats): Promise<void> {
    if (!this.longEquityLedger.has(symbol)) {
      this.longEquityLedger.set(symbol, []);
    }
    
    const lots = this.longEquityLedger.get(symbol)!;
    const chainId = uuidv4();
    
    const newLot: EquityLot = {
      chainId,
      remainingQty: quantity,
      openDate: date,
      transactionIds: [transactionId]
    };
    
    lots.push(newLot);
    
    if (!this.chains.has(chainId)) {
      this.chains.set(chainId, { transactions: new Set([transactionId]) });
      stats.equityChains++;
    }
  }

  private async processLongEquityClose(symbol: string, quantity: number, date: string, transactionId: number, stats: ChainProcessingStats): Promise<void> {
    if (!this.longEquityLedger.has(symbol)) {
      stats.unmatchedCloses++;
      return;
    }
    
    const lots = this.longEquityLedger.get(symbol)!;
    let remainingToClose = quantity;
    const matchedChains = new Set<string>();
    
    for (const lot of lots) {
      if (remainingToClose <= 0) break;
      if (lot.remainingQty <= 0) continue; // Skip closed lots but continue looking
      
      const closeQuantity = Math.min(lot.remainingQty, remainingToClose);
      lot.remainingQty -= closeQuantity;
      remainingToClose -= closeQuantity;
      
      matchedChains.add(lot.chainId);
      
      const chain = this.chains.get(lot.chainId);
      if (chain) {
        chain.transactions.add(transactionId);
        
        if (lot.remainingQty === 0) {
          chain.closeDate = date;
        }
      }
    }
    
    if (remainingToClose > 0) {
      stats.unmatchedCloses++;
    }
    
    if (matchedChains.size > 1) {
      stats.splitTransactions++;
    }
  }

  private async processShortEquityOpen(symbol: string, quantity: number, date: string, transactionId: number, stats: ChainProcessingStats): Promise<void> {
    if (!this.shortEquityLedger.has(symbol)) {
      this.shortEquityLedger.set(symbol, []);
    }
    
    const lots = this.shortEquityLedger.get(symbol)!;
    const chainId = uuidv4();
    
    const newLot: EquityLot = {
      chainId,
      remainingQty: quantity,
      openDate: date,
      transactionIds: [transactionId]
    };
    
    lots.push(newLot);
    
    if (!this.chains.has(chainId)) {
      this.chains.set(chainId, { transactions: new Set([transactionId]) });
      stats.equityChains++;
    }
  }

  private async processShortEquityClose(symbol: string, quantity: number, date: string, transactionId: number, stats: ChainProcessingStats): Promise<void> {
    if (!this.shortEquityLedger.has(symbol)) {
      stats.unmatchedCloses++;
      return;
    }
    
    const lots = this.shortEquityLedger.get(symbol)!;
    let remainingToClose = quantity;
    const matchedChains = new Set<string>();
    
    for (const lot of lots) {
      if (remainingToClose <= 0 || lot.remainingQty <= 0) break;
      
      const closeQuantity = Math.min(lot.remainingQty, remainingToClose);
      lot.remainingQty -= closeQuantity;
      remainingToClose -= closeQuantity;
      
      matchedChains.add(lot.chainId);
      
      const chain = this.chains.get(lot.chainId);
      if (chain) {
        chain.transactions.add(transactionId);
        
        if (lot.remainingQty === 0) {
          chain.closeDate = date;
        }
      }
    }
    
    if (remainingToClose > 0) {
      stats.unmatchedCloses++;
    }
    
    if (matchedChains.size > 1) {
      stats.splitTransactions++;
    }
  }

  private async processOptionTransaction(transaction: Transaction, stats: ChainProcessingStats): Promise<void> {
    const { calculated_symbol, transaction_type, quantity, transaction_date, id, description } = transaction;
    const absQuantity = Math.abs(quantity);
    
    // Parse option details from description
    const optionDetails = this.parseOptionDetails(description);
    if (!optionDetails) {
      console.warn(`Could not parse option details for transaction ${id}: ${description}`);
      return;
    }
    
    const seriesKey = `${calculated_symbol}_${optionDetails.type}_${optionDetails.strike}_${optionDetails.expiration}`;
    const isOpening = this.isOptionOpening(transaction_type);
    const isClosing = this.isOptionClosing(transaction_type);
    
    if (!this.optionLedger.has(seriesKey)) {
      this.optionLedger.set(seriesKey, []);
    }
    
    const seriesLots = this.optionLedger.get(seriesKey)!;
    
    if (isOpening) {
      // Check for rolls (close then open on same underlying)
      const existingChainId = this.detectRoll(calculated_symbol, transaction_date, seriesLots);
      
      const chainId = existingChainId || uuidv4();
      const newLot: OptionSeriesLot = {
        chainId,
        remainingQty: absQuantity,
        openDate: transaction_date,
        transactionIds: [id],
        underlying: calculated_symbol,
        optionType: optionDetails.type,
        strike: optionDetails.strike,
        expiration: optionDetails.expiration
      };
      seriesLots.push(newLot);
      
      if (!this.chains.has(chainId)) {
        this.chains.set(chainId, { transactions: new Set([id]) });
        stats.optionChains++;
      } else {
        this.chains.get(chainId)!.transactions.add(id);
      }
    } else if (isClosing) {
      // Match against existing series lots (FIFO)
      let remainingToClose = absQuantity;
      const matchedChains = new Set<string>();
      
      for (const lot of seriesLots) {
        if (remainingToClose <= 0 || lot.remainingQty <= 0) break;
        
        const closeQuantity = Math.min(lot.remainingQty, remainingToClose);
        lot.remainingQty -= closeQuantity;
        remainingToClose -= closeQuantity;
        
        matchedChains.add(lot.chainId);
        
        // Add transaction to chain
        const chain = this.chains.get(lot.chainId);
        if (chain) {
          chain.transactions.add(id);
          
          // If series lot is fully closed, mark chain as closed
          if (lot.remainingQty === 0) {
            chain.closeDate = transaction_date;
          }
        }
      }
      
      // Handle unmatched closes
      if (remainingToClose > 0) {
        stats.unmatchedCloses++;
      }
      
      // Handle split transactions
      if (matchedChains.size > 1) {
        stats.splitTransactions++;
      } else if (matchedChains.size === 1) {
        transaction.transaction_chain_id = Array.from(matchedChains)[0];
      }
    }
  }

  private parseOptionDetails(description: string): { type: string; strike: number; expiration: string } | null {
    // Handle old format: "CIFR Aug 29 '25 $4 Call"
    const oldCallMatch = description.match(/([A-Z]+)\s+(\w+\s+\d+\s+'\d+)\s+\$?([\d.]+)\s+Call/i);
    const oldPutMatch = description.match(/([A-Z]+)\s+(\w+\s+\d+\s+'\d+)\s+\$?([\d.]+)\s+Put/i);
    
    // Handle new format: "CALL CIFR   08/29/25     5.500 CALL CIPHER MINING INC..."
    const newCallMatch = description.match(/CALL\s+([A-Z]+)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.]+)/i);
    const newPutMatch = description.match(/PUT\s+([A-Z]+)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.]+)/i);
    
    let symbol: string, dateStr: string, strikeStr: string, type: string;
    
    if (oldCallMatch || oldPutMatch) {
      const match = oldCallMatch || oldPutMatch;
      [, symbol, dateStr, strikeStr] = match!;
      type = oldCallMatch ? 'CALL' : 'PUT';
    } else if (newCallMatch || newPutMatch) {
      const match = newCallMatch || newPutMatch;
      [, symbol, dateStr, strikeStr] = match!;
      type = newCallMatch ? 'CALL' : 'PUT';
    } else {
      return null;
    }
    
    const strike = parseFloat(strikeStr);
    
    // Convert date string to ISO format
    let expiration: string | null;
    if (dateStr.includes('/')) {
      // New format: "08/29/25" -> "2025-08-29"
      expiration = this.parseNewFormatDate(dateStr);
    } else {
      // Old format: "Aug 29 '25" -> "2025-08-29"
      expiration = this.parseExpirationDate(dateStr);
    }
    
    if (!expiration) return null;
    
    return { type, strike, expiration };
  }

  private parseNewFormatDate(dateStr: string): string | null {
    // Convert "08/29/25" to "2025-08-29"
    try {
      const [month, day, year] = dateStr.split('/');
      const fullYear = `20${year}`;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
      console.error('Error parsing new format date:', dateStr, error);
      return null;
    }
  }

  private parseExpirationDate(dateStr: string): string | null {
    try {
      // Handle formats like "Mar 07 '25" or "Mar 21 '25"
      const parts = dateStr.trim().split(/\s+/);
      if (parts.length !== 3) return null;
      
      const [monthStr, dayStr, yearStr] = parts;
      const year = 2000 + parseInt(yearStr.replace("'", ""));
      const day = parseInt(dayStr);
      
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthIndex = monthMap[monthStr];
      if (monthIndex === undefined) return null;
      
      const date = new Date(year, monthIndex, day);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing expiration date:', dateStr, error);
      return null;
    }
  }

  private detectRoll(underlying: string, currentDate: string, seriesLots: OptionSeriesLot[]): string | null {
    // Look for a recently closed chain on the same underlying (within same day for simplicity)
    const currentDateObj = new Date(currentDate);
    
    for (const lot of seriesLots) {
      if (lot.remainingQty === 0) { // Recently closed
        const chain = this.chains.get(lot.chainId);
        if (chain && chain.closeDate) {
          const closeDateObj = new Date(chain.closeDate);
          const timeDiff = currentDateObj.getTime() - closeDateObj.getTime();
          const daysDiff = timeDiff / (1000 * 3600 * 24);
          
          // If closed within same day, consider it a roll
          if (daysDiff <= 1) {
            return lot.chainId;
          }
        }
      }
    }
    
    return null;
  }

  private async handleOptionExpirations(): Promise<void> {
    // Find open option series that have reached expiration
    const today = new Date().toISOString().split('T')[0];
    
    for (const [seriesKey, lots] of this.optionLedger) {
      for (const lot of lots) {
        if (lot.remainingQty > 0 && lot.expiration <= today) {
          // Mark as expired
          const chain = this.chains.get(lot.chainId);
          if (chain && !chain.closeDate) {
            chain.closeDate = lot.expiration;
          }
          lot.remainingQty = 0;
        }
      }
    }
  }

  private async updateTransactionsWithChains(): Promise<void> {
    console.log('Updating transactions with chain assignments...');
    
    // Prepare batch updates
    const updates: Array<{ id: number; chainId: string; closeDate?: string }> = [];
    
    for (const [chainId, chain] of this.chains) {
      for (const transactionId of chain.transactions) {
        updates.push({
          id: transactionId,
          chainId,
          closeDate: chain.closeDate
        });
      }
    }
    
    // Execute batch update
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const update of updates) {
        await client.query(
          `UPDATE overlord.transactions 
           SET transaction_chain_id = $1, transaction_chain_close_date = $2 
           WHERE id = $3`,
          [update.chainId, update.closeDate || null, update.id]
        );
      }
      
      await client.query('COMMIT');
      console.log(`Updated ${updates.length} transaction chain assignments`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating transaction chains:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private isOptionOpening(transactionType: string): boolean {
    // For options: "Sold" typically means selling to open a position (like selling a covered call)
    // "Sold Short" is also an opening transaction
    // "Bought" means buying to open a position
    return ['Sold Short', 'Bought', 'Sold'].includes(transactionType);
  }

  private isOptionClosing(transactionType: string): boolean {
    // Only these are true closing transactions for options
    return ['Bought To Cover', 'Option Expired', 'Option Assigned'].includes(transactionType);
  }

  /**
   * Get transaction chain statistics
   */
  async getChainStatistics(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(transaction_chain_id) as chained_transactions,
        COUNT(DISTINCT transaction_chain_id) as total_chains,
        COUNT(CASE WHEN transaction_chain_close_date IS NOT NULL THEN 1 END) as closed_chain_transactions,
        COUNT(CASE WHEN security_type = 'EQ' AND transaction_chain_id IS NOT NULL THEN 1 END) as equity_chain_transactions,
        COUNT(CASE WHEN security_type = 'OPTN' AND transaction_chain_id IS NOT NULL THEN 1 END) as option_chain_transactions
      FROM overlord.transactions 
      WHERE security_type IN ('EQ', 'OPTN')
    `);
    
    return result.rows[0];
  }

  /**
   * Get chains for a specific symbol
   */
  async getChainsForSymbol(symbol: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        transaction_chain_id,
        security_type,
        MIN(transaction_date) as chain_start_date,
        MAX(transaction_date) as chain_end_date,
        transaction_chain_close_date,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM overlord.transactions 
      WHERE calculated_symbol = $1 AND transaction_chain_id IS NOT NULL
      GROUP BY transaction_chain_id, security_type, transaction_chain_close_date
      ORDER BY chain_start_date DESC
    `, [symbol]);
    
    return result.rows;
  }
}

export const transactionChainService = new TransactionChainService();
