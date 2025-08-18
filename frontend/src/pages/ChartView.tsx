import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, BarChart3, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchUniqueSymbols } from '@/lib/api';

export function ChartView() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y'>('1y');
  const [chartType, setChartType] = useState<'area-chart' | 'candlestick' | 'line-chart'>('area-chart');
  const [loading, setLoading] = useState(true);
  const [customSymbol, setCustomSymbol] = useState('');
  const [showSymbolInput, setShowSymbolInput] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);
  const [chartError, setChartError] = useState(false);
  
  const symbolUpper = symbol?.toUpperCase() || 'AAPL';

  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const uniqueSymbols = await fetchUniqueSymbols();
        setSymbols(uniqueSymbols);
      } catch (error) {
        console.error('Failed to fetch symbols:', error);
        setSymbols([]);
      } finally {
        setSymbolsLoading(false);
      }
    };

    loadSymbols();
  }, []);

  useEffect(() => {
    // Reset error state and show loading when params change
    setChartError(false);
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 2000); // Give more time for iframe to load
    return () => clearTimeout(timer);
  }, [symbol, timeframe, chartType]);

  const handleIframeError = () => {
    console.error('Chart iframe error for symbol:', symbolUpper, 'timeframe:', timeframe);
    setChartError(true);
    setLoading(false);
  };

  const handleIframeLoad = () => {
    console.log('Chart iframe loaded successfully for symbol:', symbolUpper);
    setLoading(false);
    setChartError(false);
  };

  const handleSymbolChange = (newSymbol: string) => {
    if (newSymbol && newSymbol !== symbol) {
      navigate(`/chart/${newSymbol.toUpperCase()}`);
    }
  };

  const handleCustomSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSymbol.trim()) {
      handleSymbolChange(customSymbol.trim());
      setCustomSymbol('');
      setShowSymbolInput(false);
    }
  };

  const getChartUrl = () => {
    // Use simplified TradingView widget to avoid schema errors
    const baseUrl = 'https://s.tradingview.com/widgetembed/';
    const params = new URLSearchParams({
      frameElementId: `tradingview_${symbolUpper}`,
      symbol: symbolUpper, // Just use symbol without exchange prefix
      interval: getIntervalFromTimeframe(),
      hidesidetoolbar: '1',
      saveimage: '1',
      theme: 'Light',
      style: getStyleFromChartType(),
      locale: 'en',
      width: '100%',
      height: '500',
      autosize: '1'
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    console.log('Generated TradingView URL (simplified):', url);
    console.log('Symbol:', symbolUpper, 'Timeframe:', timeframe, 'ChartType:', chartType);
    return url;
  };

  // Convert our timeframe to TradingView interval format
  const getIntervalFromTimeframe = () => {
    switch (timeframe) {
      case '1d': return '5'; // 5 minute intervals for 1 day
      case '5d': return '15'; // 15 minute intervals for 5 days  
      case '1m': return '1D'; // Daily intervals for 1 month
      case '3m': return '1D'; // Daily intervals for 3 months
      case '6m': return '1W'; // Weekly intervals for 6 months
      case '1y': return '1W'; // Weekly intervals for 1 year
      case '5y': return '1M'; // Monthly intervals for 5 years
      default: return '1D';
    }
  };

  // Convert our chart type to TradingView style
  const getStyleFromChartType = () => {
    switch (chartType) {
      case 'area-chart': return '3'; // Area
      case 'line-chart': return '2'; // Line  
      case 'candlestick': return '1'; // Candles
      default: return '1';
    }
  };

  // Remove TradingView helper functions for now
  // const getInterval = () => { ... }
  // const getStyle = () => { ... }

  const timeframeOptions = [
    { value: '1d' as const, label: '1D', icon: Calendar },
    { value: '5d' as const, label: '5D', icon: Calendar },
    { value: '1m' as const, label: '1M', icon: Calendar },
    { value: '3m' as const, label: '3M', icon: Calendar },
    { value: '6m' as const, label: '6M', icon: Calendar },
    { value: '1y' as const, label: '1Y', icon: Calendar },
    { value: '5y' as const, label: '5Y', icon: Calendar }
  ];

  const chartTypeOptions = [
    { value: 'area-chart', label: 'Area', icon: TrendingUp },
    { value: 'line-chart', label: 'Line', icon: BarChart3 },
    { value: 'candlestick', label: 'Candles', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{symbolUpper}</h1>
                  <p className="text-gray-600">Stock Chart Analysis</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Symbol Selector */}
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">Change Symbol:</div>
                
                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-1">
                  {symbolsLoading ? (
                    <div className="text-xs text-gray-500">Loading symbols...</div>
                  ) : (
                    symbols.slice(0, 6).map((stock) => (
                      <button
                        key={stock}
                        onClick={() => handleSymbolChange(stock)}
                        className={cn(
                          'px-2 py-1 text-xs font-mono rounded transition-colors',
                          stock === symbolUpper
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {stock}
                      </button>
                    ))
                  )}
                  
                  {/* Custom Symbol Input */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSymbolInput(!showSymbolInput)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Search size={12} />
                    </button>
                    
                    {showSymbolInput && (
                      <form
                        onSubmit={handleCustomSymbolSubmit}
                        className="absolute right-0 top-full mt-1 z-10"
                      >
                        <input
                          type="text"
                          value={customSymbol}
                          onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                          placeholder="Enter symbol"
                          className="px-2 py-1 text-xs border border-gray-300 rounded w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Info size={16} />
                <span>Powered by Jika.io</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Timeframe Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeframe(option.value as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      timeframe === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Type Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Chart Type
              </label>
              <div className="flex gap-2">
                {chartTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setChartType(option.value as any)}
                    className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      chartType === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <option.icon size={16} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {symbolUpper} - {timeframeOptions.find(t => t.value === timeframe)?.label} Chart
            </h2>
            <p className="text-gray-600 text-sm">
              Interactive {chartTypeOptions.find(c => c.value === chartType)?.label.toLowerCase()} chart with real-time data
            </p>
          </div>

          {/* Loading State */}
          {loading && !chartError && (
            <div className="relative">
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading chart data...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {symbolUpper} - {timeframeOptions.find(t => t.value === timeframe)?.label} Chart
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {chartError && (
            <div className="relative">
              <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="text-center max-w-md">
                  <div className="text-red-600 mb-4">
                    <Info size={32} className="mx-auto" />
                  </div>
                  <p className="text-red-800 font-medium">Failed to load chart</p>
                  <p className="text-red-600 text-sm mt-1">
                    Chart data for "{symbolUpper}" could not be loaded
                  </p>
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> Charts work best with well-known symbols like AAPL, MSFT, GOOGL, TSLA, SPY, QQQ, etc.
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Some symbols from your transactions might not have public chart data available.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button
                      onClick={() => handleSymbolChange('AAPL')}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Try AAPL
                    </button>
                    <button
                      onClick={() => {
                        setChartError(false);
                        setLoading(true);
                        setTimeout(() => setLoading(false), 2000);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart Iframe */}
          <div className={`relative ${loading || chartError ? 'hidden' : 'block'}`}>
            <iframe
              key={`chart-${symbolUpper}-${timeframe}-${chartType}`} // Force re-render when parameters change
              referrerPolicy="origin"
              width="100%"
              height="500"
              style={{
                background: "#FFFFFF",
                padding: "0",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
              }}
              src={getChartUrl()}
              title={`${symbolUpper} Stock Chart`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        </div>

        {/* Chart Info */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Chart Information</h3>
              <div className="text-sm text-blue-800">
                <p>• Real-time stock price data from reliable financial data providers</p>
                <p>• Interactive charts with zoom, pan, and hover tooltips</p>
                <p>• Multiple timeframes and chart types available</p>
                <p>• Data updates automatically during market hours</p>
              </div>
            </div>
          </div>
        </div>
        </div>
        
        {/* Click outside to close symbol input */}
        {showSymbolInput && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSymbolInput(false)}
          />
        )}
      </div>
    );
  }