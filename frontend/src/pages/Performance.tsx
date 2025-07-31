import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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

interface MonthlyData {
  month: string;
  premiumCollected: number;
  realizedGain: number;
  totalGain: number;
  cumulativeGain: number;
  optionCount: number;
  stockTradeCount: number;
}

interface SymbolPerformance {
  symbol: string;
  totalGain: number;
  premiumCollected: number;
  optionContracts: number;
  shares: number;
}

interface TransactionTypeData {
  type: string;
  count: number;
  value: number;
  color: string;
}

export function Performance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly performance data
  const calculateMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, MonthlyData>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          premiumCollected: 0,
          realizedGain: 0,
          totalGain: 0,
          cumulativeGain: 0,
          optionCount: 0,
          stockTradeCount: 0
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      const amount = parseFloat(String(transaction.amount));

      if (transaction.security_type === 'OPTN') {
        monthData.premiumCollected += amount;
        monthData.optionCount += 1;
      } else if (transaction.security_type === 'EQ') {
        monthData.stockTradeCount += 1;
      }

      monthData.realizedGain += amount;
      monthData.totalGain += amount;
    });

    // Convert to array and sort chronologically by monthKey (YYYY-MM format)
    const sortedData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by monthKey (YYYY-MM)
      .map(([_, value]) => value); // Extract just the values
    
    let cumulativeSum = 0;
    
    sortedData.forEach(data => {
      cumulativeSum += data.totalGain;
      data.cumulativeGain = cumulativeSum;
    });

    return sortedData;
  };

  // Calculate symbol performance
  const calculateSymbolPerformance = (): SymbolPerformance[] => {
    const symbolMap = new Map<string, SymbolPerformance>();

    transactions.forEach(transaction => {
      const symbol = transaction.calculated_symbol;
      
      // Skip transactions without a valid symbol (like transfers, deposits, etc.)
      if (!symbol || symbol.trim() === '' || 
          transaction.transaction_type === 'Online Transfer' || 
          transaction.transaction_type === 'Transfer') {
        return;
      }
      
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, {
          symbol,
          totalGain: 0,
          premiumCollected: 0,
          optionContracts: 0,
          shares: 0
        });
      }

      const symbolData = symbolMap.get(symbol)!;
      const amount = parseFloat(String(transaction.amount));
      const quantity = parseFloat(String(transaction.quantity));

      symbolData.totalGain += amount;

      if (transaction.security_type === 'OPTN') {
        symbolData.premiumCollected += amount;
        if (transaction.transaction_type === 'Sold Short') {
          symbolData.optionContracts += Math.abs(quantity);
        } else if (['Bought To Cover', 'Option Assigned', 'Option Expired'].includes(transaction.transaction_type)) {
          symbolData.optionContracts -= Math.abs(quantity);
        }
      } else if (transaction.security_type === 'EQ') {
        symbolData.shares += quantity;
      }
    });

    return Array.from(symbolMap.values())
      .filter(data => Math.abs(data.totalGain) > 0.01 || data.optionContracts > 0 || Math.abs(data.shares) > 0)
      .sort((a, b) => b.totalGain - a.totalGain)
      .slice(0, 10); // Top 10 symbols
  };

  // Calculate transaction type distribution
  const calculateTransactionTypes = (): TransactionTypeData[] => {
    const typeMap = new Map<string, { count: number; value: number }>();

    transactions.forEach(transaction => {
      const type = transaction.transaction_type;
      const amount = Math.abs(parseFloat(String(transaction.amount)));

      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, value: 0 });
      }

      const typeData = typeMap.get(type)!;
      typeData.count += 1;
      typeData.value += amount;
    });

    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
      '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#0000ff'
    ];

    return Array.from(typeMap.entries())
      .map(([type, data], index) => ({
        type,
        count: data.count,
        value: data.value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Performance Analysis</h1>
        <div className="text-center py-8">Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Performance Analysis</h1>
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      </div>
    );
  }

  const monthlyData = calculateMonthlyData();
  const symbolPerformance = calculateSymbolPerformance();
  const transactionTypes = calculateTransactionTypes();

  // Calculate summary metrics
  const totalPremiumCollected = monthlyData.reduce((sum, data) => sum + data.premiumCollected, 0);
  const totalRealizedGain = monthlyData.reduce((sum, data) => sum + data.realizedGain, 0);
  const totalOptionTrades = transactionTypes.filter(t => t.type.includes('Option') || t.type.includes('Sold Short') || t.type.includes('Bought To Cover')).reduce((sum, t) => sum + t.count, 0);
  const totalEquityTrades = transactionTypes.filter(t => t.type === 'Bought' || t.type === 'Sold').reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance Analysis</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Premium Collected</h3>
          <p className={`text-2xl font-bold ${totalPremiumCollected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPremiumCollected.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Realized Gain</h3>
          <p className={`text-2xl font-bold ${totalRealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalRealizedGain.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Option Trades</h3>
          <p className="text-2xl font-bold text-blue-600">{totalOptionTrades}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Equity Trades</h3>
          <p className="text-2xl font-bold text-purple-600">{totalEquityTrades}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Performance Line Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Monthly Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulativeGain" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Cumulative Gain"
              />
              <Line 
                type="monotone" 
                dataKey="premiumCollected" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Monthly Premium"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Symbol Performance Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Performing Symbols</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={symbolPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Bar dataKey="totalGain" fill="#8884d8" name="Total Gain" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Premium Collection Area Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Premium Collection Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Area 
                type="monotone" 
                dataKey="premiumCollected" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                fillOpacity={0.6}
                name="Premium Collected"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Type Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Transaction Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={transactionTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percent }) => percent > 5 ? `${type}: ${(percent).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {transactionTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, props: any) => [
                `${value} transactions`,
                props.payload.type
              ]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Monthly Activity Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="optionCount" fill="#8884d8" name="Option Trades" />
            <Bar dataKey="stockTradeCount" fill="#82ca9d" name="Stock Trades" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Symbol Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Symbol Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium Collected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Option Contracts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {symbolPerformance.map((symbol) => (
                <tr key={symbol.symbol} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {symbol.symbol}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    symbol.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${symbol.totalGain.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    symbol.premiumCollected >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${symbol.premiumCollected.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {symbol.optionContracts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {symbol.shares.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
