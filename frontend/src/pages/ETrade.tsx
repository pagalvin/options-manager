import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw, TrendingUp, TrendingDown, Calendar, DollarSign, Target, Activity, Info, BarChart3, FileText } from 'lucide-react';
import { FinancialLinks } from '@/components/FinancialLinks';
import { TransactionBrowser } from '@/components/TransactionBrowser';

interface StockQuote {
  QuoteResponse: {
    QuoteData: {
      dateTime: string;
      dateTimeUTC: number;
      quoteStatus: string;
      ahFlag: string;
      All: {
        adjustedFlag: boolean;
        ask: number;
        askSize: number;
        askTime: string;
        bid: number;
        bidExchange: string;
        bidSize: number;
        bidTime: string;
        changeClose: number;
        changeClosePercentage: number;
        companyName: string;
        daysToExpiration: number;
        dirLast: string;
        dividend: number;
        eps: number;
        estEarnings: number;
        exDividendDate: number;
        high: number;
        high52: number;
        lastTrade: number;
        low: number;
        low52: number;
        open: number;
        openInterest: number;
        optionStyle: string;
        previousClose: number;
        previousDayVolume: number;
        primaryExchange: string;
        symbolDescription: string;
        totalVolume: number;
        upc: number;
        cashDeliverable: number;
        marketCap: number;
        sharesOutstanding: number;
        nextEarningDate: string;
        beta: number;
        yield: number;
        declaredDividend: number;
        dividendPayableDate: number;
        pe: number;
        week52LowDate: number;
        week52HiDate: number;
        intrinsicValue: number;
        timePremium: number;
        optionMultiplier: number;
        contractSize: number;
        expirationDate: number;
        timeOfLastTrade: number;
        averageVolume: number;
      };
      Product: {
        symbol: string;
        securityType: string;
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
  OptionGreeks: OptionGreeks;
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
  const [environment, setEnvironment] = useState<'SANDBOX' | 'LIVE'>('SANDBOX');
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [credentialsAvailable, setCredentialsAvailable] = useState(true);
  const [showFullChain, setShowFullChain] = useState(false);
  
  // Submenu state
  const [activeSubmenu, setActiveSubmenu] = useState<'quotes' | 'transactions'>('quotes');
  
  // Read query params (e.g., ?symbol=DVN)
  const [searchParams] = useSearchParams();
  const [autoInitDone, setAutoInitDone] = useState(false);
  const [autoFetchChain, setAutoFetchChain] = useState(false);

  // Check existing authentication status
  useEffect(() => {
    const storedSessionId = localStorage.getItem('etrade_session_id');
    if (storedSessionId) {
      checkAuthStatus(storedSessionId);
    }
    
    // Load current environment
    loadEnvironment();
  }, []);

  // If symbol query param exists, set it once on mount
  useEffect(() => {
    const qp = searchParams.get('symbol');
    if (qp && !autoInitDone) {
      setSymbol(qp.toUpperCase());
    }
  }, [searchParams, autoInitDone]);

  // Store session ID in localStorage when authenticated
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('etrade_session_id', sessionId);
    }
  }, [sessionId]);

  // After authenticated and if a query param symbol exists, auto fetch quote and expirations
  useEffect(() => {
    const qp = searchParams.get('symbol');
    if (!qp) return;
    if (!authenticated || !sessionId) return;
    if (autoInitDone) return;

    const run = async () => {
      try {
        const upper = qp.toUpperCase();
        setSymbol(upper);
        await Promise.all([
          fetchStockQuote(),
          fetchExpirationDates()
        ]);
        // Once expirations are loaded (selectedExpiration set to first), trigger chain fetch in next effect
        setAutoFetchChain(true);
      } finally {
        setAutoInitDone(true);
      }
    };

    run();
  }, [authenticated, sessionId, searchParams, autoInitDone]);

  // Once we have a selected expiration and were auto-initializing, fetch the first option chain
  useEffect(() => {
    if (!autoFetchChain) return;
    if (!selectedExpiration) return;
    fetchOptionChain();
    setAutoFetchChain(false);
  }, [autoFetchChain, selectedExpiration]);

  const loadEnvironment = async () => {
    try {
      const response = await fetch('/api/etrade/environment');
      const data = await response.json();
      setEnvironment(data.environment);
      setCredentialsAvailable(data.credentialsAvailable);
    } catch (err) {
      console.error('Error loading environment:', err);
    }
  };

  const switchEnvironment = async (sandbox: boolean) => {
    try {
      setEnvironmentLoading(true);
      const response = await fetch('/api/etrade/environment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandbox }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch environment');
      }
      
      const data = await response.json();
      setEnvironment(data.environment);
      setCredentialsAvailable(data.credentialsAvailable);
      
      // Show warning when switching to environment without credentials
      if (!data.credentialsAvailable) {
        const env = data.environment;
        setError(`No ${env} credentials configured. Please add ${env}_CONSUMER_KEY and ${env}_CONSUMER_SECRET to your .env file.`);
      } else if (data.environment === 'LIVE') {
        setError('Note: LIVE environment uses production API credentials and real trading data.');
      } else {
        setError(null);
      }
      
      // Clear authentication when switching environments
      if (authenticated) {
        setAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem('etrade_session_id');
      }
    } catch (err) {
      console.error('Error switching environment:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch environment');
    } finally {
      setEnvironmentLoading(false);
    }
  };

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
      
      // Handle the OptionChainResponse wrapper structure
      if (data.OptionChainResponse) {
        const optionChainData = {
          ...data.OptionChainResponse,
          OptionPair: data.OptionChainResponse.OptionPair || [],
          SelectedED: data.OptionChainResponse.SelectedED
        };
        setOptionChain(optionChainData);
      } else {
        setOptionChain(data);
      }
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

  const getDaysToExpiration = (expirationDate: ExpirationDate): number => {
    const expiry = new Date(expirationDate.year, expirationDate.month - 1, expirationDate.day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBidAskSpread = (bid: number, ask: number): { spread: number; spreadPercent: number } => {
    const spread = ask - bid;
    const midpoint = (bid + ask) / 2;
    const spreadPercent = midpoint > 0 ? (spread / midpoint) * 100 : 0;
    return { spread, spreadPercent };
  };

  const getSpreadQuality = (spreadPercent: number): { color: string; label: string } => {
    if (spreadPercent <= 2) return { color: 'text-green-600', label: 'Tight' };
    if (spreadPercent <= 5) return { color: 'text-yellow-600', label: 'Moderate' };
    return { color: 'text-red-600', label: 'Wide' };
  };

  const getLiquidityIndicator = (volume: number, openInterest: number): { score: number; label: string; color: string } => {
    const totalActivity = volume + (openInterest * 0.1); // Weight OI less than volume
    if (totalActivity >= 1000) return { score: 5, label: 'Excellent', color: 'text-green-600' };
    if (totalActivity >= 500) return { score: 4, label: 'Good', color: 'text-green-500' };
    if (totalActivity >= 100) return { score: 3, label: 'Fair', color: 'text-yellow-600' };
    if (totalActivity >= 25) return { score: 2, label: 'Poor', color: 'text-orange-600' };
    return { score: 1, label: 'Very Poor', color: 'text-red-600' };
  };

  const getMoneyness = (strike: number, stockPrice: number, isCall: boolean): { label: string; color: string } => {
    const diff = stockPrice - strike;
    if (isCall) {
      if (diff > 0) return { label: 'ITM', color: 'bg-green-100 text-green-800' };
      if (Math.abs(diff) <= stockPrice * 0.02) return { label: 'ATM', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'OTM', color: 'bg-gray-100 text-gray-800' };
    } else {
      if (diff < 0) return { label: 'ITM', color: 'bg-green-100 text-green-800' };
      if (Math.abs(diff) <= stockPrice * 0.02) return { label: 'ATM', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'OTM', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">E*TRADE Integration</h1>
          
          {/* Environment Toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">API Environment:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${environment === 'SANDBOX' ? 'text-blue-600' : 'text-gray-500'}`}>
                  SANDBOX
                </span>
                <button
                  onClick={() => !environmentLoading && switchEnvironment(environment === 'SANDBOX' ? false : true)}
                  disabled={environmentLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    environment === 'LIVE' 
                      ? 'bg-red-600' 
                      : 'bg-blue-600'
                  } ${environmentLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      environment === 'LIVE' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${environment === 'LIVE' ? 'text-red-600' : 'text-gray-500'}`}>
                  LIVE
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {environment === 'SANDBOX' 
                ? 'Using test environment with fake data' 
                : 'Using live trading environment with real market data'}
              {!credentialsAvailable && (
                <span className="text-red-600 font-medium"> - No credentials configured</span>
              )}
            </div>
          </div>
        </div>
        
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
        <div className="flex flex-col space-y-4">
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
          
          {/* Environment Toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">API Environment:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${environment === 'SANDBOX' ? 'text-blue-600' : 'text-gray-500'}`}>
                  SANDBOX
                </span>
                <button
                  onClick={() => !environmentLoading && switchEnvironment(environment === 'SANDBOX' ? false : true)}
                  disabled={environmentLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    environment === 'LIVE' 
                      ? 'bg-red-600' 
                      : 'bg-blue-600'
                  } ${environmentLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      environment === 'LIVE' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${environment === 'LIVE' ? 'text-red-600' : 'text-gray-500'}`}>
                  LIVE
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {environment === 'SANDBOX' 
                ? 'Using test environment with fake data' 
                : 'Using live trading environment with real market data'}
              {!credentialsAvailable && (
                <span className="text-red-600 font-medium"> - No credentials configured</span>
              )}
            </div>
          </div>

          {/* Submenu Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveSubmenu('quotes')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeSubmenu === 'quotes'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={16} />
                    <span>Quotes & Options</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveSubmenu('transactions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeSubmenu === 'transactions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText size={16} />
                    <span>Transactions</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Content based on active submenu */}
        {activeSubmenu === 'quotes' ? (
          <div className="space-y-6">
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
        {stockQuote && stockQuote.QuoteResponse?.QuoteData?.[0] && (
          <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stockQuote.QuoteResponse.QuoteData[0].Product.symbol}
                  <FinancialLinks security={stockQuote.QuoteResponse.QuoteData[0].Product.symbol} />
                  </h3>
                <p className="text-gray-600 text-lg">{stockQuote.QuoteResponse.QuoteData[0].All.companyName}</p>
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(stockQuote.QuoteResponse.QuoteData[0].All.timeOfLastTrade * 1000).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.lastTrade)}
                </div>
                <div className={`flex items-center justify-end space-x-1 text-lg ${
                  stockQuote.QuoteResponse.QuoteData[0].All.changeClose >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockQuote.QuoteResponse.QuoteData[0].All.changeClose >= 0 ? 
                    <TrendingUp size={20} /> : <TrendingDown size={20} />
                  }
                  <span>
                    {stockQuote.QuoteResponse.QuoteData[0].All.changeClose >= 0 ? '+' : ''}
                    {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.changeClose)} 
                    ({stockQuote.QuoteResponse.QuoteData[0].All.changeClosePercentage >= 0 ? '+' : ''}
                    {formatPercentage(stockQuote.QuoteResponse.QuoteData[0].All.changeClosePercentage)})
                  </span>
                </div>
              </div>
            </div>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign size={16} className="text-blue-600" />
                  <span className="text-xs text-gray-500 font-medium">BID</span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.bid)}</div>
                <div className="text-xs text-gray-500">Size: {formatLargeNumber(stockQuote.QuoteResponse.QuoteData[0].All.bidSize)}</div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign size={16} className="text-red-600" />
                  <span className="text-xs text-gray-500 font-medium">ASK</span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.ask)}</div>
                <div className="text-xs text-gray-500">Size: {formatLargeNumber(stockQuote.QuoteResponse.QuoteData[0].All.askSize)}</div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <Activity size={16} className="text-purple-600" />
                  <span className="text-xs text-gray-500 font-medium">VOLUME</span>
                </div>
                <div className="text-lg font-semibold">{formatLargeNumber(stockQuote.QuoteResponse.QuoteData[0].All.totalVolume)}</div>
                <div className="text-xs text-gray-500">Avg: {formatLargeNumber(stockQuote.QuoteResponse.QuoteData[0].All.averageVolume)}</div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <BarChart3 size={16} className="text-green-600" />
                  <span className="text-xs text-gray-500 font-medium">52W RANGE</span>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.low52)}
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.high52)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <Target size={16} className="text-orange-600" />
                  <span className="text-xs text-gray-500 font-medium">MARKET CAP</span>
                </div>
                <div className="text-lg font-semibold">
                  {formatLargeNumber(stockQuote.QuoteResponse.QuoteData[0].All.marketCap)}
                </div>
                <div className="text-xs text-gray-500">P/E: {stockQuote.QuoteResponse.QuoteData[0].All.pe > 0 ? stockQuote.QuoteResponse.QuoteData[0].All.pe.toFixed(1) : 'N/A'}</div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <Info size={16} className="text-gray-600" />
                  <span className="text-xs text-gray-500 font-medium">EPS / BETA</span>
                </div>
                <div className="text-sm font-semibold">EPS: ${stockQuote.QuoteResponse.QuoteData[0].All.eps > 0 ? stockQuote.QuoteResponse.QuoteData[0].All.eps.toFixed(2) : 'N/A'}</div>
                <div className="text-sm font-semibold">β: {stockQuote.QuoteResponse.QuoteData[0].All.beta > 0 ? stockQuote.QuoteResponse.QuoteData[0].All.beta.toFixed(2) : 'N/A'}</div>
              </div>
            </div>

            {/* Additional Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500 font-medium mb-1">TODAY'S RANGE</div>
                <div className="text-sm">
                  {stockQuote.QuoteResponse.QuoteData[0].All.low > 0 && stockQuote.QuoteResponse.QuoteData[0].All.high > 0 ? (
                    <div>
                      <span className="font-semibold">{formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.low)}</span>
                      <span className="text-gray-400 mx-2">—</span>
                      <span className="font-semibold">{formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.high)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">Not available during market hours</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500 font-medium mb-1">OPEN PRICE</div>
                <div className="text-lg font-semibold">
                  {stockQuote.QuoteResponse.QuoteData[0].All.open > 0 ? (
                    formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.open)
                  ) : (
                    <span className="text-gray-500 text-sm">Pre-market</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500 font-medium mb-1">PREVIOUS CLOSE</div>
                <div className="text-lg font-semibold">{formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.previousClose)}</div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-xs text-gray-500 font-medium mb-1">EXCHANGE</div>
                <div className="text-sm font-semibold">{stockQuote.QuoteResponse.QuoteData[0].All.primaryExchange}</div>
                <div className="text-xs text-gray-500">
                  {stockQuote.QuoteResponse.QuoteData[0].quoteStatus === 'REALTIME' ? 'Real-time' : 'Delayed'}
                </div>
              </div>
            </div>

            {/* Bid-Ask Spread Analysis */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Market Spread Analysis</h4>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Bid-Ask Spread: </span>
                  <span className="font-medium">
                    {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({formatPercentage(((stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid) / 
                    ((stockQuote.QuoteResponse.QuoteData[0].All.ask + stockQuote.QuoteResponse.QuoteData[0].All.bid) / 2)) * 100)})
                  </span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  ((stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid) / 
                  ((stockQuote.QuoteResponse.QuoteData[0].All.ask + stockQuote.QuoteResponse.QuoteData[0].All.bid) / 2)) * 100 <= 0.5 
                    ? 'bg-green-100 text-green-800' 
                    : ((stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid) / 
                    ((stockQuote.QuoteResponse.QuoteData[0].All.ask + stockQuote.QuoteResponse.QuoteData[0].All.bid) / 2)) * 100 <= 1.0
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {((stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid) / 
                  ((stockQuote.QuoteResponse.QuoteData[0].All.ask + stockQuote.QuoteResponse.QuoteData[0].All.bid) / 2)) * 100 <= 0.5 
                    ? 'Tight' 
                    : ((stockQuote.QuoteResponse.QuoteData[0].All.ask - stockQuote.QuoteResponse.QuoteData[0].All.bid) / 
                    ((stockQuote.QuoteResponse.QuoteData[0].All.ask + stockQuote.QuoteResponse.QuoteData[0].All.bid) / 2)) * 100 <= 1.0
                    ? 'Moderate'
                    : 'Wide'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Date Selector */}
        {expirationDates.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Options Chain</h4>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-blue-600" />
                <span className="text-sm text-gray-600">{expirationDates.length} expiration dates available</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
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
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                  <option value="">Select expiration date</option>
                  {expirationDates.map((date) => {
                    const key = `${date.year}-${date.month}-${date.day}`;
                    const displayDate = new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const daysToExp = getDaysToExpiration(date);
                    return (
                      <option key={key} value={key}>
                        {displayDate} • {daysToExp} days • {date.expiryType}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedExpiration && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Days to expiry:</span>
                    <span className={`font-semibold px-2 py-1 rounded ${
                      getDaysToExpiration(selectedExpiration) <= 7 
                        ? 'bg-red-100 text-red-800' 
                        : getDaysToExpiration(selectedExpiration) <= 30
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {getDaysToExpiration(selectedExpiration)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">{selectedExpiration.expiryType}</span>
                  </div>
                </div>
              )}

              <button
                onClick={fetchOptionChain}
                disabled={fetchingOptions || !selectedExpiration}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {fetchingOptions ? <RefreshCw className="animate-spin" size={16} /> : null}
                <span>Get Option Chain</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Option Chain Display */}
      {optionChain && (optionChain.optionPairs || optionChain.OptionPair) && stockQuote && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Option Chain - {symbol}
              </h2>
              <p className="text-sm text-gray-600">
                Expires: {selectedExpiration ? new Date(selectedExpiration.year, selectedExpiration.month - 1, selectedExpiration.day).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A'} 
                {selectedExpiration && (
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    getDaysToExpiration(selectedExpiration) <= 7 
                      ? 'bg-red-100 text-red-800' 
                      : getDaysToExpiration(selectedExpiration) <= 30
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {getDaysToExpiration(selectedExpiration)} days remaining
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Current Stock Price</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(stockQuote.QuoteResponse.QuoteData[0].All.lastTrade)}
              </div>
            </div>
          </div>

          {/* Options Chain Display Toggle */}
          <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Display Options:</span>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFullChain}
                  onChange={(e) => setShowFullChain(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {showFullChain ? 'Show Full Chain' : 'Show Limited Chain (5 ITM + 5 OTM)'}
                </span>
              </label>
            </div>
            <div className="text-xs text-gray-500">
              {showFullChain 
                ? `Showing all ${(optionChain.optionPairs || optionChain.OptionPair || []).length} strike prices`
                : 'Showing limited view for better focus'
              }
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th colSpan={8} className="px-4 py-3 text-center text-sm font-semibold text-green-700 uppercase bg-green-50">
                    Call Options
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase bg-gray-100">
                    Strike Price
                  </th>
                  <th colSpan={8} className="px-4 py-3 text-center text-sm font-semibold text-red-700 uppercase bg-red-50">
                    Put Options
                  </th>
                </tr>
                <tr className="bg-gray-50">
                  {/* Call Headers */}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">ITM</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bid</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Ask</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Last</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Vol</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">OI</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">IV</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Liq</th>
                  
                  {/* Strike Header */}
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase bg-gray-100">Strike</th>
                  
                  {/* Put Headers */}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Liq</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">IV</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">OI</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Vol</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Last</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Ask</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bid</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">ITM</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const allPairs = optionChain.optionPairs || optionChain.OptionPair || [];
                  const currentPrice = stockQuote.QuoteResponse.QuoteData[0].All.lastTrade;
                  
                  let filteredPairs = allPairs;
                  
                  if (!showFullChain) {
                    // Sort pairs by strike price
                    const sortedPairs = [...allPairs].sort((a, b) => {
                      const strikeA = a.Call?.strikePrice || a.Put?.strikePrice || 0;
                      const strikeB = b.Call?.strikePrice || b.Put?.strikePrice || 0;
                      return strikeA - strikeB;
                    });
                    
                    // Find ATM (at-the-money) index
                    const atmIndex = sortedPairs.findIndex(pair => {
                      const strikePrice = pair.Call?.strikePrice || pair.Put?.strikePrice || 0;
                      return strikePrice >= currentPrice;
                    });
                    
                    if (atmIndex >= 0) {
                      // Show 5 ITM (below ATM) + ATM + 4 OTM (above ATM) = ~10 total
                      const startIndex = Math.max(0, atmIndex - 5);
                      const endIndex = Math.min(sortedPairs.length, atmIndex + 5);
                      filteredPairs = sortedPairs.slice(startIndex, endIndex);
                    } else {
                      // Fallback: show first 10 if can't find ATM
                      filteredPairs = sortedPairs.slice(0, 10);
                    }
                  }
                  
                  return filteredPairs.map((pair: OptionChainPair, index: number) => {
                  const currentPrice = stockQuote.QuoteResponse.QuoteData[0].All.lastTrade;
                  const strikePrice = pair.Call?.strikePrice || pair.Put?.strikePrice || 0;
                  
                  // Call option analysis
                  const callMoneyness = pair.Call ? getMoneyness(strikePrice, currentPrice, true) : null;
                  const callSpread = pair.Call ? calculateBidAskSpread(pair.Call.bid, pair.Call.ask) : null;
                  const callSpreadQuality = callSpread ? getSpreadQuality(callSpread.spreadPercent) : null;
                  const callLiquidity = pair.Call ? getLiquidityIndicator(pair.Call.volume, pair.Call.openInterest) : null;
                  
                  // Put option analysis
                  const putMoneyness = pair.Put ? getMoneyness(strikePrice, currentPrice, false) : null;
                  const putSpread = pair.Put ? calculateBidAskSpread(pair.Put.bid, pair.Put.ask) : null;
                  const putSpreadQuality = putSpread ? getSpreadQuality(putSpread.spreadPercent) : null;
                  const putLiquidity = pair.Put ? getLiquidityIndicator(pair.Put.volume, pair.Put.openInterest) : null;

                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${
                      Math.abs(strikePrice - currentPrice) <= currentPrice * 0.02 ? 'bg-yellow-50' : ''
                    }`}>
                      {/* Call Options */}
                      <td className="px-2 py-3">
                        {callMoneyness && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${callMoneyness.color}`}>
                            {callMoneyness.label}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm font-medium">
                        {pair.Call ? formatCurrency(pair.Call.bid) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm font-medium">
                        {pair.Call ? formatCurrency(pair.Call.ask) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm">
                        {pair.Call ? (
                          <div>
                            <div className="font-medium">{formatCurrency(pair.Call.lastPrice)}</div>
                            {pair.Call.netChange !== 0 && (
                              <div className={`text-xs ${pair.Call.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pair.Call.netChange >= 0 ? '+' : ''}{formatCurrency(pair.Call.netChange)}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm">{pair.Call ? formatLargeNumber(pair.Call.volume) : '-'}</td>
                      <td className="px-2 py-3 text-sm">{pair.Call ? formatLargeNumber(pair.Call.openInterest) : '-'}</td>
                      <td className="px-2 py-3 text-sm">
                        {pair.Call ? (
                          <div>
                            <div className="font-medium">{formatPercentage(pair.Call.OptionGreeks.iv * 100)}</div>
                            {callSpreadQuality && (
                              <div className={`text-xs ${callSpreadQuality.color}`}>
                                {callSpreadQuality.label}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm">
                        {callLiquidity && (
                          <div className={`px-2 py-1 rounded text-xs font-medium text-center ${
                            callLiquidity.score >= 4 ? 'bg-green-100 text-green-800' :
                            callLiquidity.score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {callLiquidity.score}/5
                          </div>
                        )}
                      </td>
                      
                      {/* Strike Price */}
                      <td className={`px-2 py-3 text-sm text-center font-bold bg-gray-50 ${
                        Math.abs(strikePrice - currentPrice) <= currentPrice * 0.02 ? 'bg-yellow-100 text-yellow-900' : 'text-gray-900'
                      }`}>
                        {formatCurrency(strikePrice)}
                      </td>
                      
                      {/* Put Options */}
                      <td className="px-2 py-3 text-sm">
                        {putLiquidity && (
                          <div className={`px-2 py-1 rounded text-xs font-medium text-center ${
                            putLiquidity.score >= 4 ? 'bg-green-100 text-green-800' :
                            putLiquidity.score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {putLiquidity.score}/5
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm">
                        {pair.Put ? (
                          <div>
                            <div className="font-medium">{formatPercentage(pair.Put.OptionGreeks.iv * 100)}</div>
                            {putSpreadQuality && (
                              <div className={`text-xs ${putSpreadQuality.color}`}>
                                {putSpreadQuality.label}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm">{pair.Put ? formatLargeNumber(pair.Put.openInterest) : '-'}</td>
                      <td className="px-2 py-3 text-sm">{pair.Put ? formatLargeNumber(pair.Put.volume) : '-'}</td>
                      <td className="px-2 py-3 text-sm">
                        {pair.Put ? (
                          <div>
                            <div className="font-medium">{formatCurrency(pair.Put.lastPrice)}</div>
                            {pair.Put.netChange !== 0 && (
                              <div className={`text-xs ${pair.Put.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pair.Put.netChange >= 0 ? '+' : ''}{formatCurrency(pair.Put.netChange)}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm font-medium">
                        {pair.Put ? formatCurrency(pair.Put.ask) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm font-medium">
                        {pair.Put ? formatCurrency(pair.Put.bid) : '-'}
                      </td>
                      <td className="px-2 py-3">
                        {putMoneyness && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${putMoneyness.color}`}>
                            {putMoneyness.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* 1% Gain Opportunities Analysis */}
          {(() => {
            const currentPrice = stockQuote.QuoteResponse.QuoteData[0].All.lastTrade;
            
            // Debug: Let's see what we're working with
            const allCallOptions = (optionChain.optionPairs || optionChain.OptionPair || [])
              .filter(pair => pair.Call)
              .map(pair => ({
                strike: pair.Call!.strikePrice,
                bid: pair.Call!.bid,
                inTheMoney: pair.Call!.inTheMoney,
                premium: pair.Call!.bid,
                totalRevenue: pair.Call!.strikePrice + pair.Call!.bid,
                absoluteGain: (pair.Call!.strikePrice + pair.Call!.bid) - currentPrice,
                gainPercent: (((pair.Call!.strikePrice + pair.Call!.bid) - currentPrice) / currentPrice) * 100
              }));
            
            console.log('Current Price:', currentPrice);
            console.log('All Call Options Debug:', allCallOptions);
            
            const onePercentGainOpportunities = (optionChain.optionPairs || optionChain.OptionPair || [])
              .map(pair => {
                const results = [];
                
                // Check call options (only ITM options for covered call opportunities)
                if (pair.Call && pair.Call.inTheMoney === 'y' && pair.Call.bid > 0) {
                  const strikePrice = pair.Call.strikePrice;
                  const premium = pair.Call.bid; // Use bid price for conservative estimate
                  const totalRevenue = strikePrice + premium; // Strike price + premium received
                  const absoluteGain = totalRevenue - currentPrice; // Absolute gain from the strategy
                  const gainPercent = (absoluteGain / currentPrice) * 100; // Absolute gain percentage
                  
                  console.log(`ITM Option - Strike: ${strikePrice}, Premium: ${premium}, Total: ${totalRevenue}, Current: ${currentPrice}, Absolute Gain: ${absoluteGain}, Gain %: ${gainPercent}`);
                  
                  if (gainPercent >= 1) { // 1% or higher absolute gain
                    results.push({
                      type: 'Call',
                      option: pair.Call,
                      strikePrice,
                      premium,
                      totalRevenue,
                      gainPercent,
                      gainAmount: absoluteGain,
                      annualizedReturn: selectedExpiration ? (gainPercent * 365) / getDaysToExpiration(selectedExpiration) : 0
                    });
                  }
                }
                
                return results;
              })
              .flat()
              .filter(opp => opp.gainPercent >= 1) // 1% or higher absolute gain
              .sort((a, b) => b.gainPercent - a.gainPercent);

            console.log('1% Gain Opportunities Found:', onePercentGainOpportunities);

            // Always show the section for debugging
            return (
              <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="text-emerald-600" size={24} />
                  <h3 className="text-xl font-semibold text-emerald-800">
                    1%+ Gain Opportunities
                  </h3>
                  <div className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-sm font-medium">
                    {onePercentGainOpportunities.length} opportunities
                  </div>
                </div>
                
                <p className="text-sm text-emerald-700 mb-4">
                  In-the-money call options that would generate 1% or more absolute gain: ((Strike Price + Premium) - Purchase Price) ÷ Purchase Price ≥ 1%.
                </p>

                {onePercentGainOpportunities.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">No opportunities found</h4>
                    <div className="text-sm text-yellow-700">
                      <div>• Current stock price: {formatCurrency(currentPrice)}</div>
                      <div>• Total call options: {allCallOptions.length}</div>
                      <div>• Total ITM call options: {allCallOptions.filter(opt => opt.inTheMoney === 'y').length}</div>
                      <div>• ITM options with positive bid: {allCallOptions.filter(opt => opt.inTheMoney === 'y' && opt.bid > 0).length}</div>
                      <div className="mt-2">
                        <strong>Debug: ITM values found:</strong>
                        {allCallOptions.slice(0, 5).map((opt, i) => (
                          <div key={i} className="ml-2 text-xs">
                            Strike ${opt.strike}: ITM="{opt.inTheMoney}", Bid=${opt.bid.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <strong>Sample calculations for ITM options:</strong>
                        {allCallOptions.filter(opt => opt.inTheMoney === 'y' && opt.bid > 0).slice(0, 3).map((opt, i) => (
                          <div key={i} className="ml-2 text-xs">
                            Strike ${opt.strike}: (${opt.strike} + ${opt.premium.toFixed(2)}) - ${currentPrice} = ${opt.absoluteGain.toFixed(2)} ({opt.gainPercent.toFixed(2)}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-emerald-200">
                      <thead className="bg-emerald-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Strike Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Premium (Bid)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Gain Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Gain %
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Annualized Return
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-emerald-800 uppercase tracking-wider">
                            Greeks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-emerald-100">
                        {onePercentGainOpportunities.map((opportunity, index) => (
                          <tr key={index} className="hover:bg-emerald-25">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-bold text-gray-900">
                                  {formatCurrency(opportunity.strikePrice)}
                                </div>
                                <div className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  ITM
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrency(opportunity.premium)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-emerald-700">
                              {formatCurrency(opportunity.totalRevenue)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                              +{formatCurrency(opportunity.gainAmount)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                              <div className={`text-sm font-bold ${
                                opportunity.gainPercent >= 5 ? 'text-emerald-700' :
                                opportunity.gainPercent >= 3 ? 'text-emerald-600' :
                                'text-emerald-500'
                              }`}>
                                +{opportunity.gainPercent.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className={`text-sm font-semibold ${
                                opportunity.annualizedReturn >= 50 ? 'text-emerald-700' :
                                opportunity.annualizedReturn >= 25 ? 'text-emerald-600' :
                                'text-emerald-500'
                              }`}>
                                {opportunity.annualizedReturn.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                annualized
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs space-y-1">
                                <div>
                                  <span className="text-gray-500">Δ:</span>
                                  <span className="font-medium ml-1">{opportunity.option.OptionGreeks.delta.toFixed(3)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">IV:</span>
                                  <span className="font-medium ml-1">{formatPercentage(opportunity.option.OptionGreeks.iv * 100)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Vol:</span>
                                  <span className="font-medium ml-1">{formatLargeNumber(opportunity.option.volume)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 bg-white p-4 rounded-lg border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 mb-2 flex items-center space-x-2">
                    <Info size={16} />
                    <span>Analysis Notes</span>
                  </h4>
                  <div className="text-sm text-emerald-700 space-y-1">
                    <div>• <strong>Current Stock Price:</strong> {formatCurrency(currentPrice)}</div>
                    <div>• <strong>Strategy:</strong> Covered call - sell call options on owned stock</div>
                    <div>• <strong>Absolute Gain Calculation:</strong> (Strike Price + Premium) - Current Stock Price</div>
                    <div>• <strong>Gain Percentage:</strong> (Absolute Gain ÷ Current Stock Price) × 100</div>
                    <div>• <strong>Threshold:</strong> Looking for absolute gain ≥ 1%</div>
                    <div>• <strong>Risk:</strong> Stock will be called away if price stays above strike at expiration</div>
                    <div>• <strong>Premium Basis:</strong> Using bid price for conservative estimates</div>
                    <div>• <strong>Annualized Return:</strong> Based on {selectedExpiration ? getDaysToExpiration(selectedExpiration) : 0} days to expiration</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Option Chain Summary and Greeks */}
          <div className="mt-6 space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Call Option Insights</h4>
                <div className="text-sm text-green-700">
                  <div>Total Call Volume: {formatLargeNumber((optionChain.optionPairs || optionChain.OptionPair || [])
                    .reduce((sum, pair) => sum + (pair.Call?.volume || 0), 0))}</div>
                  <div>Total Call OI: {formatLargeNumber((optionChain.optionPairs || optionChain.OptionPair || [])
                    .reduce((sum, pair) => sum + (pair.Call?.openInterest || 0), 0))}</div>
                  <div className="mt-2">
                    <div className="text-xs text-green-600">Most Active Call:</div>
                    <div className="font-medium">
                      {(() => {
                        const mostActiveCall = (optionChain.optionPairs || optionChain.OptionPair || [])
                          .filter(pair => pair.Call)
                          .sort((a, b) => (b.Call?.volume || 0) - (a.Call?.volume || 0))[0]?.Call;
                        return mostActiveCall ? `$${mostActiveCall.strikePrice} (${formatLargeNumber(mostActiveCall.volume)} vol)` : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Market Analysis</h4>
                <div className="text-sm text-blue-700">
                  <div>Expiration: {selectedExpiration ? getDaysToExpiration(selectedExpiration) : 0} days</div>
                  <div>Chain Timestamp: {new Date(optionChain.timeStamp).toLocaleTimeString()}</div>
                  <div className="mt-2">
                    <div className="text-xs text-blue-600">Total Volume:</div>
                    <div className="font-medium">
                      {formatLargeNumber((optionChain.optionPairs || optionChain.OptionPair || [])
                        .reduce((sum, pair) => sum + (pair.Call?.volume || 0) + (pair.Put?.volume || 0), 0))}
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="text-xs text-blue-600">Put/Call Ratio:</div>
                    <div className="font-medium">
                      {(() => {
                        const callVol = (optionChain.optionPairs || optionChain.OptionPair || [])
                          .reduce((sum, pair) => sum + (pair.Call?.volume || 0), 0);
                        const putVol = (optionChain.optionPairs || optionChain.OptionPair || [])
                          .reduce((sum, pair) => sum + (pair.Put?.volume || 0), 0);
                        return callVol > 0 ? (putVol / callVol).toFixed(2) : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Put Option Insights</h4>
                <div className="text-sm text-red-700">
                  <div>Total Put Volume: {formatLargeNumber((optionChain.optionPairs || optionChain.OptionPair || [])
                    .reduce((sum, pair) => sum + (pair.Put?.volume || 0), 0))}</div>
                  <div>Total Put OI: {formatLargeNumber((optionChain.optionPairs || optionChain.OptionPair || [])
                    .reduce((sum, pair) => sum + (pair.Put?.openInterest || 0), 0))}</div>
                  <div className="mt-2">
                    <div className="text-xs text-red-600">Most Active Put:</div>
                    <div className="font-medium">
                      {(() => {
                        const mostActivePut = (optionChain.optionPairs || optionChain.OptionPair || [])
                          .filter(pair => pair.Put)
                          .sort((a, b) => (b.Put?.volume || 0) - (a.Put?.volume || 0))[0]?.Put;
                        return mostActivePut ? `$${mostActivePut.strikePrice} (${formatLargeNumber(mostActivePut.volume)} vol)` : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Greeks Analysis */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-4 flex items-center space-x-2">
                <BarChart3 size={20} />
                <span>Option Greeks Analysis</span>
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ATM Call Greeks */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-800 mb-3">At-The-Money Call Greeks</h5>
                  {(() => {
                    const currentPrice = stockQuote.QuoteResponse.QuoteData[0].All.lastTrade;
                    const atmCall = (optionChain.optionPairs || optionChain.OptionPair || [])
                      .filter(pair => pair.Call)
                      .sort((a, b) => Math.abs((a.Call?.strikePrice || 0) - currentPrice) - Math.abs((b.Call?.strikePrice || 0) - currentPrice))[0]?.Call;
                    
                    if (!atmCall) return <div className="text-gray-500">No call data available</div>;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Strike:</span>
                          <span className="font-semibold">{formatCurrency(atmCall.strikePrice)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Delta:</div>
                            <div className="font-semibold text-blue-600">{atmCall.OptionGreeks.delta.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Gamma:</div>
                            <div className="font-semibold text-green-600">{atmCall.OptionGreeks.gamma.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Theta:</div>
                            <div className="font-semibold text-red-600">{atmCall.OptionGreeks.theta.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Vega:</div>
                            <div className="font-semibold text-purple-600">{atmCall.OptionGreeks.vega.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Rho:</div>
                            <div className="font-semibold text-gray-600">{atmCall.OptionGreeks.rho.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">IV:</div>
                            <div className="font-semibold text-orange-600">{formatPercentage(atmCall.OptionGreeks.iv * 100)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ATM Put Greeks */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-800 mb-3">At-The-Money Put Greeks</h5>
                  {(() => {
                    const currentPrice = stockQuote.QuoteResponse.QuoteData[0].All.lastTrade;
                    const atmPut = (optionChain.optionPairs || optionChain.OptionPair || [])
                      .filter(pair => pair.Put)
                      .sort((a, b) => Math.abs((a.Put?.strikePrice || 0) - currentPrice) - Math.abs((b.Put?.strikePrice || 0) - currentPrice))[0]?.Put;
                    
                    if (!atmPut) return <div className="text-gray-500">No put data available</div>;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Strike:</span>
                          <span className="font-semibold">{formatCurrency(atmPut.strikePrice)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Delta:</div>
                            <div className="font-semibold text-blue-600">{atmPut.OptionGreeks.delta.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Gamma:</div>
                            <div className="font-semibold text-green-600">{atmPut.OptionGreeks.gamma.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Theta:</div>
                            <div className="font-semibold text-red-600">{atmPut.OptionGreeks.theta.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Vega:</div>
                            <div className="font-semibold text-purple-600">{atmPut.OptionGreeks.vega.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Rho:</div>
                            <div className="font-semibold text-gray-600">{atmPut.OptionGreeks.rho.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">IV:</div>
                            <div className="font-semibold text-orange-600">{formatPercentage(atmPut.OptionGreeks.iv * 100)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Greeks Explanation */}
              <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                <h5 className="font-medium text-gray-800 mb-2">Greeks Quick Reference</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                  <div>
                    <strong className="text-blue-600">Delta:</strong> Price sensitivity to stock movement (0-1 for calls, -1-0 for puts)
                  </div>
                  <div>
                    <strong className="text-green-600">Gamma:</strong> Rate of change of delta (acceleration of price movement)
                  </div>
                  <div>
                    <strong className="text-red-600">Theta:</strong> Time decay per day (negative values indicate daily loss)
                  </div>
                  <div>
                    <strong className="text-purple-600">Vega:</strong> Sensitivity to volatility changes (higher = more sensitive)
                  </div>
                  <div>
                    <strong className="text-gray-600">Rho:</strong> Sensitivity to interest rate changes (usually minimal impact)
                  </div>
                  <div>
                    <strong className="text-orange-600">IV:</strong> Implied Volatility (market's expectation of future price movement)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
            </div>
          ) : (
            /* Transactions submenu */
            <TransactionBrowser />
          )}
      </div>
    );
  }
