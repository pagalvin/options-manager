import express from 'express';
import { MarginOpportunityPlannerService } from '../services/marginOpportunityPlannerService';
import pool from '../database';

const router = express.Router();
const marginOpportunityPlannerService = new MarginOpportunityPlannerService(pool);

// Margin Master routes
router.get('/margin-master', async (req, res) => {
  try {
    const marginMaster = await marginOpportunityPlannerService.getMarginMaster();
    res.json(marginMaster);
  } catch (error) {
    console.error('Error fetching margin master:', error);
    res.status(500).json({ error: 'Failed to fetch margin master' });
  }
});

router.put('/margin-master', async (req, res) => {
  try {
    const { current_outstanding_margin, current_margin_rate, notes } = req.body;
    const marginMaster = await marginOpportunityPlannerService.updateMarginMaster({
      current_outstanding_margin,
      current_margin_rate,
      notes
    });
    res.json(marginMaster);
  } catch (error) {
    console.error('Error updating margin master:', error);
    res.status(500).json({ error: 'Failed to update margin master' });
  }
});

// Margin Planning Options routes
router.get('/options', async (req, res) => {
  try {
    const options = await marginOpportunityPlannerService.getMarginPlanningOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching margin planning options:', error);
    res.status(500).json({ error: 'Failed to fetch margin planning options' });
  }
});

router.post('/options', async (req, res) => {
  try {
    const { symbol, strike_date, strike_price, total_contracts, rollable } = req.body;
    const option = await marginOpportunityPlannerService.createMarginPlanningOption({
      symbol,
      strike_date,
      strike_price,
      total_contracts,
      rollable
    });
    res.json(option);
  } catch (error) {
    console.error('Error creating margin planning option:', error);
    res.status(500).json({ error: 'Failed to create margin planning option' });
  }
});

router.put('/options/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { symbol, strike_date, strike_price, total_contracts, rollable } = req.body;
    const option = await marginOpportunityPlannerService.updateMarginPlanningOption(id, {
      symbol,
      strike_date,
      strike_price,
      total_contracts,
      rollable
    });
    res.json(option);
  } catch (error) {
    console.error('Error updating margin planning option:', error);
    res.status(500).json({ error: 'Failed to update margin planning option' });
  }
});

router.delete('/options/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await marginOpportunityPlannerService.deleteMarginPlanningOption(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting margin planning option:', error);
    res.status(500).json({ error: 'Failed to delete margin planning option' });
  }
});

// Margin Plan routes
router.get('/plans', async (req, res) => {
  try {
    const plans = await marginOpportunityPlannerService.getMarginPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching margin plans:', error);
    res.status(500).json({ error: 'Failed to fetch margin plans' });
  }
});

router.put('/plans', async (req, res) => {
  try {
    const { week_ending, proposed_margin, notes } = req.body;
    const plan = await marginOpportunityPlannerService.upsertMarginPlan({
      week_ending,
      proposed_margin,
      notes
    });
    res.json(plan);
  } catch (error) {
    console.error('Error updating margin plan:', error);
    res.status(500).json({ error: 'Failed to update margin plan' });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await marginOpportunityPlannerService.deleteMarginPlan(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting margin plan:', error);
    res.status(500).json({ error: 'Failed to delete margin plan' });
  }
});

// Planning Grid route
router.get('/planning-grid', async (req, res) => {
  try {
    // Ensure margin plan records exist for all weeks with expirations
    await marginOpportunityPlannerService.ensureMarginPlanRecords();
    
    const grid = await marginOpportunityPlannerService.getPlanningGrid();
    res.json(grid);
  } catch (error) {
    console.error('Error fetching planning grid:', error);
    res.status(500).json({ error: 'Failed to fetch planning grid' });
  }
});

// Get weeks with expirations
router.get('/weeks-with-expirations', async (req, res) => {
  try {
    const weeks = await marginOpportunityPlannerService.getWeeksWithExpirations();
    res.json(weeks);
  } catch (error) {
    console.error('Error fetching weeks with expirations:', error);
    res.status(500).json({ error: 'Failed to fetch weeks with expirations' });
  }
});

export default router;
