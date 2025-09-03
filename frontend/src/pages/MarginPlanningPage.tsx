import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Calculator, DollarSign, Calendar, Target, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MarginCurrentStatus {
  account_id: number;
  account_name: string;
  broker: string;
  current_margin_balance: number;
  current_cash_balance: number;
  portfolio_value: number;
  margin_requirement: number;
  excess_margin: number;
  daily_interest: number;
  projected_daily_interest: number;
  projected_monthly_interest: number;
  projected_annual_interest: number;
  margin_utilization_percent: number;
  last_updated: string;
}

interface MarginTransaction {
  id: number;
  transaction_date: string;
  transaction_type: 'DRAW' | 'PAYMENT' | 'INTEREST' | 'FEE';
  amount: number;
  description: string;
  margin_balance_after: number;
  cash_balance_after: number;
}

interface MarginAlert {
  id: number;
  alert_type: string;
  threshold_value?: number;
  threshold_percentage?: number;
  is_active: boolean;
}

interface MarginPlanningScenario {
  id?: number;
  name: string;
  description?: string;
  margin_account_id: number;
  scenario_date: string;
  planned_draw_amount?: number;
  planned_payment_amount?: number;
  projected_margin_balance: number;
  projected_daily_interest: number;
  projected_monthly_interest: number;
  projected_annual_interest: number;
  margin_utilization_percent?: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

interface ScenarioProjection {
  projected_margin_balance: number;
  projected_daily_interest: number;
  projected_monthly_interest: number;
  projected_annual_interest: number;
  margin_utilization_percent: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function MarginPlanningPage() {
  const [currentStatus, setCurrentStatus] = useState<MarginCurrentStatus[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<MarginTransaction[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<MarginAlert[]>([]);
  const [scenarios, setScenarios] = useState<MarginPlanningScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('scenario-planning');

  // Scenario calculator state
  const [scenarioForm, setScenarioForm] = useState({
    name: '',
    description: '',
    drawAmount: 0,
    paymentAmount: 0,
    notes: ''
  });
  const [projectionResult, setProjectionResult] = useState<ScenarioProjection | null>(null);
  const [calculatingProjection, setCalculatingProjection] = useState(false);

  useEffect(() => {
    fetchMarginAnalysis();
  }, []);

  const fetchMarginAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/margin-planning/analysis');
      if (!response.ok) {
        throw new Error('Failed to fetch margin analysis');
      }
      const data = await response.json();
      setCurrentStatus(data.current_status || []);
      setRecentTransactions(data.recent_transactions || []);
      setActiveAlerts(data.active_alerts || []);
      setScenarios(data.scenarios || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const syncMarginTransactions = async () => {
    try {
      const response = await fetch('/api/margin-planning/sync', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sync margin transactions');
      }
      await fetchMarginAnalysis(); // Refresh data after sync
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transactions');
    }
  };

  const calculateProjection = async () => {
    if (currentStatus.length === 0) return;
    
    try {
      setCalculatingProjection(true);
      const response = await fetch('/api/margin-planning/scenarios/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: currentStatus[0]?.account_id,
          drawAmount: scenarioForm.drawAmount,
          paymentAmount: scenarioForm.paymentAmount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate projection');
      }
      
      const projection = await response.json();
      setProjectionResult(projection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate projection');
    } finally {
      setCalculatingProjection(false);
    }
  };

  const saveScenario = async () => {
    if (!projectionResult || currentStatus.length === 0) return;
    
    try {
      const scenario: MarginPlanningScenario = {
        name: scenarioForm.name,
        description: scenarioForm.description,
        margin_account_id: currentStatus[0]?.account_id,
        scenario_date: new Date().toISOString().split('T')[0],
        planned_draw_amount: scenarioForm.drawAmount || undefined,
        planned_payment_amount: scenarioForm.paymentAmount || undefined,
        projected_margin_balance: projectionResult.projected_margin_balance,
        projected_daily_interest: projectionResult.projected_daily_interest,
        projected_monthly_interest: projectionResult.projected_monthly_interest,
        projected_annual_interest: projectionResult.projected_annual_interest,
        margin_utilization_percent: projectionResult.margin_utilization_percent,
        risk_level: projectionResult.risk_level,
        notes: scenarioForm.notes
      };

      const response = await fetch('/api/margin-planning/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });

      if (!response.ok) {
        throw new Error('Failed to save scenario');
      }

      // Reset form and refresh data
      setScenarioForm({ name: '', description: '', drawAmount: 0, paymentAmount: 0, notes: '' });
      setProjectionResult(null);
      await fetchMarginAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Prepare chart data
  const chartData = recentTransactions
    .slice(-30)
    .map(t => ({
      date: formatDate(t.transaction_date),
      marginBalance: t.margin_balance_after,
      cashBalance: t.cash_balance_after
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Planning</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading margin planning data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Planning</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button onClick={fetchMarginAnalysis} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (currentStatus.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-500">No margin account found.</p>
          <button onClick={fetchMarginAnalysis} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = currentStatus[0]; // Assuming single account for now

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Margin Planning</h1>
        </div>
        <button 
          onClick={syncMarginTransactions} 
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Sync Transactions
        </button>
      </div>

      {/* Current Status Cards */}
      {status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`bg-white rounded-lg shadow p-6 border-2 ${Number(status.current_margin_balance || 0) > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Current Margin Balance</span>
              <DollarSign className={`h-4 w-4 ${Number(status.current_margin_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div className={`text-2xl font-bold ${Number(status.current_margin_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Number(status.current_margin_balance || 0))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Number(status.current_margin_balance || 0) > 0 ? 'Outstanding debt' : 'No margin used'}
            </p>
          </div>

          <div className="rounded-lg shadow p-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Monthly Interest Cost</span>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(Number(status.projected_monthly_interest || 0))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              @ 13.2% annual rate
            </p>
          </div>

          <div className="rounded-lg shadow p-6 border-2 border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Cash Available</span>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(Number(status.current_cash_balance || 0))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Immediate liquidity
            </p>
          </div>

          <div className="rounded-lg shadow p-6 border-2 border-purple-200 bg-purple-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Margin Utilization</span>
              <Calculator className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {Number(status.margin_utilization_percent || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Of available margin
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No margin account data available. Please sync transactions first.</p>
        </div>
      )}

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">Active Margin Alerts</h3>
          </div>
          <div className="space-y-2">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="font-medium">{alert.alert_type.replace('_', ' ')}</span>
                <span className="text-sm text-gray-600">
                  {alert.threshold_percentage && `${alert.threshold_percentage}%`}
                  {alert.threshold_value && formatCurrency(alert.threshold_value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'scenario-planning', label: 'Scenario Planning', icon: Lightbulb },
              { id: 'historical-data', label: 'Historical Data', icon: Calendar },
              { id: 'saved-scenarios', label: 'Saved Scenarios', icon: Target },
              { id: 'charts', label: 'Charts', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Scenario Planning Tab */}
          {activeTab === 'scenario-planning' && (
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <Lightbulb className="h-5 w-5 mr-2" />
                <h2 className="text-xl font-semibold">Margin Scenario Calculator</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="drawAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Margin Draw ($)
                    </label>
                    <input
                      id="drawAmount"
                      type="number"
                      value={scenarioForm.drawAmount}
                      onChange={(e) => setScenarioForm(prev => ({ 
                        ...prev, 
                        drawAmount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Payment ($)
                    </label>
                    <input
                      id="paymentAmount"
                      type="number"
                      value={scenarioForm.paymentAmount}
                      onChange={(e) => setScenarioForm(prev => ({ 
                        ...prev, 
                        paymentAmount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button 
                    onClick={calculateProjection} 
                    disabled={calculatingProjection}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {calculatingProjection ? 'Calculating...' : 'Calculate Projection'}
                  </button>
                </div>

                {projectionResult && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Projection Results</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">New Margin Balance:</div>
                        <div className="text-right">{formatCurrency(projectionResult.projected_margin_balance)}</div>
                        
                        <div className="font-medium">Monthly Interest:</div>
                        <div className="text-right">{formatCurrency(projectionResult.projected_monthly_interest)}</div>
                        
                        <div className="font-medium">Annual Interest:</div>
                        <div className="text-right">{formatCurrency(projectionResult.projected_annual_interest)}</div>
                        
                        <div className="font-medium">Utilization:</div>
                        <div className="text-right">{Number(projectionResult.margin_utilization_percent || 0).toFixed(1)}%</div>
                        
                        <div className="font-medium">Risk Level:</div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(projectionResult.risk_level)}`}>
                            {projectionResult.risk_level}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="scenarioName" className="block text-sm font-medium text-gray-700 mb-1">
                          Scenario Name
                        </label>
                        <input
                          id="scenarioName"
                          value={scenarioForm.name}
                          onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Q4 Equipment Purchase"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="scenarioNotes" className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          id="scenarioNotes"
                          value={scenarioForm.notes}
                          onChange={(e) => setScenarioForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional notes about this scenario..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button 
                        onClick={saveScenario} 
                        disabled={!scenarioForm.name}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        Save Scenario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Data Tab */}
          {activeTab === 'historical-data' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Margin Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-right py-3 px-4 font-medium">Margin Balance</th>
                      <th className="text-right py-3 px-4 font-medium">Cash Balance</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 20).map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{formatDate(transaction.transaction_date)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.transaction_type === 'DRAW' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right text-sm font-medium ${
                          transaction.transaction_type === 'DRAW' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm">{formatCurrency(transaction.margin_balance_after)}</td>
                        <td className="py-3 px-4 text-right text-sm">{formatCurrency(transaction.cash_balance_after)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                          {transaction.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Saved Scenarios Tab */}
          {activeTab === 'saved-scenarios' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Saved Planning Scenarios</h2>
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{scenario.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(scenario.risk_level)}`}>
                        {scenario.risk_level}
                      </span>
                    </div>
                    
                    {scenario.description && (
                      <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Projected Balance:</span>
                        <div className="text-lg font-semibold">{formatCurrency(scenario.projected_margin_balance)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Monthly Interest:</span>
                        <div className="text-lg font-semibold">{formatCurrency(scenario.projected_monthly_interest)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Utilization:</span>
                        <div className="text-lg font-semibold">{Number(scenario.margin_utilization_percent || 0).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date Created:</span>
                        <div className="text-lg font-semibold">{formatDate(scenario.scenario_date)}</div>
                      </div>
                    </div>
                    
                    {scenario.notes && (
                      <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-500">
                        <strong className="text-gray-700">Notes:</strong> 
                        <span className="text-gray-600 ml-2">{scenario.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {scenarios.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No saved scenarios yet. Create one using the Scenario Planning tab.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Margin Balance History</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Margin Balance Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line 
                        type="monotone" 
                        dataKey="marginBalance" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Margin Balance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Cash Balance Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line 
                        type="monotone" 
                        dataKey="cashBalance" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Cash Balance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
