import { Router, Request, Response } from 'express';
import { stockAnalysisService } from '../services/stockAnalysisService';

const router = Router();

/**
 * GET /api/stock-analysis/:ticker/current-price
 * Get current stock price from E*TRADE (runtime retrieval, not stored)
 * NOTE: This route must be defined BEFORE the generic /:ticker route
 */
router.get('/:ticker/current-price', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!ticker || ticker.trim().length === 0) {
      return res.status(400).json({
        error: 'Ticker symbol is required'
      });
    }

    if (!sessionId) {
      return res.status(401).json({
        error: 'Session ID required',
        message: 'E*TRADE authentication required to fetch current price'
      });
    }

    // Import etradeService dynamically to avoid circular dependencies
    const { etradeService } = await import('../services/etradeService');
    
    // Get stock quote from E*TRADE
    const quote = await etradeService.getStockQuote(sessionId, ticker);
    
    // Log the full response for debugging
    console.log(`[Stock Price] Raw E*TRADE response for ${ticker}:`, JSON.stringify(quote, null, 2));
    
    // Extract price information - handle both lowercase and uppercase property names
    // E*TRADE API can return either format depending on the response type (XML vs JSON)
    const quoteAny = quote as any;
    const quoteResponse = quote?.quoteResponse || quoteAny?.QuoteResponse;
    const quoteResponseAny = quoteResponse as any;
    const quoteDataArray = quoteResponse?.quoteData || quoteResponseAny?.QuoteData;
    const quoteData = quoteDataArray?.[0];
    const quoteDataAny = quoteData as any;
    
    console.log(`[Stock Price] Quote data:`, JSON.stringify(quoteData, null, 2));
    
    // Handle both 'all' and 'All' property names
    const allData = quoteData?.all || quoteDataAny?.All;
    const allDataAny = allData as any;
    const lastTrade = allDataAny?.lastTrade;
    const change = allDataAny?.changeClose;
    const changePercent = allDataAny?.changeClosePercentage;
    const lastTradeTime = allDataAny?.timeOfLastTrade || allDataAny?.lastTradeTime;
    const productData = quoteDataAny?.Product || quoteData?.product;
    const productDataAny = productData as any;
    const companyName = allDataAny?.companyName || productDataAny?.companyName || productDataAny?.symbol;

    console.log(`[Stock Price] Extracted values - lastTrade: ${lastTrade}, change: ${change}, changePercent: ${changePercent}`);

    if (!lastTrade) {
      console.error(`[Stock Price] No lastTrade found for ${ticker}. Quote data structure:`, quoteData);
      return res.status(404).json({
        error: 'Price data not available',
        message: `Unable to retrieve current price for ${ticker.toUpperCase()}`
      });
    }

    return res.json({
      success: true,
      ticker: ticker.toUpperCase(),
      price: lastTrade,
      change: change || 0,
      changePercent: changePercent || 0,
      lastTradeTime: lastTradeTime || Date.now(),
      companyName: companyName
    });
  } catch (error: any) {
    console.error('Error fetching current price:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('Authentication') || error.message?.includes('authenticate')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate with E*TRADE to fetch current prices',
        needsAuth: true
      });
    }
    
    return res.status(500).json({
      error: 'Failed to fetch current price',
      message: error.message
    });
  }
});

/**
 * GET /api/stock-analysis/:ticker/history
 * Get all historical snapshots for a ticker
 * NOTE: This route must be defined BEFORE the generic /:ticker route
 */
router.get('/:ticker/history', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker || ticker.trim().length === 0) {
      return res.status(400).json({
        error: 'Ticker symbol is required'
      });
    }

    const snapshots = await stockAnalysisService.getSnapshotsByTicker(ticker);

    return res.json({
      success: true,
      snapshots
    });
  } catch (error: any) {
    console.error('Error fetching snapshot history:', error);
    return res.status(500).json({
      error: 'Failed to fetch snapshot history',
      message: error.message
    });
  }
});

/**
 * POST /api/stock-analysis/:ticker/refresh
 * Force refresh analysis for a ticker
 */
router.post('/:ticker/refresh', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker || ticker.trim().length === 0) {
      return res.status(400).json({
        error: 'Ticker symbol is required'
      });
    }

    console.log(`Force refreshing stock analysis for ${ticker.toUpperCase()}`);

    // Force generate new snapshot
    const snapshot = await stockAnalysisService.generateSnapshot(ticker, true);

    return res.json({
      success: true,
      snapshot,
      message: 'Analysis refreshed successfully'
    });
  } catch (error: any) {
    console.error('Error refreshing stock analysis:', error);
    return res.status(500).json({
      error: 'Failed to refresh stock analysis',
      message: error.message
    });
  }
});

/**
 * DELETE /api/stock-analysis/:ticker
 * Delete all snapshots for a ticker
 */
router.delete('/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker || ticker.trim().length === 0) {
      return res.status(400).json({
        error: 'Ticker symbol is required'
      });
    }

    await stockAnalysisService.deleteSnapshotsByTicker(ticker);

    return res.json({
      success: true,
      message: `All snapshots for ${ticker.toUpperCase()} deleted successfully`
    });
  } catch (error: any) {
    console.error('Error deleting snapshots:', error);
    return res.status(500).json({
      error: 'Failed to delete snapshots',
      message: error.message
    });
  }
});

/**
 * DELETE /api/stock-analysis/snapshot/:id
 * Delete a specific snapshot by ID
 */
router.delete('/snapshot/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snapshotId = parseInt(id, 10);

    if (isNaN(snapshotId)) {
      return res.status(400).json({
        error: 'Invalid snapshot ID'
      });
    }

    await stockAnalysisService.deleteSnapshot(snapshotId);

    return res.json({
      success: true,
      message: `Snapshot ${snapshotId} deleted successfully`
    });
  } catch (error: any) {
    console.error('Error deleting snapshot:', error);
    return res.status(500).json({
      error: 'Failed to delete snapshot',
      message: error.message
    });
  }
});

/**
 * GET /api/stock-analysis/:ticker
 * Get or generate stock analysis snapshot for a ticker
 * Query params:
 *   - refresh: boolean (optional) - Force refresh the analysis
 * NOTE: This catch-all route must be defined LAST
 */
router.get('/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    if (!ticker || ticker.trim().length === 0) {
      return res.status(400).json({
        error: 'Ticker symbol is required'
      });
    }

    console.log(`Stock analysis request for ${ticker.toUpperCase()}, forceRefresh: ${forceRefresh}`);

    // Generate or retrieve snapshot
    const snapshot = await stockAnalysisService.generateSnapshot(ticker, forceRefresh);

    return res.json({
      success: true,
      snapshot
    });
  } catch (error: any) {
    console.error('Error in stock analysis route:', error);
    return res.status(500).json({
      error: 'Failed to generate stock analysis',
      message: error.message
    });
  }
});

export default router;
