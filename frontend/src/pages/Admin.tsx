import { useState } from 'react';

interface ChainStatistics {
  total_transactions: string;
  chained_transactions: string;
  total_chains: string;
  closed_chain_transactions: string;
  equity_chain_transactions: string;
  option_chain_transactions: string;
}

export function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChainProcessing, setIsChainProcessing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [message, setMessage] = useState('');
  const [chainMessage, setChainMessage] = useState('');
  const [chainStats, setChainStats] = useState<ChainStatistics | null>(null);

  const handleDeleteAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL TRANSACTIONS? This cannot be undone!')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      let message = `Success: ${result.message}. Deleted ${result.deletedCounts.transactions} transactions, ${result.deletedCounts.options} options`;
      
      if (result.deletedCounts.positions > 0) {
        message += `, ${result.deletedCounts.positions} positions`;
      }
      
      if (result.deletedCounts.positionsReset > 0) {
        message += `, reset ${result.deletedCounts.positionsReset} positions (manual strike prices preserved)`;
      }
      
      message += `.`;
      setMessage(message);
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to delete data'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessChains = async () => {
    if (!confirm('Process transaction chains? This will analyze all transactions and create chain relationships.')) {
      return;
    }

    setIsChainProcessing(true);
    setChainMessage('');

    try {
      const response = await fetch('/api/chain-admin/process-chains', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const stats = result.stats;
      setChainMessage(
        `Success: Processed ${stats.totalTransactions} transactions. ` +
        `Created ${stats.equityChains} equity chains and ${stats.optionChains} option chains. ` +
        `Found ${stats.unmatchedCloses} unmatched closes and ${stats.splitTransactions} split transactions.`
      );
    } catch (error) {
      console.error('Error processing chains:', error);
      setChainMessage(`Error: ${error instanceof Error ? error.message : 'Failed to process chains'}`);
    } finally {
      setIsChainProcessing(false);
    }
  };

  const loadChainStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/chain-admin/chain-stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setChainStats(result.stats);
    } catch (error) {
      console.error('Error loading chain stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {chainMessage && (
        <div className={`p-4 rounded-lg ${chainMessage.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {chainMessage}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Transaction Chaining</h2>
        <div className="space-y-4">
          <div>
            <button 
              onClick={handleProcessChains}
              disabled={isChainProcessing}
              className={`px-4 py-2 rounded mr-4 text-white ${
                isChainProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {isChainProcessing ? 'Processing...' : 'Process Transaction Chains'}
            </button>
            <span className="text-gray-600">Link related opening and closing transactions into chains for analysis</span>
          </div>
          <div>
            <button 
              onClick={loadChainStats}
              disabled={isLoadingStats}
              className={`px-4 py-2 rounded mr-4 text-white ${
                isLoadingStats 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {isLoadingStats ? 'Loading...' : 'Load Chain Statistics'}
            </button>
            <span className="text-gray-600">View current transaction chain statistics</span>
          </div>
          {chainStats && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Chain Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><strong>Total Transactions:</strong> {chainStats.total_transactions}</div>
                <div><strong>Chained Transactions:</strong> {chainStats.chained_transactions}</div>
                <div><strong>Total Chains:</strong> {chainStats.total_chains}</div>
                <div><strong>Closed Chains:</strong> {chainStats.closed_chain_transactions}</div>
                <div><strong>Equity Chain Transactions:</strong> {chainStats.equity_chain_transactions}</div>
                <div><strong>Option Chain Transactions:</strong> {chainStats.option_chain_transactions}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Database Management</h2>
        <div className="space-y-4">
          <div>
            <button 
              onClick={handleDeleteAllData}
              disabled={isLoading}
              className={`px-4 py-2 rounded mr-4 text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isLoading ? 'Deleting...' : 'Delete All Transactions'}
            </button>
            <span className="text-gray-600">Warning: This will delete all transactions, positions, and options data (preserves securities)!</span>
          </div>
          <div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4">
              Validate Data Integrity
            </button>
            <span className="text-gray-600">Check for data consistency issues</span>
          </div>
          <div>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4">
              Create Backup
            </button>
            <span className="text-gray-600">Export all data as backup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
