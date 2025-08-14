import express from 'express';
import { transactionChainService } from '../services/transactionChainService';
import pool from '../database';

const router = express.Router();

/**
 * POST /api/admin/process-chains
 * Process all transactions to create transaction chains
 */
router.post('/process-chains', async (req, res) => {
  try {
    console.log('Starting transaction chain processing...');
    const stats = await transactionChainService.processTransactionChains();
    
    res.json({
      success: true,
      message: 'Transaction chains processed successfully',
      stats
    });
  } catch (error) {
    console.error('Error processing transaction chains:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing transaction chains',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/chain-stats
 * Get transaction chain statistics
 */
router.get('/chain-stats', async (req, res) => {
  try {
    const stats = await transactionChainService.getChainStatistics();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting chain statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting chain statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/symbols
 * Get list of symbols that have transaction chains
 */
router.get('/symbols', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT calculated_symbol as symbol
      FROM overlord.transactions 
      WHERE transaction_chain_id IS NOT NULL
        AND security_type IN ('EQ', 'OPTN')
        AND calculated_symbol IS NOT NULL
        AND calculated_symbol != ''
      ORDER BY calculated_symbol
    `);
    
    const symbols = result.rows.map((row: any) => row.symbol);
    res.json({
      success: true,
      symbols
    });
  } catch (error) {
    console.error('Error getting symbols:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting symbols',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/chain-transactions/:chainId
 * Get all transactions for a specific chain
 */
router.get('/chain-transactions/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        transaction_date,
        transaction_type,
        security_type,
        quantity,
        amount,
        transaction_chain_close_date,
        description
      FROM overlord.transactions 
      WHERE transaction_chain_id = $1
      ORDER BY transaction_date ASC, id ASC
    `, [chainId]);
    
    res.json({
      success: true,
      chainId,
      transactions: result.rows
    });
  } catch (error) {
    console.error('Error getting chain transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting chain transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/chains/:symbol
 * Get transaction chains for a specific symbol
 */
router.get('/chains/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const chains = await transactionChainService.getChainsForSymbol(symbol.toUpperCase());
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      chains
    });
  } catch (error) {
    console.error('Error getting chains for symbol:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting chains for symbol',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
