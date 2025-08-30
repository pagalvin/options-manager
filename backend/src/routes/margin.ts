import { Router } from 'express';
import { MarginService } from '../services/marginService';

const router = Router();

/**
 * GET /api/margin/analysis
 * Get margin analysis with balance history and interest calculations
 */
router.get('/analysis', async (req, res) => {
  try {
    const analysis = await MarginService.calculateMarginAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching margin analysis:', error);
    res.status(500).json({ 
      error: 'Failed to calculate margin analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/margin/balance
 * Get current margin balance
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await MarginService.getCurrentMarginBalance();
    res.json({ balance });
  } catch (error) {
    console.error('Error fetching margin balance:', error);
    res.status(500).json({ 
      error: 'Failed to get margin balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
