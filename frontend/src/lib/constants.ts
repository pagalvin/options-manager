/**
 * Common constants used throughout the application
 */

// Popular stock symbols used in the application
// This list should match the symbols commonly traded and appear in dropdowns
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'SPY', 'QQQ', 'IWM', 'BBAI', 'CIFR', 'URGN', 'CLSK', 'SOFI',
  'PLTR', 'AMD', 'INTC', 'CRM', 'PYPL', 'ADBE', 'V', 'JPM'
] as const;

// Export as type for TypeScript
export type PopularStock = typeof POPULAR_STOCKS[number];
