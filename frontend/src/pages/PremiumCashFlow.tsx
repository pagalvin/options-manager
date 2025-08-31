import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PremiumCashFlowEntry {
  date: string;
  symbol: string;
  netCredit: number;
  rollType: 'roll_forward' | 'roll_up' | 'roll_down' | 'roll_out';
  buyTransaction: {
    amount: number;
    description: string;
  };
  sellTransaction: {
    amount: number;
    description: string;
  };
}

interface PremiumCashFlowSummary {
  week: string;
  month: string;
  year: number;
  totalNetCredit: number;
  transactionCount: number;
  symbols: string[];
}

interface PremiumCashFlowSummaryResponse {
  summaries: PremiumCashFlowSummary[];
  totalCredits: number;
  totalTransactions: number;
  uniqueSymbols: string[];
}

const PremiumCashFlow: React.FC = () => {
  const [rolls, setRolls] = useState<PremiumCashFlowEntry[]>([]);
  const [summary, setSummary] = useState<PremiumCashFlowSummary[]>([]);

  // Calculate average netCredit per month (must be after summary is defined)
  const monthlySummaries = summary.filter(item => item.month);
  const averageNetCreditPerMonth =
    monthlySummaries.length > 0
      ? monthlySummaries.reduce((sum, item) => sum + (Number(item.totalNetCredit) || 0), 0) / monthlySummaries.length
      : 0;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rollsResponse, summaryResponse] = await Promise.all([
        fetch('/api/premium-cash-flow/rolls'),
        fetch('/api/premium-cash-flow/summary')
      ]);

      if (!rollsResponse.ok || !summaryResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const rollsData = await rollsResponse.json();
      const summaryData: PremiumCashFlowSummaryResponse = await summaryResponse.json();

      setRolls(rollsData);
      setSummary(summaryData.summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Prepare chart data
  const chartData = summary
    .filter(item => viewType === 'weekly' ? item.week : item.month)
    .map(item => ({
      period: viewType === 'weekly' ? item.week : item.month,
      totalNetCredit: Number(item.totalNetCredit) || 0,
      transactionCount: Number(item.transactionCount) || 0,
      symbolCount: item.symbols?.length || 0
    }))
    .reverse(); // Show oldest to newest

  // Calculate totals
  const totalNetCredit = rolls.reduce((sum, roll) => sum + (Number(roll.netCredit) || 0), 0);
  const averagePerRoll = rolls.length > 0 ? totalNetCredit / rolls.length : 0;
  const uniqueSymbols = [...new Set(rolls.map(roll => roll.symbol))];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Premium Cash Flow Analysis
        </h1>
        <p className="text-gray-600 mb-2">
          Track "unhindered" premium cash flow from option rolls, excluding initial covered call transactions.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Data filtered from March 1st, 2025 onwards
        </p>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800">Total Net Credit</h3>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalNetCredit)}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800">Avg Net Credit / Month</h3>
            <p className="text-2xl font-bold text-yellow-900">{formatCurrency(averageNetCreditPerMonth)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">Total Rolls</h3>
            <p className="text-2xl font-bold text-blue-900">{rolls.length}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-800">Average per Roll</h3>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(averagePerRoll)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-orange-800">Unique Symbols</h3>
            <p className="text-2xl font-bold text-orange-900">{uniqueSymbols.length}</p>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Premium Cash Flow Over Time</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewType('monthly')}
              className={`px-4 py-2 rounded ${
                viewType === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={`px-4 py-2 rounded ${
                viewType === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Net Credit Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Net Credit by Period</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalNetCredit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction Count Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Roll Count by Period</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="transactionCount" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Option Rolls</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sell Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rolls.slice(0, 20).map((roll, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(roll.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {roll.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {formatCurrency(Number(roll.netCredit) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {roll.rollType ? roll.rollType.replace('_', ' ') : 'roll'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(Number(roll.buyTransaction?.amount) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(Number(roll.sellTransaction?.amount) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {rolls.length > 20 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Showing first 20 of {rolls.length} total rolls
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumCashFlow;
