import express from 'express';
import { OptionService } from '../services/optionService';

const router = express.Router();
const optionService = new OptionService();

// Get all options
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const options = await optionService.getAllOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ error: 'Error fetching options' });
  }
});

// Get open options
router.get('/open', async (req: express.Request, res: express.Response) => {
  try {
    const options = await optionService.getOpenOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching open options:', error);
    res.status(500).json({ error: 'Error fetching open options' });
  }
});

// Get options by underlying symbol
router.get('/symbol/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const options = await optionService.getOptionsBySymbol(symbol);
    res.json(options);
  } catch (error) {
    console.error('Error fetching options by symbol:', error);
    res.status(500).json({ error: 'Error fetching options by symbol' });
  }
});

// Get expiring options
router.get('/expiring/:days?', async (req: express.Request, res: express.Response) => {
  try {
    const days = req.params.days ? parseInt(req.params.days) : 30;
    const options = await optionService.getExpiringOptions(days);
    res.json(options);
  } catch (error) {
    console.error('Error fetching expiring options:', error);
    res.status(500).json({ error: 'Error fetching expiring options' });
  }
});

// Get covered call analysis
router.get('/analysis/covered-calls', async (req: express.Request, res: express.Response) => {
  try {
    const analysis = await optionService.getCoveredCallAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching covered call analysis:', error);
    res.status(500).json({ error: 'Error fetching covered call analysis' });
  }
});

// Update option status
router.put('/:id/status', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['OPEN', 'CLOSED', 'ASSIGNED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await optionService.updateOptionStatus(parseInt(id), status);
    res.json({ message: 'Option status updated successfully' });
  } catch (error) {
    console.error('Error updating option status:', error);
    res.status(500).json({ error: 'Error updating option status' });
  }
});

// Mark expired options
router.post('/mark-expired', async (req: express.Request, res: express.Response) => {
  try {
    const count = await optionService.markExpiredOptions();
    res.json({ 
      message: 'Expired options marked successfully',
      count 
    });
  } catch (error) {
    console.error('Error marking expired options:', error);
    res.status(500).json({ error: 'Error marking expired options' });
  }
});

export default router;
