import express from 'express';
import { AdminService } from '../services/adminService';

const router = express.Router();
const adminService = new AdminService();

// Delete all data
router.delete('/data', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.deleteAllData();
    res.json(result);
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({ error: 'Error deleting all data' });
  }
});

// Delete only transactions (preserve securities)
router.delete('/transactions', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.deleteTransactionsOnly();
    res.json(result);
  } catch (error) {
    console.error('Error deleting transactions:', error);
    res.status(500).json({ error: 'Error deleting transactions' });
  }
});

// Get system statistics
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const stats = await adminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Error fetching system stats' });
  }
});

// Reset database sequences
router.post('/reset-sequences', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.resetSequences();
    res.json(result);
  } catch (error) {
    console.error('Error resetting sequences:', error);
    res.status(500).json({ error: 'Error resetting sequences' });
  }
});

// Validate data integrity
router.get('/validate', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.validateDataIntegrity();
    res.json(result);
  } catch (error) {
    console.error('Error validating data integrity:', error);
    res.status(500).json({ error: 'Error validating data integrity' });
  }
});

// Fix data integrity issues
router.post('/fix-integrity', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.fixDataIntegrity();
    res.json(result);
  } catch (error) {
    console.error('Error fixing data integrity:', error);
    res.status(500).json({ error: 'Error fixing data integrity' });
  }
});

// Create data backup
router.post('/backup', async (req: express.Request, res: express.Response) => {
  try {
    const result = await adminService.backupData();
    res.json(result);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Error creating backup' });
  }
});

export default router;
