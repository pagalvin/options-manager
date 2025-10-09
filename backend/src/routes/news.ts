import express from 'express';
import { newsService } from '../services/newsService';

const router = express.Router();

// SSE connections for progress updates
const progressClients = new Map<string, express.Response>();

/**
 * GET /api/news/snapshots
 * Get all news snapshot dates
 */
router.get('/snapshots/dates', async (req: express.Request, res: express.Response) => {
  try {
    const dates = await newsService.getSnapshotDates();
    res.json(dates);
  } catch (error) {
    console.error('Error fetching snapshot dates:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot dates' });
  }
});

/**
 * GET /api/news/snapshots
 * Get all news snapshots
 */
router.get('/snapshots', async (req: express.Request, res: express.Response) => {
  try {
    const snapshots = await newsService.getAllNewsSnapshots();
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching news snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch news snapshots' });
  }
});

/**
 * GET /api/news/snapshots/:date
 * Get news snapshot for a specific date (YYYY-MM-DD)
 */
router.get('/snapshots/:date', async (req: express.Request, res: express.Response) => {
  try {
    const date = new Date(req.params.date);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const snapshot = await newsService.getNewsSnapshotByDate(date);
    
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found for this date' });
    }
    
    res.json(snapshot);
  } catch (error) {
    console.error('Error fetching news snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch news snapshot' });
  }
});

/**
 * POST /api/news/generate
 * Generate a new news snapshot for given tickers
 * Body: { tickers: string[] }
 */
router.post('/generate', async (req: express.Request, res: express.Response) => {
  try {
    const { tickers, clientId } = req.body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }
    
    console.log(`Generating news snapshot for ${tickers.length} tickers`);
    
    // Generate snapshot with progress callback
    const snapshot = await newsService.generateNewsSnapshot(
      tickers,
      (ticker, index, total, data) => {
        // Send progress update via SSE if client is connected
        if (clientId && progressClients.has(clientId)) {
          const client = progressClients.get(clientId);
          if (client) {
            const progressData = {
              ticker,
              index,
              total,
              data,
              percentage: Math.round((index / total) * 100)
            };
            
            client.write(`data: ${JSON.stringify(progressData)}\n\n`);
          }
        }
      }
    );
    
    // Close SSE connection if exists
    if (clientId && progressClients.has(clientId)) {
      const client = progressClients.get(clientId);
      if (client) {
        client.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
        client.end();
        progressClients.delete(clientId);
      }
    }
    
    res.json(snapshot);
  } catch (error) {
    console.error('Error generating news snapshot:', error);
    res.status(500).json({ error: 'Failed to generate news snapshot' });
  }
});

/**
 * GET /api/news/progress/:clientId
 * SSE endpoint for progress updates
 */
router.get('/progress/:clientId', (req: express.Request, res: express.Response) => {
  const clientId = req.params.clientId;
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Store client connection
  progressClients.set(clientId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
  
  // Clean up on client disconnect
  req.on('close', () => {
    progressClients.delete(clientId);
    res.end();
  });
});

/**
 * DELETE /api/news/snapshots/:id
 * Delete a news snapshot
 */
router.delete('/snapshots/:id', async (req: express.Request, res: express.Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid snapshot ID' });
    }
    
    await newsService.deleteNewsSnapshot(id);
    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    console.error('Error deleting news snapshot:', error);
    res.status(500).json({ error: 'Failed to delete news snapshot' });
  }
});

export default router;
