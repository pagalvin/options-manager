import { FinancialLinks } from '@/components/FinancialLinks';
import { calculateOpenOptions } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  transaction_date: string;
  calculated_symbol: string;
  transaction_type: string;
  description: string;
  quantity: number | string;
  amount: number | string;
  price: number | string;
  commission: number | string;
}

interface AnalysisFilters {
  symbol: string;
  fromDate: string;
  toDate: string;
}

interface EditTransaction {
  id: number;
  transaction_date: string;
  calculated_symbol: string;
  transaction_type: string;
  description: string;
  quantity: number | string;
  amount: number | string;
  price: number | string;
  commission: number | string;
}

export function TransactionAnalysis() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<AnalysisFilters>({
    symbol: 'all',
    fromDate: '',
    toDate: '',
  });

  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  // Sort state - default to newest first (descending)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit/Delete state
  const [editingTransaction, setEditingTransaction] = useState<EditTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<number | null>(null);

  // Unrealized gains state
  const [unrealizedGains, setUnrealizedGains] = useState<number>(0);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        
        // Extract unique symbols
        const symbols = Array.from(new Set(data.map((t: Transaction) => t.calculated_symbol)))
          .filter((symbol): symbol is string => typeof symbol === 'string')
          .sort();
        setAvailableSymbols(symbols);
        
        // Apply initial filtering
        applyFilters(data, filters);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to fetch transactions'}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (transactionData: Transaction[], currentFilters: AnalysisFilters) => {
    let filtered = [...transactionData];

    // Filter by symbol
    if (currentFilters.symbol !== 'all') {
      filtered = filtered.filter(t => t.calculated_symbol === currentFilters.symbol);
    }

    // Filter by date range
    if (currentFilters.fromDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.transaction_date).toISOString().split('T')[0];
        return transactionDate >= currentFilters.fromDate;
      });
    }
    
    if (currentFilters.toDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.transaction_date).toISOString().split('T')[0];
        return transactionDate <= currentFilters.toDate;
      });
    }

    // Sort by date - use sortOrder state
    if (sortOrder === 'desc') {
      filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    }

    setFilteredTransactions(filtered);
  };

  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newSortOrder);
    applyFilters(transactions, filters);
  };

  const handleFilterChange = (field: keyof AnalysisFilters, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    // Clear active quick filter when manual filters are changed
    if (field === 'fromDate' || field === 'toDate') {
      setActiveQuickFilter('');
    }
    applyFilters(transactions, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      symbol: 'all',
      fromDate: '',
      toDate: '',
    };
    setFilters(clearedFilters);
    setActiveQuickFilter('');
    applyFilters(transactions, clearedFilters);
  };

  const applyQuickFilter = (filterType: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let fromDate = '';

    switch (filterType) {
      case 'last2trading':
        // Last 2 trading days - go back until we have 2 business days
        fromDate = getBusinessDaysAgo(today, 2).toISOString().split('T')[0];
        break;
      
      case 'last5trading':
        // Last 5 trading days - go back until we have 5 business days
        fromDate = getBusinessDaysAgo(today, 5).toISOString().split('T')[0];
        break;
      
      case 'lastweek':
        // Last calendar week (7 days)
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        fromDate = lastWeek.toISOString().split('T')[0];
        break;
      
      case 'last2weeks':
        // Last two calendar weeks (14 days)
        const last2Weeks = new Date(today);
        last2Weeks.setDate(today.getDate() - 14);
        fromDate = last2Weeks.toISOString().split('T')[0];
        break;
      
      case 'last30days':
        // Last 30 days
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        fromDate = last30Days.toISOString().split('T')[0];
        break;
      
      case 'sinceOptionsStart':
        // Since Options Start - hardcoded date
        fromDate = '2025-02-28';
        break;
      
      default:
        return;
    }

    const quickFilters = {
      ...filters,
      fromDate,
      toDate: todayStr,
    };
    setFilters(quickFilters);
    setActiveQuickFilter(filterType);
    applyFilters(transactions, quickFilters);
  };

  const getBusinessDaysAgo = (startDate: Date, businessDays: number): Date => {
    const result = new Date(startDate);
    let count = 0;
    
    while (count < businessDays) {
      result.setDate(result.getDate() - 1);
      // Monday = 1, Tuesday = 2, ..., Friday = 5, Saturday = 6, Sunday = 0
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    
    return result;
  };

  const getQuickFilterLabel = (filterType: string): string => {
    switch (filterType) {
      case 'last2trading': return 'Last 2 Trading Days';
      case 'last5trading': return 'Last 5 Trading Days';
      case 'lastweek': return 'Last Week';
      case 'last2weeks': return 'Last 2 Weeks';
      case 'last30days': return 'Last 30 Days';
      case 'sinceOptionsStart': return 'Since Options Start';
      default: return '';
    }
  };

  const calculateRealizedROI = (): number | null => {
    if (filters.symbol === 'all' || filteredTransactions.length === 0) {
      return null;
    }

    let totalInvested = 0;
    let totalReceived = 0;

    filteredTransactions.forEach(transaction => {
      const amount = Math.abs(parseFloat(String(transaction.amount || '0')));
      const quantity = parseFloat(String(transaction.quantity || '0'));

      if (quantity > 0) {
        // Buying - money going out (investment)
        totalInvested += amount;
      } else if (quantity < 0) {
        // Selling - money coming in (return)
        totalReceived += amount;
      }
    });

    if (totalInvested === 0) {
      return null; // Can't calculate ROI without investment
    }

    // Add unrealized gains to total received for projected ROI
    const totalReceivedWithUnrealized = totalReceived + unrealizedGains;

    // ROI = (Total Received + Unrealized Gains - Total Invested) / Total Invested * 100
    const roi = ((totalReceivedWithUnrealized - totalInvested) / totalInvested) * 100;
    return roi;
  };

  const countOpenOptions = (): number => {
    return calculateOpenOptions(filteredTransactions);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction({
      id: transaction.id,
      transaction_date: transaction.transaction_date.split('T')[0], // Format for date input
      calculated_symbol: transaction.calculated_symbol,
      transaction_type: transaction.transaction_type,
      description: transaction.description,
      quantity: transaction.quantity,
      amount: transaction.amount,
      price: transaction.price,
      commission: transaction.commission,
    });
    setShowEditModal(true);
  };

  const handleDeleteTransaction = (transactionId: number) => {
    setDeletingTransactionId(transactionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingTransactionId) return;

    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${deletingTransactionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh transactions list
        await fetchTransactions();
        setError('');
      } else {
        setError('Failed to delete transaction');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to delete transaction'}`);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingTransactionId(null);
    }
  };

  const saveEditedTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTransaction),
      });

      if (response.ok) {
        // Refresh transactions list
        await fetchTransactions();
        setShowEditModal(false);
        setEditingTransaction(null);
        setError('');
      } else {
        setError('Failed to update transaction');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to update transaction'}`);
    }
  };

  const exportToCSV = () => {
    if (transactionsWithRunningTotal.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Security', 'Transaction Type', 'Description', 'Quantity', 'Amount', 'Commission', 'Cash Flow', 'Running Total', 'Running Commission'];
    const csvContent = [
      headers.join(','),
      ...transactionsWithRunningTotal.map(t => [
        new Date(t.transaction_date).toLocaleDateString(),
        t.calculated_symbol,
        t.transaction_type,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in description
        t.quantity,
        t.netAmount.toFixed(2),
        parseFloat(String(t.commission || '0')).toFixed(2),
        t.isInflow ? 'Inflow' : 'Outflow',
        t.runningTotal.toFixed(2),
        t.runningCommissionTotal.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `transaction-analysis-${filters.symbol !== 'all' ? filters.symbol + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Re-apply filters when sort order changes
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters(transactions, filters);
    }
  }, [sortOrder]);

  // Calculate running total for filtered transactions
  const transactionsWithRunningTotal = filteredTransactions.map((transaction, index) => {
    const currentAmount = parseFloat(String(transaction.amount || '0'));
    const quantity = parseFloat(String(transaction.quantity || '0'));
    
    // Cash flow logic based on quantity:
    // Negative quantity (selling) = Inflow (money coming in)
    // Positive quantity (buying) = Outflow (money going out)
    const isInflow = quantity < 0;
    // Use the amount field directly since it already includes commissions
    const netAmount = Math.abs(currentAmount);
    
    const runningTotal = filteredTransactions.slice(0, index + 1).reduce((total, t) => {
      const amt = Math.abs(parseFloat(String(t.amount || '0')));
      const qty = parseFloat(String(t.quantity || '0'));
      
      // If selling (negative quantity), add to total (money in)
      // If buying (positive quantity), subtract from total (money out)
      return qty < 0 ? total + amt : total - amt;
    }, 0);

    // Calculate running commission total
    const runningCommissionTotal = filteredTransactions.slice(0, index + 1).reduce((total, t) => {
      const comm = parseFloat(String(t.commission || '0'));
      return total + comm;
    }, 0);

    return {
      ...transaction,
      netAmount,
      runningTotal,
      runningCommissionTotal,
      isInflow,
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Transaction Analysis</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction Analysis</h1>
          <p className="text-sm text-gray-600 mt-2">
            Cash Flow: <span className="text-green-600 font-medium">Green = Inflow</span> (selling, negative qty) | 
            <span className="text-red-600 font-medium"> Red = Outflow</span> (buying, positive qty)
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Symbol
            </label>
            <select
              value={filters.symbol}
              onChange={(e) => handleFilterChange('symbol', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Securities</option>
              {availableSymbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredTransactions.length} of {transactions.length} transactions
            {filters.symbol !== 'all' && ` for ${filters.symbol}`}
            {filters.fromDate && ` from ${new Date(filters.fromDate).toLocaleDateString()}`}
            {filters.toDate && ` to ${new Date(filters.toDate).toLocaleDateString()}`}
          </div>
          
          <button
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Unrealized Gains Input - only show when specific symbol is selected */}
      {filters.symbol !== 'all' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium">Projected Performance</h3>
            <span className="text-sm text-gray-600 italic">
              For {filters.symbol}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Unrealized Gains
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={unrealizedGains || ''}
                  onChange={(e) => setUnrealizedGains(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter anticipated future gains to see projected ROI
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="font-medium">Impact:</div>
              <div className={unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}>
                {unrealizedGains >= 0 ? '+' : ''}${unrealizedGains.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Quick Time Filters</h3>
          {activeQuickFilter && (
            <span className="text-sm text-gray-600 italic">
              Active: {getQuickFilterLabel(activeQuickFilter)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyQuickFilter('last2trading')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'last2trading' 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Last 2 Trading Days
          </button>
          <button
            onClick={() => applyQuickFilter('last5trading')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'last5trading' 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Last 5 Trading Days
          </button>
          <button
            onClick={() => applyQuickFilter('lastweek')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'lastweek' 
                ? 'bg-green-500 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Last Week
          </button>
          <button
            onClick={() => applyQuickFilter('last2weeks')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'last2weeks' 
                ? 'bg-green-500 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Last 2 Weeks
          </button>
          <button
            onClick={() => applyQuickFilter('last30days')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'last30days' 
                ? 'bg-purple-500 text-white' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyQuickFilter('sinceOptionsStart')}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeQuickFilter === 'sinceOptionsStart' 
                ? 'bg-orange-500 text-white' 
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Since Options Start
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No transactions found matching the current filters.
            </p>
            <p className="text-sm text-gray-400">
              Try adjusting your filter criteria or clearing all filters.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className={`grid grid-cols-1 gap-4 mb-6 ${
              filters.symbol !== 'all' ? 'md:grid-cols-6' : 'md:grid-cols-6'
            }`}>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
                <div className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-sm text-indigo-600 font-medium">Open Options</div>
                <div className="text-2xl font-bold text-indigo-900">{countOpenOptions()}</div>
                <div className="text-xs text-gray-600">
                  Current Contracts
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Net Cash Flow</div>
                <div className={`text-2xl font-bold ${
                  ((transactionsWithRunningTotal[transactionsWithRunningTotal.length - 1]?.runningTotal || 0) + (filters.symbol !== 'all' ? unrealizedGains : 0)) > 0 
                    ? 'text-green-900' 
                    : 'text-red-900'
                }`}>
                  ${Math.abs((transactionsWithRunningTotal[transactionsWithRunningTotal.length - 1]?.runningTotal || 0) + (filters.symbol !== 'all' ? unrealizedGains : 0)).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">
                  {((transactionsWithRunningTotal[transactionsWithRunningTotal.length - 1]?.runningTotal || 0) + (filters.symbol !== 'all' ? unrealizedGains : 0)) > 0 ? 'Net Inflow' : 'Net Outflow'}
                  {filters.symbol !== 'all' && unrealizedGains !== 0 && (
                    <span className="block">
                      (Includes ${unrealizedGains >= 0 ? '+' : ''}{unrealizedGains.toFixed(2)} projected)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Total Commissions</div>
                <div className="text-2xl font-bold text-orange-900">
                  ${(transactionsWithRunningTotal[transactionsWithRunningTotal.length - 1]?.runningCommissionTotal || 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">
                  Total Fees Paid
                </div>
              </div>
              
              {/* ROI Card - only show when specific symbol is selected */}
              {filters.symbol !== 'all' && (() => {
                const roi = calculateRealizedROI();
                return roi !== null ? (
                  <div className={`p-4 rounded-lg ${
                    roi >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <div className={`text-sm font-medium ${
                      roi >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {unrealizedGains !== 0 ? 'Projected ROI' : 'Realized ROI'}
                    </div>
                    <div className={`text-2xl font-bold ${
                      roi >= 0 ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {filters.symbol} Performance
                      {unrealizedGains !== 0 && (
                        <span className="block">
                          (With ${unrealizedGains >= 0 ? '+' : ''}{unrealizedGains.toFixed(2)} unrealized)
                        </span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Securities</div>
                <div className="text-2xl font-bold text-purple-900">
                  {filters.symbol === 'all' 
                    ? new Set(filteredTransactions.map(t => t.calculated_symbol)).size
                    : 1
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 font-medium">Date Range</div>
                <div className="text-sm font-bold text-gray-900">
                  {filteredTransactions.length > 0 ? (
                    <>
                      {new Date(filteredTransactions[0].transaction_date).toLocaleDateString()}
                      <br />
                      to {new Date(filteredTransactions[filteredTransactions.length - 1].transaction_date).toLocaleDateString()}
                    </>
                  ) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Transaction Details</h3>
                <button
                  onClick={toggleSortOrder}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  <span>Sort by Date:</span>
                  <span className="font-bold">
                    {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                  </span>
                  <span className="text-gray-500">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        <span className="text-blue-600">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount (Cash Flow)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Running Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Running Commission
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactionsWithRunningTotal.map((transaction, index) => {
                    const runningTotalIsPositive = transaction.runningTotal > 0;
                    
                    return (
                      <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.calculated_symbol}
                            {transaction.calculated_symbol?.trim().length > 0 && <FinancialLinks security={`${transaction.calculated_symbol}`} />}
                          {/* {transaction.calculated_symbol} */}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.transaction_type.includes('BUY') 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.transaction_type.includes('SELL')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {parseFloat(String(transaction.quantity)).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          transaction.isInflow ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${transaction.netAmount.toFixed(2)}
                          <div className="text-xs text-gray-500">
                            ({transaction.isInflow ? 'Inflow' : 'Outflow'})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          ${parseFloat(String(transaction.commission || '0')).toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                          runningTotalIsPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${Math.abs(transaction.runningTotal).toFixed(2)}
                          <div className="text-xs text-gray-500">
                            ({runningTotalIsPositive ? 'Net Inflow' : 'Net Outflow'})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                          ${transaction.runningCommissionTotal.toFixed(2)}
                          <div className="text-xs text-gray-500">
                            (Total Fees)
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editingTransaction.transaction_date}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    transaction_date: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={editingTransaction.calculated_symbol}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    calculated_symbol: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <input
                  type="text"
                  value={editingTransaction.transaction_type}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    transaction_type: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingTransaction.description}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    description: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={editingTransaction.quantity}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      quantity: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      amount: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTransaction.price}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      price: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTransaction.commission}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      commission: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTransaction(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedTransaction}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Confirm Delete</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingTransactionId(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
