import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, FileText, Eye, Calendar, TrendingUp, TrendingDown, Filter, X } from 'lucide-react';
import { etradeAPI } from '@/lib/etradeAPI';

interface Account {
  accountId: string;
  accountIdKey: string;
  accountMode: string;
  accountDesc: string;
  accountName: string;
  accountType: string;
  institutionType: string;
  accountStatus: string;
}

interface Transaction {
  transactionId: string;
  accountId: string;
  transactionDate: number; // This is a timestamp in milliseconds
  postDate: number; // This is a timestamp in milliseconds
  amount: number;
  description: string;
  transactionType: string;
  memo?: string;
  imageFlag?: boolean;
  instType?: string;
  storeId?: number;
  brokerage?: {
    product?: {
      symbol?: string;
      securityType?: string;
      callPut?: string;
      expiryYear?: number;
      expiryMonth?: number;
      expiryDay?: number;
      strikePrice?: number;
    };
    quantity?: number;
    price?: number;
    settlementCurrency?: string;
    paymentCurrency?: string;
    fee?: number;
    displaySymbol?: string;
    settlementDate?: number;
  };
  detailsURI?: string;
}

interface TransactionDetails {
  transactionId: string;
  accountId: string;
  transactionDate: number;
  postDate: number;
  amount: number;
  description: string;
  transactionType: string;
  memo?: string;
  imageFlag?: boolean;
  instType?: string;
  storeId?: number;
  brokerage?: {
    product?: {
      symbol?: string;
      securityType?: string;
      callPut?: string;
      expiryYear?: number;
      expiryMonth?: number;
      expiryDay?: number;
      strikePrice?: number;
    };
    quantity?: number;
    price?: number;
    settlementCurrency?: string;
    paymentCurrency?: string;
    fee?: number;
    displaySymbol?: string;
    settlementDate?: number;
  };
  detailsURI?: string;
}



export function TransactionBrowser() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [symbol, setSymbol] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [transactionType, setTransactionType] = useState('');
  const [count, setCount] = useState(50);
  const [fetchAllPages, setFetchAllPages] = useState(false); // Control pagination
  const [pageDelay, setPageDelay] = useState(1500); // Delay between pages in ms

  // Quick date filter functions
  const setQuickDateFilter = (days: number | 'today' | 'optionsStart') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (days === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (days === 'optionsStart') {
      setStartDate('2025-02-20');
      setEndDate(todayStr);
    } else {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - days + 1);
      setStartDate(startDate.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const accountData = await etradeAPI.getAccounts();
      
      // Handle different response structures
      let accountList: Account[] = [];
      if (accountData.AccountListResponse?.Accounts?.Account) {
        accountList = Array.isArray(accountData.AccountListResponse.Accounts.Account)
          ? accountData.AccountListResponse.Accounts.Account
          : [accountData.AccountListResponse.Accounts.Account];
      } else if (Array.isArray(accountData)) {
        accountList = accountData;
      }

      setAccounts(accountList.sort((lhs, rhs) => {
        return lhs.accountName.localeCompare(rhs.accountName);
      }));
      if (accountList.length > 0) {
        setSelectedAccount(accountList[0].accountIdKey);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert YYYY-MM-DD to MMDDYYYY format required by ETrade API
  const formatDateForEtrade = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = (date.getDate() + 1).toString().padStart(2, '0') ;
    const year = date.getFullYear().toString();

    console.log(`TransactionBrowser.tsx: formatDateForEtrade: Formatting date ${dateString} to ETrade format: ${month}${day}${year}`);
    return `${month}${day}${year}`;
  };

  const loadTransactions = async () => {
    if (!selectedAccount) return;

    try {
      setLoading(true);
      setError(null);

      const options: any = {};
      if (symbol) options.symbol = symbol.toUpperCase();
      if (startDate) options.startDate = formatDateForEtrade(startDate);
      if (endDate) options.endDate = formatDateForEtrade(endDate);
      
      // Use different API method based on fetchAllPages setting
      let transactionData;
      if (fetchAllPages) {
        // Fetch all pages automatically
        options.maxPages = 20; // Safety limit
        options.pageDelay = pageDelay; // User-configurable delay
        transactionData = await etradeAPI.getAllTransactions(selectedAccount, options);
      } else {
        // Fetch single page
        if (count > 0) options.count = count;
        transactionData = await etradeAPI.getTransactions(selectedAccount, options);
      }

      // Handle different response structures
      let transactionList: Transaction[] = [];
      
      // Check for direct Transaction array (actual ETrade API response)
      if (transactionData.Transaction && Array.isArray(transactionData.Transaction)) {
        transactionList = transactionData.Transaction;
      }
      // Check for wrapped response format
      else if (transactionData.TransactionListResponse?.Transaction) {
        transactionList = Array.isArray(transactionData.TransactionListResponse.Transaction)
          ? transactionData.TransactionListResponse.Transaction
          : [transactionData.TransactionListResponse.Transaction];
      }
      // Fallback: check if the entire response is an array
      else if (Array.isArray(transactionData)) {
        transactionList = transactionData;
      }
      
      console.log('Parsed transaction list:', transactionList);
      console.log('Pagination info:', { 
        totalCount: transactionData.totalCount, 
        transactionCount: transactionData.transactionCount, 
        moreTransactions: transactionData.moreTransactions,
        fetchedAllPages: fetchAllPages
      });
      setTransactions(transactionList);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetails = async (transactionId: string) => {
    if (!selectedAccount) return;

    try {
      setLoadingDetails(true);
      setError(null);

      const details = await etradeAPI.getTransactionDetails(selectedAccount, transactionId);
      setTransactionDetails(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error loading transaction details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'buy':
      case 'purchase':
        return <TrendingUp className="text-green-600" size={16} />;
      case 'sell':
      case 'sale':
        return <TrendingDown className="text-red-600" size={16} />;
      default:
        return <FileText className="text-blue-600" size={16} />;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'buy':
      case 'purchase':
        return 'text-green-600 bg-green-50';
      case 'sell':
      case 'sale':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const clearFilters = () => {
    setSymbol('');
    setStartDate('');
    setEndDate('');
    setTransactionType('');
    setCount(50);
  };

  const hasFilters = symbol || startDate || endDate || transactionType || count !== 50;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Transaction Browser</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FileText size={16} />
          <span>Browse and analyze your trading history</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Account Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Select Account</h3>
        
        {loading && accounts.length === 0 ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="animate-spin" size={16} />
            <span>Loading accounts...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.accountIdKey} value={account.accountIdKey}>
                  {account.accountName} ({account.accountType}) - {account.accountDesc}
                </option>
              ))}
            </select>

            {selectedAccount && (
              <div className="text-sm text-gray-600">
                Selected Account: {accounts.find(a => a.accountIdKey === selectedAccount)?.accountName}
                {' '}({accounts.find(a => a.accountIdKey === selectedAccount)?.accountType})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {selectedAccount && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filter Transactions</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X size={14} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Filters</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickDateFilter('today')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setQuickDateFilter(2)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
              >
                Last 2 Days
              </button>
              <button
                onClick={() => setQuickDateFilter(5)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
              >
                Last 5 Days
              </button>
              <button
                onClick={() => setQuickDateFilter('optionsStart')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
              >
                Since Options Start (2/20/25)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
                <span className="text-xs text-gray-500 ml-1">(will be converted to ETrade format)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
                <span className="text-xs text-gray-500 ml-1">(will be converted to ETrade format)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
              <select
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                disabled={fetchAllPages}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
              {fetchAllPages && (
                <p className="text-xs text-gray-500 mt-1">Disabled when fetching all pages</p>
              )}
            </div>

            <div className="flex flex-col items-start justify-end">
              <div className="mb-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fetchAllPages}
                    onChange={(e) => setFetchAllPages(e.target.checked)}
                    className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Fetch all pages</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {fetchAllPages ? 'Will retrieve ALL transactions (may take longer)' : 'Single page only'}
                </p>
                {fetchAllPages && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Delay between pages (ms):
                    </label>
                    <select
                      value={pageDelay}
                      onChange={(e) => setPageDelay(parseInt(e.target.value))}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={1000}>1 second</option>
                      <option value={1500}>1.5 seconds</option>
                      <option value={2000}>2 seconds</option>
                      <option value={3000}>3 seconds</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Higher delays prevent rate limiting</p>
                  </div>
                )}
              </div>
              <button
                onClick={loadTransactions}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Filter size={16} />}
                <span>{loading ? 'Loading...' : 'Get Transactions'}</span>
              </button>
            </div>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-600">Active filters:</span>
              {symbol && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Symbol: {symbol}</span>}
              {startDate && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  From: {startDate} (ETrade: {formatDateForEtrade(startDate)})
                </span>
              )}
              {endDate && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  To: {endDate} (ETrade: {formatDateForEtrade(endDate)})
                </span>
              )}
              {count !== 50 && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Limit: {count}</span>}
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Transactions</h3>
              <div className="text-sm text-gray-500">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.transactionId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(transaction.transactionDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTransactionTypeIcon(transaction.transactionType)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(transaction.transactionType)}`}>
                          {transaction.transactionType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.brokerage?.product?.symbol || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                      {transaction.brokerage?.displaySymbol && transaction.brokerage.displaySymbol !== transaction.brokerage.product?.symbol && (
                        <div className="text-xs text-gray-500 truncate" title={transaction.brokerage.displaySymbol}>
                          {transaction.brokerage.displaySymbol}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.brokerage?.quantity ? (
                        <div className="text-right">
                          {Math.abs(transaction.brokerage.quantity).toLocaleString()}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.brokerage?.price ? (
                        <div className="text-right font-medium">
                          {formatCurrency(transaction.brokerage.price)}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className={`text-right ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </div>
                      {transaction.brokerage?.fee && transaction.brokerage.fee !== 0 && (
                        <div className="text-xs text-gray-500 text-right">
                          Fee: {formatCurrency(transaction.brokerage.fee)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => loadTransactionDetails(transaction.transactionId)}
                        disabled={loadingDetails}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetailsModal && transactionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Transaction ID:</span>
                    <div className="font-medium">{transactionDetails.transactionId}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Transaction Date:</span>
                    <div className="font-medium">{formatDate(transactionDetails.transactionDate)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Post Date:</span>
                    <div className="font-medium">{formatDate(transactionDetails.postDate)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="font-medium">{transactionDetails.transactionType}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Inst Type:</span>
                    <div className="font-medium">{transactionDetails.instType}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <div className={`font-bold ${transactionDetails.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transactionDetails.amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {transactionDetails.description}
                </div>
                {transactionDetails.memo && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Memo:</span>
                    <div className="text-sm text-gray-700">{transactionDetails.memo}</div>
                  </div>
                )}
              </div>

              {/* Brokerage Information */}
              {transactionDetails.brokerage && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Brokerage Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {transactionDetails.brokerage.product?.symbol && (
                      <div>
                        <span className="text-gray-500">Symbol:</span>
                        <div className="font-medium">{transactionDetails.brokerage.product.symbol}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.product?.securityType && (
                      <div>
                        <span className="text-gray-500">Security Type:</span>
                        <div className="font-medium">{transactionDetails.brokerage.product.securityType}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.displaySymbol && (
                      <div>
                        <span className="text-gray-500">Display Symbol:</span>
                        <div className="font-medium">{transactionDetails.brokerage.displaySymbol}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.product?.callPut && (
                      <div>
                        <span className="text-gray-500">Option Type:</span>
                        <div className="font-medium">{transactionDetails.brokerage.product.callPut}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.product?.strikePrice && (
                      <div>
                        <span className="text-gray-500">Strike Price:</span>
                        <div className="font-medium">{formatCurrency(transactionDetails.brokerage.product.strikePrice)}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.product?.expiryYear && (
                      <div>
                        <span className="text-gray-500">Expiry:</span>
                        <div className="font-medium">
                          {transactionDetails.brokerage.product.expiryMonth}/{transactionDetails.brokerage.product.expiryDay}/{transactionDetails.brokerage.product.expiryYear}
                        </div>
                      </div>
                    )}
                    {transactionDetails.brokerage.quantity && (
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <div className="font-medium">{transactionDetails.brokerage.quantity.toLocaleString()}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.price && (
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <div className="font-medium">{formatCurrency(transactionDetails.brokerage.price)}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.fee !== undefined && transactionDetails.brokerage.fee !== 0 && (
                      <div>
                        <span className="text-gray-500">Fee:</span>
                        <div className="font-medium">{formatCurrency(transactionDetails.brokerage.fee)}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.settlementCurrency && (
                      <div>
                        <span className="text-gray-500">Settlement Currency:</span>
                        <div className="font-medium">{transactionDetails.brokerage.settlementCurrency}</div>
                      </div>
                    )}
                    {transactionDetails.brokerage.settlementDate && (
                      <div>
                        <span className="text-gray-500">Settlement Date:</span>
                        <div className="font-medium">{formatDate(transactionDetails.brokerage.settlementDate)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Data (for debugging) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Raw Transaction Data</h4>
                <details className="cursor-pointer">
                  <summary className="text-sm text-blue-600 hover:text-blue-800">Show Raw JSON</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(transactionDetails, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
