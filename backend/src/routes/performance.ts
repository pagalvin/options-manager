import express from 'express';
import { PerformanceService } from '../services/performanceService';

const router = express.Router();
const performanceService = new PerformanceService();

// Get monthly performance
router.get('/monthly', async (req: express.Request, res: express.Response) => {
  try {
    const performance = await performanceService.getMonthlyPerformance();
    res.json(performance);
  } catch (error) {
    console.error('Error fetching monthly performance:', error);
    res.status(500).json({ error: 'Error fetching monthly performance' });
  }
});

// Get monthly performance by year
router.get('/monthly/:year', async (req: express.Request, res: express.Response) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    
    const performance = await performanceService.getMonthlyPerformanceByYear(year);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching monthly performance by year:', error);
    res.status(500).json({ error: 'Error fetching monthly performance by year' });
  }
});

// Get total performance summary
router.get('/total', async (req: express.Request, res: express.Response) => {
  try {
    const performance = await performanceService.getTotalPerformance();
    res.json(performance);
  } catch (error) {
    console.error('Error fetching total performance:', error);
    res.status(500).json({ error: 'Error fetching total performance' });
  }
});

// Get premium collected by month (chart data)
router.get('/premium-by-month', async (req: express.Request, res: express.Response) => {
  try {
    const premiumData = await performanceService.getPremiumByMonth();
    res.json(premiumData);
  } catch (error) {
    console.error('Error fetching premium by month:', error);
    res.status(500).json({ error: 'Error fetching premium by month' });
  }
});

export default router;
