import express from 'express';
import { MarginPlanningService } from '../services/marginPlanningService';

const router = express.Router();
const marginPlanningService = new MarginPlanningService();

// Get comprehensive margin analysis
router.get('/analysis', async (req, res) => {
  try {
    const analysis = await marginPlanningService.getMarginAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching margin analysis:', error);
    res.status(500).json({ error: 'Failed to fetch margin analysis' });
  }
});

// Get all margin accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await marginPlanningService.getMarginAccounts();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching margin accounts:', error);
    res.status(500).json({ error: 'Failed to fetch margin accounts' });
  }
});

// Create a new margin account
router.post('/accounts', async (req, res) => {
  try {
    const account = await marginPlanningService.createMarginAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating margin account:', error);
    res.status(500).json({ error: 'Failed to create margin account' });
  }
});

// Record a margin transaction
router.post('/transactions', async (req, res) => {
  try {
    const transaction = await marginPlanningService.recordMarginTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error recording margin transaction:', error);
    res.status(500).json({ error: 'Failed to record margin transaction' });
  }
});

// Update daily balance
router.post('/daily-balance', async (req, res) => {
  try {
    const balance = await marginPlanningService.updateDailyBalance(req.body);
    res.json(balance);
  } catch (error) {
    console.error('Error updating daily balance:', error);
    res.status(500).json({ error: 'Failed to update daily balance' });
  }
});

// Create a planning scenario
router.post('/scenarios', async (req, res) => {
  try {
    const scenario = await marginPlanningService.createPlanningScenario(req.body);
    res.status(201).json(scenario);
  } catch (error) {
    console.error('Error creating planning scenario:', error);
    res.status(500).json({ error: 'Failed to create planning scenario' });
  }
});

// Calculate scenario projections
router.post('/scenarios/calculate', async (req, res) => {
  try {
    const { accountId, drawAmount = 0, paymentAmount = 0, projectionDays = 30 } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const projections = await marginPlanningService.calculateScenarioProjections(
      accountId,
      drawAmount,
      paymentAmount,
      projectionDays
    );
    
    res.json(projections);
  } catch (error) {
    console.error('Error calculating scenario projections:', error);
    res.status(500).json({ error: 'Failed to calculate scenario projections' });
  }
});

// Check margin alerts
router.get('/alerts/check', async (req, res) => {
  try {
    const triggeredAlerts = await marginPlanningService.checkMarginAlerts();
    res.json(triggeredAlerts);
  } catch (error) {
    console.error('Error checking margin alerts:', error);
    res.status(500).json({ error: 'Failed to check margin alerts' });
  }
});

// Sync transactions from main transactions table
router.post('/sync', async (req, res) => {
  try {
    await marginPlanningService.syncMarginTransactions();
    res.json({ message: 'Margin transactions synced successfully' });
  } catch (error) {
    console.error('Error syncing margin transactions:', error);
    res.status(500).json({ error: 'Failed to sync margin transactions' });
  }
});

export default router;
