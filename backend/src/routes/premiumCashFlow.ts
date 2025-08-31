import express from 'express';
import { PremiumCashFlowService } from '../services/premiumCashFlowService';

const router = express.Router();
const premiumCashFlowService = new PremiumCashFlowService();

// Get all option roll transactions and standalone premium
router.get('/rolls', async (req, res) => {
  try {
    const rolls = await premiumCashFlowService.getAllUnhinderedPremium();
    res.json(rolls);
  } catch (error) {
    console.error('Error fetching option rolls:', error);
    res.status(500).json({ error: 'Failed to fetch option rolls' });
  }
});

// Get premium cash flow summary by week and month
router.get('/summary', async (req, res) => {
  try {
    const summary = await premiumCashFlowService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching premium cash flow summary:', error);
    res.status(500).json({ error: 'Failed to fetch premium cash flow summary' });
  }
});

// Get detailed option rolls with full analysis
router.get('/detailed', async (req, res) => {
  try {
    const rolls = await premiumCashFlowService.getOptionRolls();
    res.json(rolls);
  } catch (error) {
    console.error('Error fetching detailed option rolls:', error);
    res.status(500).json({ error: 'Failed to fetch detailed option rolls' });
  }
});

export default router;
