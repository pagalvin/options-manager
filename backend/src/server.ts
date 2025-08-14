import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import transactionRoutes from './routes/transactions';
import positionRoutes from './routes/positions';
import optionRoutes from './routes/options';
import performanceRoutes from './routes/performance';
import stockPriceRoutes from './routes/stockPrices';
import adminRoutes from './routes/admin';
import analyzerRoutes from './routes/analyzer';
import strikePriceRoutes from './routes/strikePrice';
import manualOptionsAnalysisRoutes from './routes/manualOptionsAnalysis';
import etradeRoutes from './routes/etrade';
import chainAdminRoutes from './routes/chainAdmin';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend build (when deployed)
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/options', optionRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/stock-prices', stockPriceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analyzer', analyzerRoutes);
app.use('/api/strike-price', strikePriceRoutes);
app.use('/api/manual-options-analysis', manualOptionsAnalysisRoutes);
app.use('/api/etrade', etradeRoutes);
app.use('/api/chain-admin', chainAdminRoutes);
app.use('/api/price', stockPriceRoutes);

// Health check endpoint
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'Connected',
      api: 'Running'
    }
  });
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Options Trading Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 API base URL: http://localhost:${PORT}/api`);
});

export default app;
