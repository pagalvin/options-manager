import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Info, User, Building } from 'lucide-react';

interface PortfolioPosition {
  positionId: number;
  accountId?: string;
  Product: {
    symbol: string;
    securityType: string;
    securitySubType?: string;
    callPut?: string;
    expiryYear?: number;
    expiryMonth?: number;
    expiryDay?: number;
    strikePrice?: number;
    expiryType?: string;
    productId?: {
      symbol: string;
      typeCode: string;
    };
  };
  osiKey?: string;
  symbolDescription: string;
  dateAcquired: number;
  pricePaid: number;
  price?: number;
  commissions: number;
  otherFees: number;
  quantity: number;
  positionIndicator: string;
  positionType: string;
  change?: number;
  changePct?: number;
  daysGain: number;
  daysGainPct: number;
  marketValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPct: number;
  pctOfPortfolio: number;
  costPerShare: number;
  todayCommissions: number;
  todayFees: number;
  todayPricePaid: number;
  todayQuantity: number;
  quotestatus?: string;
  dateTimeUTC?: number;
  adjPrevClose: number;
  lotsDetails?: string;
  quoteDetails?: string;
  Quick?: {
    lastTrade: number;
    lastTradeTime: number;
    change: number;
    changePct: number;
    volume: number;
    quoteStatus: string;
    sevenDayCurrentYield?: number;
    annualTotalReturn?: number;
    weightedAverageMaturity?: number;
  };
}

interface PortfolioTotals {
  todaysGainLoss: number;
  todaysGainLossPct: number;
  totalMarketValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  totalPricePaid: number;
  cashBalance: number;
}

interface AccountPortfolio {
  accountId: string;
  next?: string;
  totalNoOfPages?: number;
  totalPages?: number;
  nextPageNo?: string;
  Position: PortfolioPosition[];
  position?: PortfolioPosition[];
}

interface PortfolioResponse {
  PortfolioResponse?: {
    Totals?: PortfolioTotals;
    AccountPortfolio: AccountPortfolio[];
  };
  totals?: PortfolioTotals;
  accountPortfolio?: AccountPortfolio[];
}

interface AccountInfo {
  accountId: string;
  accountIdKey: string;
  accountName: string;
  accountType: string;
  institutionType: string;
  accountStatus: string;
}

interface ETradePositionsProps {
  sessionId: string;
}

export function ETradePositions({ sessionId }: ETradePositionsProps) {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper functions to extract data from potentially wrapped response
  const getPortfolioTotals = (portfolio: PortfolioResponse) => {
    return portfolio.PortfolioResponse?.Totals || portfolio.totals;
  };

  const getAccountPortfolio = (portfolio: PortfolioResponse) => {
    return portfolio.PortfolioResponse?.AccountPortfolio || portfolio.accountPortfolio || [];
  };

  const getPositions = (accountPortfolio: AccountPortfolio) => {
    return accountPortfolio.Position || accountPortfolio.position || [];
  };

  // Helper function to determine if an option is in the money
  const isOptionInTheMoney = (position: PortfolioPosition, allPositions?: PortfolioPosition[]): boolean => {
    if (position.Product?.securityType !== 'OPTN') return false;
    
    const strikePrice = position.Product?.strikePrice;
    const callPut = position.Product?.callPut;
    const optionSymbol = position.Product?.symbol;
    
    if (!strikePrice || !callPut || !optionSymbol) return false;
    
    // Try to find the underlying stock price from the same portfolio
    let underlyingPrice: number | undefined;
    if (allPositions) {
      const underlyingStock = allPositions.find(p => 
        p.Product?.securityType === 'EQ' && 
        p.Product?.symbol === optionSymbol
      );
      
      if (underlyingStock) {
        underlyingPrice = underlyingStock.Quick?.lastTrade ?? underlyingStock.price;
      }
    }
    
    // If we have the underlying price, use it for accurate ITM determination
    if (underlyingPrice) {
      if (callPut === 'CALL') {
        return underlyingPrice > strikePrice;
      } else if (callPut === 'PUT') {
        return underlyingPrice < strikePrice;
      }
    }
    
    // Fallback: analyze option price vs strike price for obvious ITM scenarios
    const optionPrice = position.Quick?.lastTrade ?? position.price ?? 0;
    const marketValue = Math.abs(position.marketValue || 0) / Math.abs(position.quantity || 1);
    
    // For calls: if option is trading well above intrinsic value threshold
    if (callPut === 'CALL' && (optionPrice > strikePrice * 0.05 || marketValue > strikePrice * 0.05)) {
      return true;
    }
    
    // For puts: if option has significant value (likely ITM)
    if (callPut === 'PUT' && optionPrice > 2.00) {
      return true;
    }
    
    return false;
  };

  // Helper function to get ITM indicator
  const getITMIndicator = (position: PortfolioPosition, allPositions?: PortfolioPosition[]) => {
    if (position.Product?.securityType !== 'OPTN') return null;
    
    const isITM = isOptionInTheMoney(position, allPositions);
    if (!isITM) return null;
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300 ml-2">
        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1"></span>
        ITM
      </span>
    );
  };

  // Helper function to get row styling for ITM options
  const getRowStyling = (position: PortfolioPosition, allPositions?: PortfolioPosition[]) => {
    if (position.Product?.securityType === 'OPTN' && isOptionInTheMoney(position, allPositions)) {
      return 'hover:bg-green-50 bg-green-25';
    }
    return 'hover:bg-gray-50';
  };

  // Sorting function for positions
  const sortPositions = (positions: PortfolioPosition[]) => {
    return [...positions].sort((a, b) => {
      const aSecurityType = a.Product?.securityType || '';
      const bSecurityType = b.Product?.securityType || '';
      
      // First sort by security type: equity (EQ) first, then options (OPTN)
      if (aSecurityType !== bSecurityType) {
        if (aSecurityType === 'EQ') return -1;
        if (bSecurityType === 'EQ') return 1;
        if (aSecurityType === 'OPTN') return -1;
        if (bSecurityType === 'OPTN') return 1;
        return aSecurityType.localeCompare(bSecurityType);
      }
      
      // Within the same security type, sort by symbol first
      const aSymbol = a.Product?.symbol || '';
      const bSymbol = b.Product?.symbol || '';
      
      if (aSymbol !== bSymbol) {
        return aSymbol.localeCompare(bSymbol);
      }
      
      // For options with the same symbol, sort by expiration date
      if (aSecurityType === 'OPTN') {
        const aYear = a.Product?.expiryYear || 0;
        const bYear = b.Product?.expiryYear || 0;
        const aMonth = a.Product?.expiryMonth || 0;
        const bMonth = b.Product?.expiryMonth || 0;
        const aDay = a.Product?.expiryDay || 0;
        const bDay = b.Product?.expiryDay || 0;
        
        if (aYear !== bYear) return aYear - bYear;
        if (aMonth !== bMonth) return aMonth - bMonth;
        if (aDay !== bDay) return aDay - bDay;
        
        // If same expiration, sort by strike price
        const aStrike = a.Product?.strikePrice || 0;
        const bStrike = b.Product?.strikePrice || 0;
        if (aStrike !== bStrike) return aStrike - bStrike;
        
        // If same strike, sort by call/put (calls first)
        const aCallPut = a.Product?.callPut || '';
        const bCallPut = b.Product?.callPut || '';
        return aCallPut.localeCompare(bCallPut);
      }
      
      return 0;
    });
  };

  // Group positions by underlying symbol (equity + its options)
  const groupPositionsByUnderlying = (positions: PortfolioPosition[]) => {
    const grouped: { [symbol: string]: PortfolioPosition[] } = {};
    
    positions.forEach(position => {
      const symbol = position.Product?.symbol || '';
      if (!grouped[symbol]) {
        grouped[symbol] = [];
      }
      grouped[symbol].push(position);
    });
    
    // Sort each group: equity first, then options by expiration
    Object.keys(grouped).forEach(symbol => {
      grouped[symbol].sort((a, b) => {
        const aSecurityType = a.Product?.securityType || '';
        const bSecurityType = b.Product?.securityType || '';
        
        // Equity first, then options
        if (aSecurityType !== bSecurityType) {
          if (aSecurityType === 'EQ') return -1;
          if (bSecurityType === 'EQ') return 1;
        }
        
        // For options, sort by expiration date
        if (aSecurityType === 'OPTN' && bSecurityType === 'OPTN') {
          const aYear = a.Product?.expiryYear || 0;
          const bYear = b.Product?.expiryYear || 0;
          const aMonth = a.Product?.expiryMonth || 0;
          const bMonth = b.Product?.expiryMonth || 0;
          const aDay = a.Product?.expiryDay || 0;
          const bDay = b.Product?.expiryDay || 0;
          
          if (aYear !== bYear) return aYear - bYear;
          if (aMonth !== bMonth) return aMonth - bMonth;
          if (aDay !== bDay) return aDay - bDay;
          
          // If same expiration, sort by strike price
          const aStrike = a.Product?.strikePrice || 0;
          const bStrike = b.Product?.strikePrice || 0;
          if (aStrike !== bStrike) return aStrike - bStrike;
          
          // If same strike, sort by call/put (calls first)
          const aCallPut = a.Product?.callPut || '';
          const bCallPut = b.Product?.callPut || '';
          return aCallPut.localeCompare(bCallPut);
        }
        
        return 0;
      });
    });
    
    return grouped;
  };
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, [sessionId]);

  // Auto-select first account when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  // Load portfolio when account is selected
  useEffect(() => {
    if (selectedAccount) {
      loadPortfolio();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setError(null);

      const response = await fetch('/api/etrade/accounts', {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const accountsData = await response.json();
      
      // Sort accounts alphabetically by accountName
      const sortedAccounts = accountsData.sort((a: AccountInfo, b: AccountInfo) => {
        const nameA = a.accountName || a.accountId || a.accountIdKey || '';
        const nameB = b.accountName || b.accountId || b.accountIdKey || '';
        return nameA.localeCompare(nameB);
      });
      
      setAccounts(sortedAccounts);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadPortfolio = async () => {
    if (!selectedAccount) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/etrade/accounts/${selectedAccount.accountIdKey}/portfolio?view=QUICK&totalsRequired=true`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const portfolioData = await response.json();
      setPortfolio(portfolioData);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError('Failed to load portfolio positions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(2)}%`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getPositionTypeColor = (positionType: string): string => {
    switch (positionType.toUpperCase()) {
      case 'LONG':
        return 'bg-green-100 text-green-800';
      case 'SHORT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSecurityTypeIcon = (securityType: string) => {
    switch (securityType.toUpperCase()) {
      case 'EQ':
        return <BarChart3 size={16} className="text-blue-600" />;
      case 'OPTN':
        return <Target size={16} className="text-purple-600" />;
      case 'MF':
      case 'MMF':
        return <Building size={16} className="text-green-600" />;
      default:
        return <DollarSign size={16} className="text-gray-600" />;
    }
  };

  const getSecurityTypeName = (securityType: string): string => {
    switch (securityType.toUpperCase()) {
      case 'EQ':
        return 'Equity';
      case 'OPTN':
        return 'Option';
      case 'MF':
        return 'Mutual Fund';
      case 'MMF':
        return 'Money Market Fund';
      case 'BOND':
        return 'Bond';
      default:
        return securityType;
    }
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading accounts...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="text-yellow-600" size={20} />
          <h3 className="font-semibold text-yellow-800">No Accounts Found</h3>
        </div>
        <p className="text-yellow-700 mb-4">
          No E*TRADE accounts were found for your authenticated session.
        </p>
        <button
          onClick={loadAccounts}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Account Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <User size={20} />
          <span>Account Selection</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <button
              key={account.accountIdKey}
              onClick={() => setSelectedAccount(account)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedAccount?.accountIdKey === account.accountIdKey
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Building size={16} className="text-gray-600" />
                <span className="font-semibold text-gray-900">{account.accountName}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Type: {account.accountType}</div>
                <div>Status: {account.accountStatus}</div>
                <div>Institution: {account.institutionType}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio Summary */}
      {selectedAccount && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <BarChart3 size={20} />
              <span>Portfolio Overview - {selectedAccount.accountName}</span>
            </h2>
            <button
              onClick={loadPortfolio}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="animate-spin mr-2" size={20} />
              <span>Loading portfolio...</span>
            </div>
          ) : portfolio ? (
            <>
              {/* Portfolio Totals */}
              {portfolio && getPortfolioTotals(portfolio) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign size={16} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Total Market Value</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(getPortfolioTotals(portfolio)!.totalMarketValue)}
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 ? 
                        <TrendingUp size={16} className="text-green-600" /> : 
                        <TrendingDown size={16} className="text-red-600" />
                      }
                      <span className={`text-sm font-medium ${
                        getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Today's Gain/Loss
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 ? '+' : ''}
                      {formatCurrency(getPortfolioTotals(portfolio)!.todaysGainLoss)}
                    </div>
                    <div className={`text-sm ${
                      getPortfolioTotals(portfolio)!.todaysGainLoss >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {getPortfolioTotals(portfolio)!.todaysGainLossPct >= 0 ? '+' : ''}
                      {formatPercentage(getPortfolioTotals(portfolio)!.todaysGainLossPct)}
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    getPortfolioTotals(portfolio)!.totalGainLoss >= 0 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {getPortfolioTotals(portfolio)!.totalGainLoss >= 0 ? 
                        <TrendingUp size={16} className="text-green-600" /> : 
                        <TrendingDown size={16} className="text-red-600" />
                      }
                      <span className={`text-sm font-medium ${
                        getPortfolioTotals(portfolio)!.totalGainLoss >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Total Gain/Loss
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${
                      getPortfolioTotals(portfolio)!.totalGainLoss >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {getPortfolioTotals(portfolio)!.totalGainLoss >= 0 ? '+' : ''}
                      {formatCurrency(getPortfolioTotals(portfolio)!.totalGainLoss)}
                    </div>
                    <div className={`text-sm ${
                      getPortfolioTotals(portfolio)!.totalGainLoss >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {getPortfolioTotals(portfolio)!.totalGainLossPct >= 0 ? '+' : ''}
                      {formatPercentage(getPortfolioTotals(portfolio)!.totalGainLossPct)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign size={16} className="text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Cash Balance</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(getPortfolioTotals(portfolio)!.cashBalance)}
                    </div>
                  </div>
                </div>
              )}

              {/* Positions Table */}
              {portfolio && getAccountPortfolio(portfolio) && getAccountPortfolio(portfolio)[0] && getPositions(getAccountPortfolio(portfolio)[0]).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Security
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Market Value
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day's Gain/Loss
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Gain/Loss
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of Portfolio
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(groupPositionsByUnderlying(sortPositions(getPositions(getAccountPortfolio(portfolio)[0]))))
                        .sort(([a], [b]) => a.localeCompare(b)) // Sort symbols alphabetically
                        .map(([symbol, positions]) => {
                          const allPositions = getPositions(getAccountPortfolio(portfolio)[0]);
                          return (
                        <React.Fragment key={symbol}>
                          {/* Symbol Header */}
                          <tr className="bg-blue-50">
                            <td colSpan={9} className="px-4 py-2 text-sm font-semibold text-blue-800 border-t border-blue-200">
                              {symbol} ({positions.length} position{positions.length !== 1 ? 's' : ''})
                            </td>
                          </tr>
                          {/* Positions for this symbol */}
                          {positions.map((position) => (
                        <tr key={position.positionId} className={getRowStyling(position, allPositions)}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`flex items-center space-x-2 ${position.Product?.securityType === 'OPTN' ? 'ml-6' : ''}`}>
                              {position.Product?.securityType === 'OPTN' && (
                                <div className="text-gray-400 mr-2">└─</div>
                              )}
                              {getSecurityTypeIcon(position.Product?.securityType)}
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {position.Product?.securityType === 'EQ' ? position.Product?.symbol : ''}
                                  {position.Product?.securityType === 'OPTN' && (
                                    <div className="flex items-center">
                                      <span className="text-purple-600">
                                        {position.Product?.callPut} ${position.Product?.strikePrice}
                                        {position.Product?.expiryMonth && position.Product?.expiryDay && position.Product?.expiryYear && (
                                          <span> ({position.Product?.expiryMonth}/{position.Product?.expiryDay}/{position.Product?.expiryYear})</span>
                                        )}
                                      </span>
                                      {getITMIndicator(position, allPositions)}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {position.symbolDescription}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900">
                                {getSecurityTypeName(position.Product?.securityType)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPositionTypeColor(position.positionType)}`}>
                              {position.positionType}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatLargeNumber(Math.abs(position.quantity))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(position.Quick?.lastTrade ?? position.price ?? 0)}
                            </div>
                            {position.Quick?.change !== undefined && (
                              <div className={`text-xs ${position.Quick.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {position.Quick.change >= 0 ? '+' : ''}
                                {formatCurrency(position.Quick.change)} 
                                ({position.Quick.changePct >= 0 ? '+' : ''}{formatPercentage(position.Quick.changePct)})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(Math.abs(position.marketValue))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${
                              position.daysGain >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.daysGain >= 0 ? '+' : ''}
                              {formatCurrency(position.daysGain)}
                            </div>
                            <div className={`text-xs ${
                              position.daysGainPct >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {position.daysGainPct >= 0 ? '+' : ''}
                              {formatPercentage(position.daysGainPct)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${
                              position.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.totalGain >= 0 ? '+' : ''}
                              {formatCurrency(position.totalGain)}
                            </div>
                            <div className={`text-xs ${
                              position.totalGainPct >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {position.totalGainPct >= 0 ? '+' : ''}
                              {formatPercentage(position.totalGainPct)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatPercentage(Math.abs(position.pctOfPortfolio))}
                          </td>
                        </tr>
                          ))}
                        </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Positions Found</h3>
                  <p className="text-gray-500">
                    This account currently has no portfolio positions to display.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
