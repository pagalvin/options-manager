import { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  transaction_date: string;
  transaction_type: string;
  security_type: string;
  quantity: number;
  amount: number;
  transaction_chain_close_date: string | null;
  description: string;
}

interface Chain {
  transaction_chain_id: string;
  symbol: string;
  security_type: string;
  chain_start_date: string;
  chain_end_date: string;
  transaction_chain_close_date: string | null;
  transaction_count: number;
  total_amount: number;
  transactions: Transaction[];
}

export function Chains() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [allChains, setAllChains] = useState<Chain[]>([]);
  const [filteredChains, setFilteredChains] = useState<Chain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load available symbols on component mount
  useEffect(() => {
    loadSymbols();
  }, []);

  // Load chains when symbol changes
  useEffect(() => {
    if (selectedSymbol !== 'ALL') {
      // Reset filters when changing symbols
      setStatusFilter('ALL');
      setTypeFilter('ALL');
      loadChainsForSymbol(selectedSymbol);
    } else {
      setAllChains([]);
      setFilteredChains([]);
    }
  }, [selectedSymbol]);

  // Apply filters when chains or filter criteria change
  useEffect(() => {
    let filtered = [...allChains];
    
    // Filter by status (open/closed)
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OPEN') {
        filtered = filtered.filter(chain => chain.transaction_chain_close_date === null);
      } else if (statusFilter === 'CLOSED') {
        filtered = filtered.filter(chain => chain.transaction_chain_close_date !== null);
      }
    }
    
    // Filter by security type
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(chain => chain.security_type === typeFilter);
    }
    
    setFilteredChains(filtered);
  }, [allChains, statusFilter, typeFilter]);

  const loadSymbols = async () => {
    try {
      const response = await fetch('/api/chain-admin/symbols');
      if (!response.ok) throw new Error('Failed to load symbols');
      const data = await response.json();
      setSymbols(data.symbols || []);
    } catch (err) {
      console.error('Error loading symbols:', err);
      // Fallback: load from transactions endpoint
      try {
        const response = await fetch('/api/transactions');
        if (!response.ok) throw new Error('Failed to load transactions');
        const transactions = await response.json();
        const uniqueSymbols = [...new Set(
          transactions
            .filter((t: any) => t.security_type === 'EQ' || t.security_type === 'OPTN')
            .map((t: any) => t.calculated_symbol)
            .filter((symbol: string) => symbol && symbol.trim() !== '')
        )].sort() as string[];
        setSymbols(uniqueSymbols);
      } catch (fallbackErr) {
        console.error('Fallback symbol loading failed:', fallbackErr);
      }
    }
  };

  const loadChainsForSymbol = async (symbol: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Get chain summaries
      const chainsResponse = await fetch(`/api/chain-admin/chains/${symbol}`);
      if (!chainsResponse.ok) throw new Error('Failed to load chains');
      const chainsData = await chainsResponse.json();
      
      // Get detailed transactions for each chain
      const chainsWithTransactions: Chain[] = [];
      
      for (const chainSummary of chainsData.chains) {
        const transactionsResponse = await fetch(
          `/api/chain-admin/chain-transactions/${chainSummary.transaction_chain_id}`
        );
        
        let transactions: Transaction[] = [];
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          transactions = transactionsData.transactions || [];
        }
        
        chainsWithTransactions.push({
          transaction_chain_id: chainSummary.transaction_chain_id,
          symbol: symbol,
          security_type: chainSummary.security_type,
          chain_start_date: chainSummary.chain_start_date,
          chain_end_date: chainSummary.chain_end_date,
          transaction_chain_close_date: chainSummary.transaction_chain_close_date,
          transaction_count: chainSummary.transaction_count,
          total_amount: parseFloat(chainSummary.total_amount || '0'),
          transactions: transactions
        });
      }
      
      setAllChains(chainsWithTransactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionStatus = (transaction: Transaction, chainCloseDate: string | null) => {
    const isChainClosed = chainCloseDate !== null;
    const transactionDate = new Date(transaction.transaction_date);
    const closeDate = chainCloseDate ? new Date(chainCloseDate) : null;
    
    // Determine if this specific transaction is the opening or closing transaction
    const isOpeningTransaction = ['Bought', 'Sold Short'].includes(transaction.transaction_type);
    const isClosingTransaction = ['Sold', 'Bought To Cover', 'Option Expired', 'Option Assigned'].includes(transaction.transaction_type);
    
    if (isClosingTransaction && closeDate && transactionDate.getTime() === closeDate.getTime()) {
      return 'Closing';
    } else if (isOpeningTransaction) {
      return 'Opening';
    } else {
      return isChainClosed ? 'Closed' : 'Open';
    }
  };

  const getChainStatusBadge = (chain: Chain) => {
    const isClosed = chain.transaction_chain_close_date !== null;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isClosed 
          ? 'bg-gray-100 text-gray-800' 
          : 'bg-green-100 text-green-800'
      }`}>
        {isClosed ? 'Closed' : 'Open'}
      </span>
    );
  };

  const getSecurityTypeBadge = (securityType: string) => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        securityType === 'EQ' 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-purple-100 text-purple-800'
      }`}>
        {securityType === 'EQ' ? 'Equity' : 'Option'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl font-bold">Transaction Chains</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Symbol Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap" htmlFor="symbolSelect">
              Symbol:
            </label>
            <select
              id="symbolSelect"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              <option value="ALL">Select a symbol...</option>
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap" htmlFor="statusFilter">
              Status:
            </label>
            <select
              id="statusFilter"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={selectedSymbol === 'ALL'}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap" htmlFor="typeFilter">
              Type:
            </label>
            <select
              id="typeFilter"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              disabled={selectedSymbol === 'ALL'}
            >
              <option value="ALL">All Types</option>
              <option value="EQ">Equity</option>
              <option value="OPTN">Options</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && selectedSymbol !== 'ALL' && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            Loading chains for {selectedSymbol}...
          </div>
        </div>
      )}

      {selectedSymbol === 'ALL' && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          Select a symbol to view its transaction chains.
        </div>
      )}

      {selectedSymbol !== 'ALL' && !isLoading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">Symbol:</span>
              <span className="text-blue-600">{selectedSymbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">Total Chains:</span>
              <span className="text-blue-600">{allChains.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">Filtered Results:</span>
              <span className="text-blue-600">{filteredChains.length}</span>
            </div>
            {statusFilter !== 'ALL' && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-800">Status Filter:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {statusFilter === 'OPEN' ? 'Open Only' : 'Closed Only'}
                </span>
              </div>
            )}
            {typeFilter !== 'ALL' && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-800">Type Filter:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {typeFilter === 'EQ' ? 'Equity Only' : 'Options Only'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredChains.length === 0 && selectedSymbol !== 'ALL' && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          No transaction chains found for {selectedSymbol} with the current filters.
        </div>
      )}

      <div className="space-y-6">
        {filteredChains.map((chain: Chain) => (
          <div key={chain.transaction_chain_id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Chain Header */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{chain.symbol}</h3>
                  {getSecurityTypeBadge(chain.security_type)}
                  {getChainStatusBadge(chain)}
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Total P&L:</span> {formatCurrency(chain.total_amount)}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {formatDate(chain.chain_start_date)} - {formatDate(chain.chain_end_date)}
                  </div>
                  {chain.transaction_chain_close_date && (
                    <div>
                      <span className="font-medium">Closed:</span> {formatDate(chain.transaction_chain_close_date)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chain Transactions */}
            <div className="p-6">
              {chain.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chain.transactions
                        .sort((a: Transaction, b: Transaction) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
                        .map((transaction: Transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.transaction_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getTransactionStatus(transaction, chain.transaction_chain_close_date) === 'Opening'
                                ? 'bg-green-100 text-green-800'
                                : getTransactionStatus(transaction, chain.transaction_chain_close_date) === 'Closing'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getTransactionStatus(transaction, chain.transaction_chain_close_date)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.transaction_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {transaction.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No transaction details available for this chain.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
