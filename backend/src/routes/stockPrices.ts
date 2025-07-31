import express from 'express';
import { StockPriceService } from '../services/stockPriceService';

const router = express.Router();
const stockPriceService = new StockPriceService();

// Get stock price for a single symbol
router.get('/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const { useStub } = req.query;
    
    let price;
    if (useStub === 'true') {
      // Use stub data for testing
      price = await stockPriceService.getStockPriceStub(symbol);
    } else {
      // Try to get real price data
      price = await stockPriceService.getStockPrice(symbol);
      
      // Fallback to Yahoo Finance if Finnhub fails
      if (!price) {
        price = await stockPriceService.getStockPriceYahoo(symbol);
      }
      
      // Final fallback to stub data
      if (!price) {
        price = await stockPriceService.getStockPriceStub(symbol);
      }
    }
    
    res.json(price);
  } catch (error) {
    console.error('Error fetching stock price:', error);
    res.status(500).json({ error: 'Error fetching stock price' });
  }
});

// Get multiple stock prices
router.post('/bulk', async (req: express.Request, res: express.Response) => {
  try {
    const { symbols, useStub } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }
    
    let prices;
    if (useStub) {
      // Use stub data for testing
      prices = await Promise.all(
        symbols.map(symbol => stockPriceService.getStockPriceStub(symbol))
      );
    } else {
      // Get real price data
      prices = await stockPriceService.getMultipleStockPrices(symbols);
    }
    
    res.json(prices);
  } catch (error) {
    console.error('Error fetching multiple stock prices:', error);
    res.status(500).json({ error: 'Error fetching multiple stock prices' });
  }
});

export default router;
