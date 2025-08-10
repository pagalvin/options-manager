import express from 'express';
import { etradeService } from '../services/etradeService';

const router = express.Router();

// Initiate OAuth flow
router.post('/auth/initiate', async (req, res) => {
  try {
    const result = await etradeService.getRequestToken();
    
    res.json({
      sessionId: result.sessionId,
      authUrl: result.authUrl
    });
  } catch (error) {
    console.error('Error initiating E*TRADE auth:', error);
    res.status(500).json({ 
      error: 'Failed to initiate authentication',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Complete authentication (called from frontend with verification code)
router.post('/auth/complete', async (req, res) => {
  try {
    const { sessionId, verifier } = req.body;

    if (!sessionId || !verifier) {
      return res.status(400).json({ error: 'Missing sessionId or verifier' });
    }

    const accessToken = await etradeService.getAccessToken(sessionId, verifier);
    
    res.json({
      success: true,
      authenticated: true,
      sessionId
    });
  } catch (error) {
    console.error('Error completing authentication:', error);
    res.status(500).json({ 
      error: 'Failed to complete authentication',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Renew access token
router.post('/auth/renew', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const renewedToken = await etradeService.renewAccessToken(sessionId);
    
    res.json({
      success: true,
      renewed: true,
      sessionId
    });
  } catch (error) {
    console.error('Error renewing access token:', error);
    res.status(500).json({ 
      error: 'Failed to renew access token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check authentication status
router.get('/auth/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const isAuthenticated = etradeService.isAuthenticated(sessionId);
    
    res.json({ authenticated: isAuthenticated });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

// Logout
router.post('/auth/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId) {
      etradeService.clearSession(sessionId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Environment switching routes
router.get('/environment', async (req, res) => {
  try {
    const environment = etradeService.getEnvironment();
    const credentialsAvailable = etradeService.hasValidCredentials();
    
    res.json({
      ...environment,
      credentialsAvailable,
      authenticated: false // We'll update this when we have session management
    });
  } catch (error) {
    console.error('Error getting environment:', error);
    res.status(500).json({ error: 'Failed to get environment' });
  }
});

router.post('/environment', async (req, res) => {
  try {
    const { sandbox } = req.body;
    
    if (typeof sandbox !== 'boolean') {
      return res.status(400).json({ error: 'sandbox parameter must be a boolean' });
    }
    
    etradeService.setEnvironment(sandbox);
    const environment = etradeService.getEnvironment();
    
    res.json({
      success: true,
      environment: environment.environment,
      baseUrl: environment.baseUrl
    });
  } catch (error) {
    console.error('Error setting environment:', error);
    res.status(500).json({ error: 'Failed to set environment' });
  }
});

// Get stock quote
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const quote = await etradeService.getStockQuote(sessionId, symbol);
    res.json(quote);
  } catch (error) {
    console.error('Error getting quote:', error);
    res.status(500).json({ 
      error: 'Failed to get stock quote',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get simple current price success indicator
router.get('/api/price/:symbol', async (req, res) => {

  console.log(`etrade.ts: /api/price/${req.params.symbol} called`);
  
  try {
    const { symbol } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ symbol, didSucceed: false, error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ symbol, didSucceed: false, error: 'Not authenticated' });
    }

    const quote = await etradeService.getStockQuote(sessionId, symbol);

    const lastTrade = quote?.quoteResponse?.quoteData?.[0]?.all?.lastTrade;
    const didSucceed = typeof lastTrade === 'number' && !Number.isNaN(lastTrade);

    return res.json({ lastTrade, symbol, didSucceed });
  } catch (error) {
    console.error('Error getting simple price indicator:', error);
    return res.status(500).json({ symbol: req.params.symbol, didSucceed: false });
  }
});

// Product lookup
router.get('/lookup/:search', async (req, res) => {
  try {
    const { search } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const lookupResults = await etradeService.lookupProduct(sessionId, search);
    res.json(lookupResults);
  } catch (error) {
    console.error('Error looking up product:', error);
    res.status(500).json({ 
      error: 'Failed to lookup product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get option chain
router.get('/options/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiryYear, expiryMonth, expiryDay } = req.query;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const optionChain = await etradeService.getOptionChain(
      sessionId, 
      symbol, 
      {
        expirationYear: expiryYear as string,
        expirationMonth: expiryMonth as string,
        expirationDay: expiryDay as string
      }
    );
    
    res.json(optionChain);
  } catch (error) {
    console.error('Error getting option chain:', error);
    res.status(500).json({ 
      error: 'Failed to get option chain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get option expiration dates
router.get('/options/:symbol/expirations', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiryType } = req.query;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const expirationDates = await etradeService.getOptionExpirationDates(
      sessionId, 
      symbol, 
      expiryType as 'UNSPECIFIED' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'VIX' | 'ALL' | 'MONTHEND' | undefined
    );
    res.json({ expirationDates });
  } catch (error) {
    console.error('Error getting expiration dates:', error);
    res.status(500).json({ 
      error: 'Failed to get expiration dates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Combined endpoint: if called with ?symbol=XYZ, return quote and first available option chain
router.get('/', async (req, res) => {
  try {
    const qSymbol = (req.query.symbol as string | undefined)?.trim();
    if (!qSymbol) {
      return res.json({ ok: true });
    }

    const symbol = qSymbol.toUpperCase();
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    if (!etradeService.isAuthenticated(sessionId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch quote and expirations in parallel
    const [quote, expirations] = await Promise.all([
      etradeService.getStockQuote(sessionId, symbol),
      etradeService.getOptionExpirationDates(sessionId, symbol, 'ALL')
    ]);

    // Pick earliest expiration by date if available
    let selectedExpiration: { year: number; month: number; day: number; expiryType: string } | null = null;
    let optionChain: any = null;

    if (Array.isArray(expirations) && expirations.length > 0) {
      const sorted = [...expirations].sort((a, b) => {
        const da = new Date(a.year, a.month - 1, a.day).getTime();
        const db = new Date(b.year, b.month - 1, b.day).getTime();
        return da - db;
      });
      selectedExpiration = sorted[0];

      // Fetch option chain for the selected expiration
      optionChain = await etradeService.getOptionChain(sessionId, symbol, {
        expirationYear: String(selectedExpiration.year),
        expirationMonth: String(selectedExpiration.month),
        expirationDay: String(selectedExpiration.day),
        chainType: 'CALLPUT',
      });
    }

    return res.json({
      symbol,
      quote,
      expirationDates: expirations,
      selectedExpiration,
      optionChain,
    });
  } catch (error) {
    console.error('Error in combined E*TRADE request:', error);
    res.status(500).json({ 
      error: 'Failed to get combined E*TRADE data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
