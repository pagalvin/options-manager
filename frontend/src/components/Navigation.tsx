import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { fetchUniqueSymbols } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Transactions', href: '/transactions' },
  { name: 'Transaction Analysis', href: '/transaction-analysis' },
  { name: 'Chains', href: '/chains' },
  { name: 'Positions', href: '/positions' },
  { name: 'Options', href: '/options' },
  { name: 'Performance', href: '/performance' },
  { name: 'Premium Cash Flow', href: '/premium-cash-flow' },
  { name: 'Margin Analysis', href: '/margin-analysis' },
  { name: 'Options Analyzer', href: '/analyzer' },
  { name: 'AI Chat', href: '/chat' },
  { name: 'E*TRADE', href: '/etrade' },
  { name: 'Admin', href: '/admin' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);

  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const uniqueSymbols = await fetchUniqueSymbols();
        setSymbols(uniqueSymbols);
      } catch (error) {
        console.error('Failed to fetch symbols:', error);
        // Fallback to empty array or some default symbols
        setSymbols([]);
      } finally {
        setSymbolsLoading(false);
      }
    };

    loadSymbols();
  }, []);

  const handleStockSelect = (symbol: string) => {
    navigate(`/chart/${symbol}`);
    setShowChartDropdown(false);
  };

  const isChartActive = location.pathname.startsWith('/chart');

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Options Trading ROI Tracker
              </h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Chart Navigation with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowChartDropdown(!showChartDropdown)}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium space-x-1',
                    isChartActive
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <TrendingUp size={16} />
                  <span>Charts</span>
                  <ChevronDown size={14} className={cn(
                    'transform transition-transform',
                    showChartDropdown ? 'rotate-180' : ''
                  )} />
                </button>

                {/* Dropdown Menu */}
                {showChartDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {symbolsLoading ? 'Loading...' : 'Available Symbols'}
                      </div>
                      {symbolsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : symbols.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          No symbols found
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                          {symbols.map((symbol) => (
                            <button
                              key={symbol}
                              onClick={() => handleStockSelect(symbol)}
                              className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors text-center font-mono"
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 text-center">
                          {symbolsLoading ? 'Loading symbols...' : `${symbols.length} symbols available`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {showChartDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowChartDropdown(false)}
        />
      )}
    </nav>
  );
}
