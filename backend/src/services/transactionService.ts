import pool from '../database';
import { Transaction, UploadedTransaction } from '../types';

export class TransactionService {
  async uploadTransactions(csvData: UploadedTransaction[]): Promise<number> {
    const client = await pool.connect();
    let processedCount = 0;

    console.log('Starting to process', csvData.length, 'transactions');

    try {
      for (const row of csvData) {
        // console.log('Processing row:', row);
        
        // Skip empty rows or headers
        if (!row['Transaction Date'] || row['Transaction Date'] === 'TransactionDate') {
          console.log('Skipping empty/header row');
          continue;
        }

        const transaction: Transaction = {
          transactionDate: this.parseDate(row['Transaction Date']),
          transactionType: row['Transaction Type'],
          securityType: row['Security Type'],
          calculatedSymbol: row['Calculated Symbol'],
          symbol: row['Symbol'],
          quantity: parseInt(row['Quantity']) || 0,
          amount: parseFloat(row['Amount']) || 0,
          price: parseFloat(row['Price']) || 0,
          commission: parseFloat(row['Commission']) || 0,
          strike: parseFloat(row['Strike']) || 0,
          description: row['Description'],
        };

        // console.log('Parsed transaction:', transaction);

        // // Validate required fields before insert
        // console.log('=== VALIDATION CHECK ===');
        // console.log('transaction_date:', transaction.transactionDate, 'type:', typeof transaction.transactionDate);
        // console.log('transaction_type:', transaction.transactionType, 'type:', typeof transaction.transactionType);
        // console.log('security_type:', transaction.securityType, 'type:', typeof transaction.securityType);
        // console.log('calculated_symbol:', transaction.calculatedSymbol, 'type:', typeof transaction.calculatedSymbol);
        // console.log('quantity:', transaction.quantity, 'type:', typeof transaction.quantity);
        // console.log('amount:', transaction.amount, 'type:', typeof transaction.amount);
        // console.log('price:', transaction.price, 'type:', typeof transaction.price);
        // console.log('========================');

        // Insert transaction with individual transaction handling
        try {
          await client.query('BEGIN');
          
          const insertQuery = `
            INSERT INTO transactions (
              transaction_date, transaction_type, security_type, calculated_symbol,
              symbol, quantity, amount, price, commission, strike, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;

          const result = await client.query(insertQuery, [
            transaction.transactionDate,
            transaction.transactionType,
            transaction.securityType,
            transaction.calculatedSymbol,
            transaction.symbol,
            transaction.quantity,
            transaction.amount,
            transaction.price,
            transaction.commission,
            transaction.strike,
            transaction.description,
          ]);

          // console.log('Successfully inserted transaction:', transaction.calculatedSymbol, transaction.transactionType);
          processedCount++;
          
          // Update or create security
          await this.upsertSecurity(client, transaction);
          
          // Update positions
          await this.updatePositions(client, transaction);
          
          // Handle options
          await this.handleOptions(client, transaction);
          
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('=== TRANSACTION FAILED ===');
          console.error('Error processing transaction:', error);
          console.error('Failed transaction data:', transaction);
          console.error('Error details:', error instanceof Error ? error.message : error);
          console.error('SQL State:', error instanceof Error && 'code' in error ? (error as any).code : 'unknown');
          console.error('==========================');
          // Continue with next transaction instead of failing the entire batch
          continue;
        }
      }

      return processedCount;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  private async upsertSecurity(client: any, transaction: Transaction): Promise<void> {
    const query = `
      INSERT INTO securities (symbol, security_type)
      VALUES ($1, $2)
      ON CONFLICT (symbol) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    await client.query(query, [
      transaction.calculatedSymbol,
      transaction.securityType === 'EQ' ? 'STOCK' : transaction.securityType,
    ]);
  }

  private async updatePositions(client: any, transaction: Transaction): Promise<void> {
    if (transaction.securityType !== 'EQ') return;

    const symbol = transaction.calculatedSymbol;
    const quantity = transaction.quantity; // This already has the correct sign from CSV
    const amount = Math.abs(transaction.amount);
    const price = transaction.price;

    console.log(`Updating position for ${symbol}: quantity=${quantity}, amount=${amount}, price=${price}`);

    // Get current position
    const positionQuery = 'SELECT * FROM positions WHERE symbol = $1';
    const positionResult = await client.query(positionQuery, [symbol]);

    if (positionResult.rows.length === 0) {
      // Create new position - only if we're buying (positive quantity)
      if (quantity > 0) {
        const insertQuery = `
          INSERT INTO positions (symbol, quantity, average_cost, total_invested)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertQuery, [symbol, quantity, price, amount]);
        console.log(`Created new position: ${symbol} qty=${quantity}`);
      } else {
        // Selling without existing position - this might be a short sale
        // For now, we'll create a negative position
        const insertQuery = `
          INSERT INTO positions (symbol, quantity, average_cost, total_invested)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertQuery, [symbol, quantity, price, -amount]);
        console.log(`Created new short position: ${symbol} qty=${quantity}`);
      }
    } else {
      // Update existing position
      const position = positionResult.rows[0];
      const currentQuantity = parseFloat(position.quantity);
      const currentTotalInvested = parseFloat(position.total_invested);
      const currentAverageCost = parseFloat(position.average_cost);

      let newQuantity = currentQuantity + quantity;
      let newTotalInvested;
      let newAverageCost;

      if (quantity > 0) {
        // Buying more shares
        newTotalInvested = currentTotalInvested + amount;
        if (newQuantity > 0) {
          newAverageCost = newTotalInvested / newQuantity;
        } else {
          newAverageCost = price;
        }
      } else {
        // Selling shares
        if (newQuantity > 0) {
          // Still have shares left
          newTotalInvested = newQuantity * currentAverageCost;
          newAverageCost = currentAverageCost;
        } else if (newQuantity === 0) {
          // Closed position
          newTotalInvested = 0;
          newAverageCost = 0;
        } else {
          // Now short
          newTotalInvested = newQuantity * price;
          newAverageCost = price;
        }
      }

      console.log(`Updating position: ${symbol} from qty=${currentQuantity} to qty=${newQuantity}`);

      const updateQuery = `
        UPDATE positions 
        SET quantity = $1, average_cost = $2, total_invested = $3, last_updated = CURRENT_TIMESTAMP
        WHERE symbol = $4
      `;
      await client.query(updateQuery, [newQuantity, newAverageCost, newTotalInvested, symbol]);
    }
  }

  private async handleOptions(client: any, transaction: Transaction): Promise<void> {
    if (transaction.securityType !== 'OPTN') return;

    const optionType = this.parseOptionType(transaction.symbol);
    const underlyingSymbol = transaction.calculatedSymbol;
    const expirationDate = this.parseOptionExpiration(transaction.symbol);

    // Check if option exists
    const optionQuery = `
      SELECT * FROM options 
      WHERE underlying_symbol = $1 AND strike_price = $2 AND expiration_date = $3 AND option_type = $4
    `;
    const optionResult = await client.query(optionQuery, [
      underlyingSymbol,
      transaction.strike,
      expirationDate,
      optionType,
    ]);

    const amount = transaction.amount;
    const quantity = transaction.quantity;

    if (optionResult.rows.length === 0) {
      // Create new option
      const premiumCollected = transaction.transactionType === 'Sold Short' ? amount : 0;
      const premiumPaid = transaction.transactionType === 'Bought To Cover' ? Math.abs(amount) : 0;

      const insertQuery = `
        INSERT INTO options (
          underlying_symbol, option_symbol, option_type, strike_price, expiration_date,
          quantity, premium_collected, premium_paid, net_premium, opened_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await client.query(insertQuery, [
        underlyingSymbol,
        transaction.symbol,
        optionType,
        transaction.strike,
        expirationDate,
        quantity,
        premiumCollected,
        premiumPaid,
        premiumCollected - premiumPaid,
        transaction.transactionDate,
      ]);
    } else {
      // Update existing option
      const option = optionResult.rows[0];
      let newQuantity = parseFloat(option.quantity) || 0;
      let newPremiumCollected = parseFloat(option.premium_collected) || 0;
      let newPremiumPaid = parseFloat(option.premium_paid) || 0;
      let status = option.status;

      if (transaction.transactionType === 'Sold Short') {
        newQuantity += quantity;
        newPremiumCollected += amount;
      } else if (transaction.transactionType === 'Bought To Cover') {
        newQuantity -= quantity;
        newPremiumPaid += Math.abs(amount);
        if (newQuantity <= 0) {
          status = 'CLOSED';
        }
      } else if (transaction.transactionType === 'Option Assigned') {
        status = 'ASSIGNED';
      }

      const updateQuery = `
        UPDATE options 
        SET quantity = $1, premium_collected = $2, premium_paid = $3, 
            net_premium = $4, status = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `;
      await client.query(updateQuery, [
        newQuantity,
        newPremiumCollected,
        newPremiumPaid,
        newPremiumCollected - newPremiumPaid,
        status,
        option.id,
      ]);
    }
  }

  private parseDate(dateStr: string): string {
    // console.log('Parsing date:', dateStr);
    
    if (!dateStr || dateStr.trim() === '') {
      console.log('Empty date string, using current date');
      return new Date().toISOString().split('T')[0];
    }
    
    try {
      // Try different date formats
      let parsedDate: Date;
      
      if (dateStr.includes('/')) {
        // Handle MM/DD/YYYY or DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [first, second, third] = parts;
          // Assume MM/DD/YYYY if first part is <= 12, otherwise DD/MM/YYYY
          if (parseInt(first) <= 12) {
            parsedDate = new Date(parseInt(third), parseInt(first) - 1, parseInt(second));
          } else {
            parsedDate = new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
          }
        } else {
          throw new Error('Invalid date format');
        }
      } else if (dateStr.includes('-')) {
        // Handle YYYY-MM-DD format
        parsedDate = new Date(dateStr);
      } else {
        // Try parsing as-is
        parsedDate = new Date(dateStr);
      }
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
      
      const result = parsedDate.toISOString().split('T')[0];
      // console.log('Parsed date result:', result);
      return result;
    } catch (error) {
      console.error('Date parsing error:', error, 'for input:', dateStr);
      return new Date().toISOString().split('T')[0];
    }
  }

  private parseOptionType(symbol: string): 'CALL' | 'PUT' {
    return symbol.toUpperCase().includes('CALL') ? 'CALL' : 'PUT';
  }

  private parseOptionExpiration(symbol: string): string {
    // Extract expiration date from option symbol
    // Format: SYMBOL MMM DD 'YY or similar
    const match = symbol.match(/(\w{3})\s+(\d{1,2})\s+'(\d{2})/);
    if (match) {
      const [, monthStr, day, year] = match;
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthMap[monthStr] || '01';
      return `20${year}-${month}-${day.padStart(2, '0')}`;
    }
    
    // Fallback: try to extract from description or use current date
    return new Date().toISOString().split('T')[0];
  }

  async recalculatePositionsFromTransactions(): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing positions
      await client.query('DELETE FROM positions');
      
      // Get all transactions ordered by date
      const transactionsQuery = `
        SELECT * FROM transactions 
        WHERE security_type = 'EQ'
        ORDER BY transaction_date ASC, id ASC
      `;
      const result = await client.query(transactionsQuery);
      
      console.log(`Recalculating positions from ${result.rows.length} transactions`);
      
      for (const row of result.rows) {
        const transaction = {
          transactionDate: row.transaction_date,
          transactionType: row.transaction_type,
          securityType: row.security_type,
          calculatedSymbol: row.calculated_symbol,
          symbol: row.symbol,
          quantity: row.quantity,
          amount: row.amount,
          price: row.price,
          commission: row.commission,
          strike: row.strike,
          description: row.description,
        };
        
        await this.updatePositions(client, transaction);
      }
      
      await client.query('COMMIT');
      console.log('Position recalculation completed');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      ORDER BY transaction_date DESC, id DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getTransactionsBySymbol(symbol: string): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE calculated_symbol = $1
      ORDER BY transaction_date DESC
    `;
    const result = await pool.query(query, [symbol]);
    return result.rows;
  }

  async createTransaction(transactionData: Partial<Transaction>): Promise<Transaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate required fields
      if (!transactionData.transactionDate || !transactionData.transactionType || 
          !transactionData.calculatedSymbol || !transactionData.quantity || !transactionData.price) {
        throw new Error('Missing required fields: transactionDate, transactionType, calculatedSymbol, quantity, price');
      }

      const transaction: Transaction = {
        transactionDate: transactionData.transactionDate!,
        transactionType: transactionData.transactionType!,
        securityType: transactionData.securityType || 'EQ',
        calculatedSymbol: transactionData.calculatedSymbol!,
        symbol: transactionData.symbol || transactionData.calculatedSymbol!,
        quantity: transactionData.quantity!,
        amount: transactionData.amount || (transactionData.quantity! * transactionData.price!),
        price: transactionData.price!,
        commission: transactionData.commission || 0,
        strike: transactionData.strike || 0,
        description: transactionData.description || `Manual entry: ${transactionData.transactionType} ${transactionData.quantity} ${transactionData.calculatedSymbol}`,
      };

      const insertQuery = `
        INSERT INTO transactions (
          transaction_date, transaction_type, security_type, calculated_symbol,
          symbol, quantity, amount, price, commission, strike, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        transaction.transactionDate,
        transaction.transactionType,
        transaction.securityType,
        transaction.calculatedSymbol,
        transaction.symbol,
        transaction.quantity,
        transaction.amount,
        transaction.price,
        transaction.commission,
        transaction.strike,
        transaction.description,
      ]);

      const createdTransaction = result.rows[0];
      
      // Update or create security
      await this.upsertSecurity(client, transaction);
      
      // Update positions
      await this.updatePositions(client, transaction);
      
      // Handle options
      await this.handleOptions(client, transaction);
      
      await client.query('COMMIT');
      return createdTransaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the original transaction first
      const originalQuery = 'SELECT * FROM transactions WHERE id = $1';
      const originalResult = await client.query(originalQuery, [id]);
      
      if (originalResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }
      
      const originalTransaction = originalResult.rows[0];
      
      // Validate required fields
      if (!transactionData.transactionDate || !transactionData.transactionType || 
          !transactionData.calculatedSymbol || !transactionData.quantity || !transactionData.price) {
        throw new Error('Missing required fields: transactionDate, transactionType, calculatedSymbol, quantity, price');
      }

      const updatedTransaction: Transaction = {
        transactionDate: transactionData.transactionDate!,
        transactionType: transactionData.transactionType!,
        securityType: transactionData.securityType || 'EQ',
        calculatedSymbol: transactionData.calculatedSymbol!,
        symbol: transactionData.symbol || transactionData.calculatedSymbol!,
        quantity: transactionData.quantity!,
        amount: transactionData.amount || (transactionData.quantity! * transactionData.price!),
        price: transactionData.price!,
        commission: transactionData.commission || 0,
        strike: transactionData.strike || 0,
        description: transactionData.description || `Updated: ${transactionData.transactionType} ${transactionData.quantity} ${transactionData.calculatedSymbol}`,
      };

      const updateQuery = `
        UPDATE transactions SET
          transaction_date = $1, transaction_type = $2, security_type = $3, calculated_symbol = $4,
          symbol = $5, quantity = $6, amount = $7, price = $8, commission = $9, strike = $10, description = $11
        WHERE id = $12
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        updatedTransaction.transactionDate,
        updatedTransaction.transactionType,
        updatedTransaction.securityType,
        updatedTransaction.calculatedSymbol,
        updatedTransaction.symbol,
        updatedTransaction.quantity,
        updatedTransaction.amount,
        updatedTransaction.price,
        updatedTransaction.commission,
        updatedTransaction.strike,
        updatedTransaction.description,
        id,
      ]);

      const transaction = result.rows[0];
      
      // Reverse the original transaction's effects and apply the new ones
      await this.reverseTransactionEffects(client, originalTransaction);
      
      // Apply the updated transaction effects
      await this.upsertSecurity(client, updatedTransaction);
      await this.updatePositions(client, updatedTransaction);
      await this.handleOptions(client, updatedTransaction);
      
      await client.query('COMMIT');
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTransaction(id: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the transaction to delete
      const getQuery = 'SELECT * FROM transactions WHERE id = $1';
      const getResult = await client.query(getQuery, [id]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }
      
      const transaction = getResult.rows[0];
      
      // Reverse the transaction's effects
      await this.reverseTransactionEffects(client, transaction);
      
      // Delete the transaction
      const deleteQuery = 'DELETE FROM transactions WHERE id = $1';
      await client.query(deleteQuery, [id]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async reverseTransactionEffects(client: any, transaction: any): Promise<void> {
    // Reverse position effects for stock transactions
    if (transaction.security_type === 'EQ') {
      const symbol = transaction.calculated_symbol;
      const quantity = -transaction.quantity; // Reverse the quantity
      const amount = Math.abs(transaction.amount);
      const price = transaction.price;

      console.log(`Reversing position effects for ${symbol}: quantity=${quantity}, amount=${amount}, price=${price}`);

      // Get current position
      const positionQuery = 'SELECT * FROM positions WHERE symbol = $1';
      const positionResult = await client.query(positionQuery, [symbol]);

      if (positionResult.rows.length > 0) {
        const currentPosition = positionResult.rows[0];
        const newQuantity = currentPosition.quantity + quantity;
        
        if (newQuantity === 0) {
          // Delete position if quantity becomes zero
          const deleteQuery = 'DELETE FROM positions WHERE symbol = $1';
          await client.query(deleteQuery, [symbol]);
          console.log(`Deleted position: ${symbol}`);
        } else {
          // Recalculate average cost and total invested
          const newTotalInvested = Math.max(0, currentPosition.total_invested - (quantity > 0 ? amount : -amount));
          const newAverageCost = newQuantity !== 0 ? newTotalInvested / Math.abs(newQuantity) : 0;
          
          const updateQuery = `
            UPDATE positions SET
              quantity = $1, average_cost = $2, total_invested = $3
            WHERE symbol = $4
          `;
          await client.query(updateQuery, [newQuantity, newAverageCost, newTotalInvested, symbol]);
          console.log(`Updated position: ${symbol} qty=${newQuantity}, avg_cost=${newAverageCost}`);
        }
      }
    }
    
    // Note: You may need to add similar logic for options reversals
    // depending on how options are handled in your system
  }
}
