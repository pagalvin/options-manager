import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OptionsExposureHeatMap } from '../components/OptionsExposureHeatMap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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

  // Helper functions for capital by source calculation
  const formatYyyyMmDd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const startOfWeekSunday = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0 = Sunday
    const diff = day; // days since Sunday
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Threshold date (same as Performance page)
  const thresholdWeekStart = (() => {
    const ref = new Date('2025-02-20T00:00:00');
    return startOfWeekSunday(ref);
  })();

  // Calculate capital by source data
  const calculateCapitalBySource = (period: 'weekly' | 'monthly') => {
    // First, calculate closed equity gains/losses using FIFO
    const equityTransactions = transactions.filter(t => 
      t.security_type === 'EQ' && 
      (t.transaction_type === 'Bought' || t.transaction_type === 'Sold')
    );

    // Group by symbol to track buy/sell pairs
    const symbolTransactions = new Map<string, Array<{
      date: Date;
      type: 'Bought' | 'Sold';
      quantity: number;
      amount: number;
      price: number;
    }>>();

    equityTransactions.forEach(t => {
      const symbol = t.calculated_symbol;
      if (!symbol) return;
      
      if (!symbolTransactions.has(symbol)) {
        symbolTransactions.set(symbol, []);
      }
      
      symbolTransactions.get(symbol)!.push({
        date: new Date(t.transaction_date),
        type: t.transaction_type as 'Bought' | 'Sold',
        quantity: Math.abs(Number(t.quantity)),
        amount: Number(t.amount), // Keep original sign: negative for buys, positive for sales
        price: Number(t.price)
      });
    });

    // Calculate completed transactions (where shares were bought and then sold)
    const completedTransactions: Array<{
      symbol: string;
      sellDate: Date;
      gainLoss: number;
      quantity: number;
    }> = [];

    symbolTransactions.forEach((txs, symbol) => {
      const sortedTxs = txs.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Use FIFO to match buys and sells
      const buyQueue: Array<{ quantity: number; costBasis: number; date: Date }> = [];
      
      sortedTxs.forEach(tx => {
        if (tx.type === 'Bought') {
          // Add to buy queue - amount is negative for purchases, so use absolute value for cost basis
          buyQueue.push({
            quantity: tx.quantity,
            costBasis: Math.abs(tx.amount), // Total cost for this purchase
            date: tx.date
          });
        } else if (tx.type === 'Sold' && buyQueue.length > 0) {
          let remainingToSell = tx.quantity;
          let totalCostBasis = 0;
          const saleProceeds = tx.amount; // Amount is positive for sales
          
          // Match against oldest purchases first (FIFO)
          while (remainingToSell > 0 && buyQueue.length > 0) {
            const oldestBuy = buyQueue[0];
            const sharesToMatch = Math.min(remainingToSell, oldestBuy.quantity);
            
            // Calculate proportional cost basis for the shares being sold
            const avgCostPerShare = oldestBuy.costBasis / oldestBuy.quantity;
            const costBasisForSale = sharesToMatch * avgCostPerShare;
            totalCostBasis += costBasisForSale;
            
            // Update the buy queue
            oldestBuy.quantity -= sharesToMatch;
            oldestBuy.costBasis -= costBasisForSale;
            
            if (oldestBuy.quantity <= 0) {
              buyQueue.shift(); // Remove completely matched buy
            }
            
            remainingToSell -= sharesToMatch;
          }
          
          if (totalCostBasis > 0) {
            // Calculate proportional sale proceeds for matched shares
            const proportionalSaleProceeds = (tx.quantity - remainingToSell) / tx.quantity * saleProceeds;
            const gainLoss = proportionalSaleProceeds - totalCostBasis;
            
            completedTransactions.push({
              symbol,
              sellDate: tx.date,
              gainLoss,
              quantity: tx.quantity - remainingToSell
            });
          }
        }
      });
    });

    // Now calculate capital by source including completed equity gains
    const capitalData = new Map<string, {
      period: string;
      directTransferIn: number;
      directTransferOut: number;
      interestDividends: number;
      netPremium: number;
      netEquityProceeds: number;
    }>();

    transactions.forEach(t => {
      const d = new Date(t.transaction_date);
      if (d < thresholdWeekStart) return;

      let key: string;
      if (period === 'weekly') {
        const weekStart = startOfWeekSunday(d);
        key = formatYyyyMmDd(weekStart);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!capitalData.has(key)) {
        capitalData.set(key, {
          period: key,
          directTransferIn: 0,
          directTransferOut: 0,
          interestDividends: 0,
          netPremium: 0,
          netEquityProceeds: 0
        });
      }

      const data = capitalData.get(key)!;
      const amount = Number(t.amount) || 0;

      // Categorize by transaction type and security type
      if (t.transaction_type === 'Online Transfer') {
        if (amount > 0) {
          data.directTransferIn += amount;
        } else {
          data.directTransferOut += amount; // Keep negative for outflows
        }
      } else if (t.transaction_type === 'Dividend') {
        data.interestDividends += amount;
      } else if (t.security_type === 'OPTN') {
        data.netPremium += amount;
      }
    });

    // Add completed equity gains/losses
    completedTransactions.forEach(ct => {
      if (ct.sellDate < thresholdWeekStart) return;
      
      let key: string;
      if (period === 'weekly') {
        const weekStart = startOfWeekSunday(ct.sellDate);
        key = formatYyyyMmDd(weekStart);
      } else {
        key = `${ct.sellDate.getFullYear()}-${String(ct.sellDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!capitalData.has(key)) {
        capitalData.set(key, {
          period: key,
          directTransferIn: 0,
          directTransferOut: 0,
          interestDividends: 0,
          netPremium: 0,
          netEquityProceeds: 0
        });
      }
      
      const data = capitalData.get(key)!;
      data.netEquityProceeds += ct.gainLoss;
    });

    return Array.from(capitalData.values()).sort((a, b) => a.period.localeCompare(b.period));
  };

  // Calculate cumulative values for capital data
  const calculateCumulativeCapital = (data: ReturnType<typeof calculateCapitalBySource>) => {
    let cumulativeTransferIn = 0;
    let cumulativeTransferOut = 0;
    let cumulativeInterestDividends = 0;
    let cumulativeNetPremium = 0;
    let cumulativeNetEquityProceeds = 0;

    return data.map(item => {
      cumulativeTransferIn += item.directTransferIn;
      cumulativeTransferOut += item.directTransferOut;
      cumulativeInterestDividends += item.interestDividends;
      cumulativeNetPremium += item.netPremium;
      cumulativeNetEquityProceeds += item.netEquityProceeds;

      // Calculate net total of all sources
      const netTotal = cumulativeTransferIn + cumulativeTransferOut + cumulativeInterestDividends + cumulativeNetPremium + cumulativeNetEquityProceeds;

      return {
        period: item.period,
        directTransferIn: cumulativeTransferIn,
        directTransferOut: cumulativeTransferOut,
        interestDividends: cumulativeInterestDividends,
        netPremium: cumulativeNetPremium,
        netEquityProceeds: cumulativeNetEquityProceeds,
        netTotal: netTotal
      };
    });
  };

  const weeklyCapitalData = calculateCumulativeCapital(calculateCapitalBySource('weekly'));
  const monthlyCapitalData = calculateCumulativeCapital(calculateCapitalBySource('monthly'));

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

      {/* Capital by Source Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Capital by Source */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cumulative Weekly Capital by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyCapitalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }} 
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                labelFormatter={(label: string) => {
                  const start = new Date(label + 'T00:00:00');
                  const end = new Date(start);
                  end.setDate(start.getDate() + 6);
                  return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="directTransferIn" stroke="#10b981" strokeWidth={2} name="Cumulative Transfer In" />
              <Line type="monotone" dataKey="directTransferOut" stroke="#ef4444" strokeWidth={2} name="Cumulative Transfer Out" />
              <Line type="monotone" dataKey="interestDividends" stroke="#8b5cf6" strokeWidth={2} name="Cumulative Interest & Dividends" />
              <Line type="monotone" dataKey="netPremium" stroke="#3b82f6" strokeWidth={2} name="Cumulative Net Premium" />
              <Line type="monotone" dataKey="netEquityProceeds" stroke="#f59e0b" strokeWidth={2} name="Cumulative Equity Gains/Losses" />
              <Line type="monotone" dataKey="netTotal" stroke="#1f2937" strokeWidth={3} name="Net Total (All Sources)" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Cumulative capital flows by source since Feb 2025. Shows running totals over time.</p>
        </div>

        {/* Monthly Capital by Source */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cumulative Monthly Capital by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyCapitalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(v) => {
                  const [year, month] = v.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                labelFormatter={(label: string) => {
                  const [year, month] = label.split('-');
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return monthName;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="directTransferIn" stroke="#10b981" strokeWidth={2} name="Cumulative Transfer In" />
              <Line type="monotone" dataKey="directTransferOut" stroke="#ef4444" strokeWidth={2} name="Cumulative Transfer Out" />
              <Line type="monotone" dataKey="interestDividends" stroke="#8b5cf6" strokeWidth={2} name="Cumulative Interest & Dividends" />
              <Line type="monotone" dataKey="netPremium" stroke="#3b82f6" strokeWidth={2} name="Cumulative Net Premium" />
              <Line type="monotone" dataKey="netEquityProceeds" stroke="#f59e0b" strokeWidth={2} name="Cumulative Equity Gains/Losses" />
              <Line type="monotone" dataKey="netTotal" stroke="#1f2937" strokeWidth={3} name="Net Total (All Sources)" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Cumulative capital flows by source since Feb 2025. Shows running totals over time.</p>
        </div>
      </div>

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
