import express from 'express';
import { returnOnCapitalService } from '../services/returnOnCapitalService';

const router = express.Router();

// Get Return on Capital by symbol (for individual symbol analysis)
router.get('/symbol', async (req: express.Request, res: express.Response) => {
  try {
    const data = await returnOnCapitalService.getReturnOnCapitalBySymbol();
    res.json(data);
  } catch (error) {
    console.error('Error fetching return on capital by symbol:', error);
    res.status(500).json({ error: 'Error fetching return on capital by symbol' });
  }
});

// Get Return on Capital for specific symbol
router.get('/symbol/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const data = await returnOnCapitalService.getReturnOnCapitalBySymbolName(symbol);
    if (!data) {
      return res.status(404).json({ error: 'No data found for this symbol' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching return on capital for symbol:', error);
    res.status(500).json({ error: 'Error fetching return on capital for symbol' });
  }
});

// Get Monthly Return on Capital breakdown
router.get('/monthly', async (req: express.Request, res: express.Response) => {
  try {
    const data = await returnOnCapitalService.getMonthlyReturnOnCapital();
    res.json(data);
  } catch (error) {
    console.error('Error fetching monthly return on capital:', error);
    res.status(500).json({ error: 'Error fetching monthly return on capital' });
  }
});

// Get Aggregated Return on Capital for entire portfolio
router.get('/aggregated', async (req: express.Request, res: express.Response) => {
  try {
    const data = await returnOnCapitalService.getAggregatedReturnOnCapital();
    res.json(data);
  } catch (error) {
    console.error('Error fetching aggregated return on capital:', error);
    res.status(500).json({ error: 'Error fetching aggregated return on capital' });
  }
});

// Get Return on Capital data formatted for pie chart
router.get('/pie-chart-data', async (req: express.Request, res: express.Response) => {
  try {
    const data = await returnOnCapitalService.getReturnOnCapitalPieChartData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching return on capital pie chart data:', error);
    res.status(500).json({ error: 'Error fetching return on capital pie chart data' });
  }
});

// Get Return on Capital data formatted for bar chart
router.get('/bar-chart-data', async (req: express.Request, res: express.Response) => {
  try {
    const data = await returnOnCapitalService.getReturnOnCapitalBarChartData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching return on capital bar chart data:', error);
    res.status(500).json({ error: 'Error fetching return on capital bar chart data' });
  }
});

// Get top performing symbols by Return on Capital
router.get('/top-performers/:limit?', async (req: express.Request, res: express.Response) => {
  try {
    const limit = req.params.limit ? parseInt(req.params.limit) : 10;
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 50.' });
    }
    
    const data = await returnOnCapitalService.getTopPerformingSymbolsByRoC(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top performing symbols:', error);
    res.status(500).json({ error: 'Error fetching top performing symbols' });
  }
});

// Test endpoint to debug the issue
router.get('/debug-test', async (req: express.Request, res: express.Response) => {
  try {
    const symbolData = await returnOnCapitalService.getReturnOnCapitalBySymbol();
    const first3 = symbolData.slice(0, 3);
    const filtered = symbolData.filter(item => parseFloat(String(item.returnOnCapital)) > 0).slice(0, 5);
    res.json({ 
      total: symbolData.length, 
      filtered: filtered.length,
      rawFirst3: first3.map(item => ({
        symbol: item.symbol,
        roc: item.returnOnCapital,
        rocType: typeof item.returnOnCapital,
        rocAsNumber: parseFloat(String(item.returnOnCapital)),
        premium: item.totalPremiumCollected,
        capital: item.totalCapitalInvested
      })),
      sample: filtered.map(item => ({
        symbol: item.symbol,
        roc: parseFloat(String(item.returnOnCapital)),
        premium: item.totalPremiumCollected,
        capital: item.totalCapitalInvested
      }))
    });
  } catch (error) {
    console.error('Error in debug test:', error);
    res.status(500).json({ error: 'Debug test failed' });
  }
});

export default router;