import { useState, useEffect } from 'react';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChartProps {
  symbol: string;
  height?: number;
  showControls?: boolean;
  defaultTimeframe?: '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y';
  defaultChartType?: 'area-chart' | 'candlestick' | 'line-chart';
  className?: string;
}

export function Chart({ 
  symbol, 
  height = 400, 
  showControls = false,
  defaultTimeframe = '1y',
  defaultChartType = 'area-chart',
  className = ''
}: ChartProps) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [chartType, setChartType] = useState(defaultChartType);
  const [loading, setLoading] = useState(true);
  const [chartError, setChartError] = useState(false);
  
  const symbolUpper = symbol.toUpperCase();

  useEffect(() => {
    setChartError(false);
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [symbol, timeframe, chartType]);

  const handleIframeError = () => {
    console.error('Chart iframe error for symbol:', symbolUpper);
    setChartError(true);
    setLoading(false);
  };

  const handleIframeLoad = () => {
    console.log('Chart iframe loaded successfully for symbol:', symbolUpper);
    setLoading(false);
    setChartError(false);
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
      height: height.toString(),
      autosize: '1'
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    console.log('Generated TradingView URL for Chart component (simplified):', url);
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

  const timeframeOptions = [
    { value: '1d' as const, label: '1D' },
    { value: '5d' as const, label: '5D' },
    { value: '1m' as const, label: '1M' },
    { value: '3m' as const, label: '3M' },
    { value: '1y' as const, label: '1Y' }
  ];

  const chartTypeOptions = [
    { value: 'area-chart', label: 'Area' },
    { value: 'line-chart', label: 'Line' },
    { value: 'candlestick', label: 'Candles' }
  ];

  const openFullChart = () => {
    navigate(`/chart/${symbol}`);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-blue-600" size={20} />
          <h3 className="font-semibold text-gray-900">{symbolUpper} Chart</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={openFullChart}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            <ExternalLink size={14} />
            <span>Full Chart</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Timeframe Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <div className="flex gap-1">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeframe(option.value as any)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      timeframe === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Type Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <div className="flex gap-1">
                {chartTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setChartType(option.value as any)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      chartType === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {/* Loading State */}
        {loading && !chartError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-b-lg z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading chart...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {chartError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-b-lg z-10">
            <div className="text-center p-4">
              <p className="text-sm text-red-600 mb-2">Chart not available for {symbolUpper}</p>
              <p className="text-xs text-red-500 mb-3">
                This symbol may not have public chart data available.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={openFullChart}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Open Full Chart
                </button>
                <button
                  onClick={() => {
                    setChartError(false);
                    setLoading(true);
                    setTimeout(() => setLoading(false), 1500);
                  }}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Iframe */}
        <iframe
          key={`chart-${symbolUpper}-${timeframe}-${chartType}`}
          referrerPolicy="origin"
          width="100%"
          height={height}
          style={{
            background: "#FFFFFF",
            padding: "0",
            border: "none",
            borderRadius: "0 0 8px 8px",
            display: loading || chartError ? 'none' : 'block'
          }}
          src={getChartUrl()}
          title={`${symbolUpper} Stock Chart`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
    </div>
  );
}
