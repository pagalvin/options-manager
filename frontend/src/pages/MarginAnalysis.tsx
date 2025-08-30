import { useState, useEffect } from 'react';
import { fetchMarginAnalysis, MarginAnalysis } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Calculator, AlertTriangle } from 'lucide-react';

export function MarginAnalysisPage() {
  const [analysis, setAnalysis] = useState<MarginAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true);
        const data = await fetchMarginAnalysis();
        setAnalysis(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load margin analysis:', err);
        setError('Failed to load margin analysis');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return `${formattedDate} (${dayName})`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Analysis</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading margin analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Analysis</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Analysis</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">No margin data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, transactions } = analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Calculator className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Margin Analysis</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className={summary.current_balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Margin Balance</CardTitle>
            <DollarSign className={`h-4 w-4 ${summary.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(summary.current_balance)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {summary.current_balance > 0 ? 'Outstanding balance' : 'No margin used'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.current_cash_balance || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Available cash
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest Accrued</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.total_interest_accrued)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              @ 13.2% annual rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Draws</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_draws)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Money borrowed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_payments)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Income applied to margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Balance</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.average_daily_balance)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Over {summary.days_with_balance} days with balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Interest Cost</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.current_balance * 0.132 / 365)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Current daily interest rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Summary Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Margin Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Margin Balance</th>
                  <th className="text-right py-2">Cash Balance</th>
                  <th className="text-right py-2">Interest Today</th>
                  <th className="text-right py-2">Accumulated Interest</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dailySummaries.map((day, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 text-sm">{formatDateWithDay(day.date)}</td>
                    <td className={`py-2 text-right text-sm font-medium ${
                      day.margin_balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(day.margin_balance)}
                    </td>
                    <td className="py-2 text-right text-sm font-medium text-blue-600">
                      {formatCurrency(day.cash_balance)}
                    </td>
                    <td className="py-2 text-right text-sm text-orange-600">
                      {formatCurrency(day.interest_today)}
                    </td>
                    <td className="py-2 text-right text-sm text-orange-600 font-medium">
                      {formatCurrency(day.accumulated_interest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Margin Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Margin Balance</th>
                  <th className="text-right py-2">Cash Balance</th>
                  <th className="text-right py-2">Daily Interest</th>
                  <th className="text-right py-2">Cumulative Interest</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 text-sm">{formatDate(transaction.date)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.type === 'DRAW' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`py-2 text-right text-sm font-medium ${
                      transaction.type === 'DRAW' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.amount > 0 ? formatCurrency(transaction.amount) : '-'}
                    </td>
                    <td className="py-2 text-right text-sm font-medium">
                      {formatCurrency(transaction.running_balance)}
                    </td>
                    <td className="py-2 text-right text-sm font-medium text-blue-600">
                      {formatCurrency(transaction.cash_balance)}
                    </td>
                    <td className="py-2 text-right text-sm text-orange-600">
                      {formatCurrency(transaction.daily_interest)}
                    </td>
                    <td className="py-2 text-right text-sm text-orange-600 font-medium">
                      {formatCurrency(transaction.cumulative_interest)}
                    </td>
                    <td className="py-2 text-sm text-gray-600 max-w-xs truncate">
                      {transaction.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No margin transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
