import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OptionsExposureHeatMap } from '../components/OptionsExposureHeatMap';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  security_type: string;
  calculated_symbol: string;
  symbol: string;
  quantity: number;
  amount: number;
  price: number;
  commission: number;
  description: string;
}

interface PositionSummary {
  symbol: string;
  currentShares: number;
  averageCost: number;
  optionContracts: number;
  realizedGain: number;
  unrealizedGain: number;
  netPremiumCollected: number;
  maxGainOnStrike: number;
  currentValue: number;
}

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transactions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions');
    }
  };

  // Calculate position summaries from transactions
  const calculatePositions = () => {
    const symbolGroups = transactions.reduce((groups, transaction) => {
      const symbol = String(transaction.calculated_symbol);
      if (!groups[symbol]) {
        groups[symbol] = [];
      }
      groups[symbol].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);

    const positionSummaries: PositionSummary[] = [];

    Object.entries(symbolGroups).forEach(([symbol, symbolTransactions]) => {
      // Calculate position metrics similar to SymbolDetail.tsx
      let currentShares = 0;
      let averageCost = 0;
      let realizedGain = 0;
      let optionContracts = 0;

      // Separate equity and option transactions
      const equityTransactions = symbolTransactions.filter(t => String(t.security_type) === 'EQ');
      const optionTransactions = symbolTransactions.filter(t => String(t.security_type) === 'OPTN');

      // Process equity transactions
      equityTransactions.forEach(transaction => {
        const quantity = parseFloat(String(transaction.quantity));
        const amount = Math.abs(parseFloat(String(transaction.amount)));

        if (quantity > 0) {
          // Buy transaction
          const newTotalCost = (currentShares * averageCost) + amount;
          currentShares += quantity;
          averageCost = currentShares > 0 ? newTotalCost / currentShares : 0;
        } else if (quantity < 0) {
          // Sell transaction
          const sharesSold = Math.abs(quantity);
          const proceeds = amount;
          const costBasis = sharesSold * averageCost;
          
          realizedGain += proceeds - costBasis;
          currentShares += quantity; // quantity is negative
          
          if (currentShares <= 0) {
            averageCost = 0;
          }
        }
      });

      // Calculate net option contracts and option realized gain
      let netOptionContracts = 0;
      let optionRealizedGain = 0;
      let netPremiumCollected = 0;

      optionTransactions.forEach(transaction => {
        const quantity = parseFloat(String(transaction.quantity));
        const transactionType = String(transaction.transaction_type);
        const amount = parseFloat(String(transaction.amount));
        
        // Add option transaction amount to realized gain and net premium
        optionRealizedGain += amount;
        netPremiumCollected += amount;
        
        // Calculate net position by transaction type
        if (transactionType === 'Sold Short') {
          netOptionContracts += Math.abs(quantity);
        } else if (transactionType === 'Bought To Cover' || 
                   transactionType === 'Option Assigned' || 
                   transactionType === 'Option Expired') {
          netOptionContracts -= Math.abs(quantity);
        }
      });

      optionContracts = Math.max(0, netOptionContracts);
      realizedGain += optionRealizedGain;

      // Calculate unrealized gain (simplified - using last equity transaction price as current price)
      const lastEquityTransaction = equityTransactions[equityTransactions.length - 1];
      const currentPrice = lastEquityTransaction ? parseFloat(String(lastEquityTransaction.price)) : 0;
      const currentValue = currentShares * currentPrice;
      const unrealizedGain = currentValue - (currentShares * averageCost);

      // Calculate max gain on strike (simplified)
      const averageStrikePrice = 16; // Default - in real implementation would calculate from option data
      const maxGainOnStrike = (optionContracts * averageStrikePrice * 100) + 
                              equityTransactions.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0) + 
                              netPremiumCollected;

      // Only include positions with activity
      if (currentShares > 0 || optionContracts > 0 || Math.abs(realizedGain) > 0.01) {
        positionSummaries.push({
          symbol,
          currentShares,
          averageCost,
          optionContracts,
          realizedGain,
          unrealizedGain,
          netPremiumCollected,
          maxGainOnStrike,
          currentValue
        });
      }
    });

    setPositions(positionSummaries);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTransactions();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      calculatePositions();
    }
  }, [transactions]);

  // Calculate dashboard metrics
  const totalPositions = positions.filter(p => p.currentShares > 0).length;
  const totalOpenOptions = positions.reduce((sum, p) => sum + p.optionContracts, 0);
  const totalNetPremium = positions.reduce((sum, p) => sum + p.netPremiumCollected, 0);
  const totalRealizedGain = positions.reduce((sum, p) => sum + p.realizedGain, 0);
  const totalUnrealizedGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0);
  const totalInvested = positions.reduce((sum, p) => sum + (p.currentShares * p.averageCost), 0);
  const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  // System information
  const totalTransactions = transactions.length;
  const totalOptionTransactions = transactions.filter(t => t.security_type === 'OPTN').length;
  const lastTransaction = transactions.length > 0 ? 
    new Date(transactions[transactions.length - 1].transaction_date).toLocaleDateString() : 'N/A';

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Options Trading Dashboard</h1>
        <div className="text-center py-8">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Options Trading Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Positions</h3>
          <p className="text-2xl font-bold">{totalPositions}</p>
          <p className="text-sm text-gray-500">Active equity positions</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Options</h3>
          <p className="text-2xl font-bold">{totalOpenOptions}</p>
          <p className="text-sm text-gray-500">Currently open contracts</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Net Premium</h3>
          <p className={`text-2xl font-bold ${totalNetPremium >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalNetPremium.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Premium collected minus paid</p>
        </div>
      </div>

      {/* Options Exposure Heat Map */}
      <OptionsExposureHeatMap positions={positions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Current Positions</h3>
          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.slice(0, 5).map((position) => (
                <Link 
                  key={position.symbol}
                  to={`/symbol/${position.symbol}`}
                  className="block p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-gray-500">
                        {position.currentShares} shares, {position.optionContracts} options
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${position.realizedGain + position.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(position.realizedGain + position.unrealizedGain).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${position.netPremiumCollected.toFixed(2)} premium
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {positions.length > 5 && (
                <Link to="/positions" className="block text-center text-blue-600 hover:text-blue-800 mt-3">
                  View all {positions.length} positions →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No positions found. Upload transactions to get started.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Invested:</span>
              <span className="font-medium">${totalInvested.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Value:</span>
              <span className="font-medium">${totalCurrentValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Realized Gain:</span>
              <span className={`font-medium ${totalRealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalRealizedGain.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unrealized Gain:</span>
              <span className={`font-medium ${totalUnrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalUnrealizedGain.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-medium">Total Gain/Loss:</span>
              <span className={`font-bold text-lg ${totalRealizedGain + totalUnrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(totalRealizedGain + totalUnrealizedGain).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium">Total Transactions</div>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Total Options</div>
            <div className="text-2xl font-bold">{totalOptionTransactions}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Last Transaction</div>
            <div className="text-sm">{lastTransaction}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Active Symbols</div>
            <div className="text-sm">{positions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
