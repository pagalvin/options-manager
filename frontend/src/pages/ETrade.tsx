import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface StockQuote {
  quoteResponse: {
    quoteData: {
      product: {
        symbol: string;
        companyName: string;
      };
      all: {
        lastTrade: number;
        bid: number;
        ask: number;
        bidSize: number;
        askSize: number;
        volume: number;
        open: number;
        high: number;
        low: number;
        close: number;
        changeClose: number;
        changeClosePercentage: number;
        lastTradeTime: number;
      };
    }[];
  };
}

interface OptionGreeks {
  rho: number;
  vega: number;
  theta: number;
  delta: number;
  gamma: number;
  iv: number;
  currentValue: boolean;
}

interface OptionData {
  optionCategory: string;
  optionRootSymbol: string;
  timeStamp: number;
  adjustedFlag: boolean;
  displaySymbol: string;
  optionType: string;
  strikePrice: number;
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  inTheMoney: string;
  volume: number;
  openInterest: number;
  netChange: number;
  lastPrice: number;
  quoteDetail: string;
  osiKey: string;
  optionGreek: OptionGreeks;
}

interface OptionChainPair {
  Call?: OptionData;
  Put?: OptionData;
  pairType?: string;
}

interface SelectedED {
  month: number;
  year: number;
  day: number;
}

interface OptionChain {
  optionPairs?: OptionChainPair[];
  OptionPair?: OptionChainPair[];
  timeStamp: number;
  quoteType: string;
  nearPrice: number;
  selected?: SelectedED;
  SelectedED?: SelectedED;
}

interface ExpirationDate {
  year: number;
  month: number;
  day: number;
  expiryType: string;
}

export function ETradePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [optionChain, setOptionChain] = useState<OptionChain | null>(null);
  const [expirationDates, setExpirationDates] = useState<ExpirationDate[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<ExpirationDate | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Check existing authentication status
  useEffect(() => {
    const storedSessionId = localStorage.getItem('etrade_session_id');
    if (storedSessionId) {
      checkAuthStatus(storedSessionId);
    }
  }, []);

  // Store session ID in localStorage when authenticated
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('etrade_session_id', sessionId);
    }
  }, [sessionId]);

  const checkAuthStatus = async (sid: string) => {
    try {
      const response = await fetch(`/api/etrade/auth/status/${sid}`);
      const data = await response.json();
      
      if (data.authenticated) {
        setAuthenticated(true);
        setSessionId(sid);
      } else {
        localStorage.removeItem('etrade_session_id');
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      localStorage.removeItem('etrade_session_id');
    }
  };

  const initiateAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/etrade/auth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Store session ID for later use
      setSessionId(data.sessionId);
      setAwaitingVerification(true);
      
      // Open E*TRADE OAuth page in new window for OOB flow
      window.open(data.authUrl, '_blank', 'width=800,height=600');
    } catch (err) {
      console.error('Error initiating auth:', err);
      setError('Failed to initiate authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeAuth = async () => {
    if (!sessionId || !verificationCode.trim()) {
      setError('Please enter the verification code from E*TRADE');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/etrade/auth/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId, 
          verifier: verificationCode.trim() 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Authentication failed: ${response.status}`);
      }

      setAuthenticated(true);
      setAwaitingVerification(false);
      setVerificationCode('');
    } catch (err) {
      console.error('Error completing auth:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/etrade/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      setAuthenticated(false);
      setSessionId(null);
      setStockQuote(null);
      setOptionChain(null);
      setExpirationDates([]);
      setSelectedExpiration(null);
      setAwaitingVerification(false);
      setVerificationCode('');
      localStorage.removeItem('etrade_session_id');
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Failed to logout properly');
    }
  };

  const fetchStockQuote = async () => {
    if (!symbol.trim() || !sessionId) return;

    try {
      setFetchingQuote(true);
      setError(null);

      const response = await fetch(`/api/etrade/quote/${encodeURIComponent(symbol.trim().toUpperCase())}`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStockQuote(data);
    } catch (err) {
      console.error('Error fetching stock quote:', err);
      setError(`Failed to fetch quote for ${symbol}`);
    } finally {
      setFetchingQuote(false);
    }
  };

  const fetchExpirationDates = async () => {
    if (!symbol.trim() || !sessionId) return;

    try {
      const response = await fetch(`/api/etrade/options/${encodeURIComponent(symbol.trim().toUpperCase())}/expirations`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setExpirationDates(data.expirationDates);
      if (data.expirationDates.length > 0) {
        setSelectedExpiration(data.expirationDates[0]);
      }
    } catch (err) {
      console.error('Error fetching expiration dates:', err);
      setError('Failed to fetch option expiration dates');
    }
  };

  const fetchOptionChain = async () => {
    if (!symbol.trim() || !sessionId) return;

    try {
      setFetchingOptions(true);
      setError(null);

      let url = `/api/etrade/options/${encodeURIComponent(symbol.trim().toUpperCase())}`;
      if (selectedExpiration) {
        const params = new URLSearchParams();
        params.append('expiryYear', selectedExpiration.year.toString());
        params.append('expiryMonth', selectedExpiration.month.toString());
        params.append('expiryDay', selectedExpiration.day.toString());
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOptionChain(data);
    } catch (err) {
      console.error('Error fetching option chain:', err);
      setError(`Failed to fetch option chain for ${symbol}`);
    } finally {
      setFetchingOptions(false);
    }
  };

  const handleSymbolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    await Promise.all([
      fetchStockQuote(),
      fetchExpirationDates()
    ]);
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

  const formatNumber = (num: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">E*TRADE Integration</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          
          {!awaitingVerification ? (
            <>
              <p className="text-gray-600 mb-4">
                To access real-time stock quotes and option chains, you need to authenticate with E*TRADE.
              </p>
              <button
                onClick={initiateAuth}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : null}
                <span>{loading ? 'Connecting...' : 'Connect to E*TRADE'}</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                A new window has opened with the E*TRADE authorization page. After granting permission, 
                copy the verification code and paste it below.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code from E*TRADE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={completeAuth}
                    disabled={loading || !verificationCode.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : null}
                    <span>{loading ? 'Verifying...' : 'Complete Authentication'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setAwaitingVerification(false);
                      setVerificationCode('');
                      setSessionId(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">E*TRADE Integration</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle2 size={20} />
            <span className="text-sm">Connected to E*TRADE</span>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Symbol Input */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Stock Quote & Option Chain</h2>
        
        <form onSubmit={handleSymbolSubmit} className="flex space-x-4 mb-4">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={fetchingQuote || !symbol.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {fetchingQuote ? <RefreshCw className="animate-spin" size={16} /> : null}
            <span>Get Quote</span>
          </button>
        </form>

        {/* Stock Quote Display */}
        {stockQuote && stockQuote.quoteResponse?.quoteData?.[0] && (
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{stockQuote.quoteResponse.quoteData[0].product.symbol}</h3>
                <p className="text-gray-600">{stockQuote.quoteResponse.quoteData[0].product.companyName}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatCurrency(stockQuote.quoteResponse.quoteData[0].all.lastTrade)}
                </div>
                <div className={`flex items-center space-x-1 ${
                  stockQuote.quoteResponse.quoteData[0].all.changeClose >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockQuote.quoteResponse.quoteData[0].all.changeClose >= 0 ? 
                    <TrendingUp size={16} /> : <TrendingDown size={16} />
                  }
                  <span>
                    {formatCurrency(stockQuote.quoteResponse.quoteData[0].all.changeClose)} 
                    ({formatPercentage(stockQuote.quoteResponse.quoteData[0].all.changeClosePercentage)})
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Bid:</span>
                <span className="ml-2 font-medium">{formatCurrency(stockQuote.quoteResponse.quoteData[0].all.bid)}</span>
              </div>
              <div>
                <span className="text-gray-500">Ask:</span>
                <span className="ml-2 font-medium">{formatCurrency(stockQuote.quoteResponse.quoteData[0].all.ask)}</span>
              </div>
              <div>
                <span className="text-gray-500">Volume:</span>
                <span className="ml-2 font-medium">{formatNumber(stockQuote.quoteResponse.quoteData[0].all.volume, 0)}</span>
              </div>
              <div>
                <span className="text-gray-500">Day Range:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(stockQuote.quoteResponse.quoteData[0].all.low)} - {formatCurrency(stockQuote.quoteResponse.quoteData[0].all.high)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Date Selector */}
        {expirationDates.length > 0 && (
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-sm font-medium text-gray-700">
              Expiration Date:
            </label>
            <select
              value={selectedExpiration ? `${selectedExpiration.year}-${selectedExpiration.month}-${selectedExpiration.day}` : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  const [year, month, day] = value.split('-').map(Number);
                  const selected = expirationDates.find(d => d.year === year && d.month === month && d.day === day);
                  setSelectedExpiration(selected || null);
                } else {
                  setSelectedExpiration(null);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select expiration date</option>
              {expirationDates.map((date) => {
                const key = `${date.year}-${date.month}-${date.day}`;
                const displayDate = new Date(date.year, date.month - 1, date.day).toLocaleDateString();
                return (
                  <option key={key} value={key}>
                    {displayDate} ({date.expiryType})
                  </option>
                );
              })}
            </select>
            <button
              onClick={fetchOptionChain}
              disabled={fetchingOptions}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {fetchingOptions ? <RefreshCw className="animate-spin" size={16} /> : null}
              <span>Get Option Chain</span>
            </button>
          </div>
        )}
      </div>

      {/* Option Chain Display */}
      {optionChain && (optionChain.optionPairs || optionChain.OptionPair) && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Option Chain - {symbol} (Expires: {selectedExpiration ? new Date(selectedExpiration.year, selectedExpiration.month - 1, selectedExpiration.day).toLocaleDateString() : 'N/A'})
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th colSpan={6} className="px-4 py-2 text-center text-sm font-medium text-gray-500 uppercase">Calls</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 uppercase">Strike</th>
                  <th colSpan={6} className="px-4 py-2 text-center text-sm font-medium text-gray-500 uppercase">Puts</th>
                </tr>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bid</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ask</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vol</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">OI</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">IV</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">IV</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">OI</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vol</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ask</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(optionChain.optionPairs || optionChain.OptionPair || []).map((pair: OptionChainPair, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* Call Options */}
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatCurrency(pair.Call.bid) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatCurrency(pair.Call.ask) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatCurrency(pair.Call.lastPrice) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatNumber(pair.Call.volume, 0) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatNumber(pair.Call.openInterest, 0) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Call ? formatPercentage(pair.Call.optionGreek.iv * 100) : '-'}</td>
                    
                    {/* Strike Price */}
                    <td className="px-2 py-2 text-sm text-center font-medium">
                      {formatCurrency(pair.Call?.strikePrice || pair.Put?.strikePrice || 0)}
                    </td>
                    
                    {/* Put Options */}
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatPercentage(pair.Put.optionGreek.iv * 100) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatNumber(pair.Put.openInterest, 0) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatNumber(pair.Put.volume, 0) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatCurrency(pair.Put.lastPrice) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatCurrency(pair.Put.ask) : '-'}</td>
                    <td className="px-2 py-2 text-sm">{pair.Put ? formatCurrency(pair.Put.bid) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
