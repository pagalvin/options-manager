import express from 'express';
import { PositionService } from '../services/positionService';

const router = express.Router();
const positionService = new PositionService();

// Get all positions
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const positions = await positionService.getAllPositions();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Error fetching positions' });
  }
});

// Get all positions including closed ones
router.get('/all', async (req: express.Request, res: express.Response) => {
  try {
    const positions = await positionService.getAllPositionsIncludingClosed();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching all positions:', error);
    res.status(500).json({ error: 'Error fetching all positions' });
  }
});

// Get position by symbol
router.get('/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const position = await positionService.getPositionBySymbol(symbol);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Error fetching position' });
  }
});

// Get ROI calculations for open positions
router.get('/roi/current', async (req: express.Request, res: express.Response) => {
  try {
    const roiData = await positionService.calculateROI();
    res.json(roiData);
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({ error: 'Error calculating ROI' });
  }
});

// Get ROI for closed positions
router.get('/roi/closed', async (req: express.Request, res: express.Response) => {
  try {
    const roiData = await positionService.getClosedPositionsROI();
    res.json(roiData);
  } catch (error) {
    console.error('Error calculating closed positions ROI:', error);
    res.status(500).json({ error: 'Error calculating closed positions ROI' });
  }
});

// Update position value with current market price
router.put('/:symbol/price', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const { price } = req.body;
    
    if (!price || isNaN(price)) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    
    await positionService.updatePositionValue(symbol, parseFloat(price));
    res.json({ message: 'Position value updated successfully' });
  } catch (error) {
    console.error('Error updating position value:', error);
    res.status(500).json({ error: 'Error updating position value' });
  }
});

export default router;
