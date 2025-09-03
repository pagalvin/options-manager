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
          accountId: currentStatus[0].account_id,
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
        margin_account_id: currentStatus[0].account_id,
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button onClick={fetchMarginAnalysis} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
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
        <Button onClick={syncMarginTransactions} variant="outline">
          Sync Transactions
        </Button>
      </div>

      {/* Current Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={status.current_margin_balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Margin Balance</CardTitle>
              <DollarSign className={`h-4 w-4 ${status.current_margin_balance > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${status.current_margin_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(status.current_margin_balance)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {status.current_margin_balance > 0 ? 'Outstanding debt' : 'No margin used'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Interest Cost</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(status.projected_monthly_interest)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                @ 13.2% annual rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(status.current_cash_balance)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Immediate liquidity
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin Utilization</CardTitle>
              <Calculator className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {status.margin_utilization_percent.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Of available margin
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Margin Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scenario-planning" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenario-planning">Scenario Planning</TabsTrigger>
          <TabsTrigger value="historical-data">Historical Data</TabsTrigger>
          <TabsTrigger value="saved-scenarios">Saved Scenarios</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="scenario-planning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Margin Scenario Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="drawAmount">Planned Margin Draw ($)</Label>
                    <Input
                      id="drawAmount"
                      type="number"
                      value={scenarioForm.drawAmount}
                      onChange={(e) => setScenarioForm(prev => ({ 
                        ...prev, 
                        drawAmount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentAmount">Planned Payment ($)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      value={scenarioForm.paymentAmount}
                      onChange={(e) => setScenarioForm(prev => ({ 
                        ...prev, 
                        paymentAmount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                    />
                  </div>

                  <Button 
                    onClick={calculateProjection} 
                    disabled={calculatingProjection}
                    className="w-full"
                  >
                    {calculatingProjection ? 'Calculating...' : 'Calculate Projection'}
                  </Button>
                </div>

                {projectionResult && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Projection Results</h3>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">New Margin Balance:</div>
                      <div className="text-right">{formatCurrency(projectionResult.projected_margin_balance)}</div>
                      
                      <div className="font-medium">Monthly Interest:</div>
                      <div className="text-right">{formatCurrency(projectionResult.projected_monthly_interest)}</div>
                      
                      <div className="font-medium">Annual Interest:</div>
                      <div className="text-right">{formatCurrency(projectionResult.projected_annual_interest)}</div>
                      
                      <div className="font-medium">Utilization:</div>
                      <div className="text-right">{projectionResult.margin_utilization_percent.toFixed(1)}%</div>
                      
                      <div className="font-medium">Risk Level:</div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(projectionResult.risk_level)}`}>
                          {projectionResult.risk_level}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="scenarioName">Scenario Name</Label>
                        <Input
                          id="scenarioName"
                          value={scenarioForm.name}
                          onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Q4 Equipment Purchase"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="scenarioNotes">Notes</Label>
                        <Textarea
                          id="scenarioNotes"
                          value={scenarioForm.notes}
                          onChange={(e) => setScenarioForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional notes about this scenario..."
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={saveScenario} 
                        disabled={!scenarioForm.name}
                        className="w-full"
                      >
                        Save Scenario
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical-data">
          <Card>
            <CardHeader>
              <CardTitle>Recent Margin Transactions</CardTitle>
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
                      <th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 20).map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 text-sm">{formatDate(transaction.transaction_date)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.transaction_type === 'DRAW' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className={`py-2 text-right text-sm font-medium ${
                          transaction.transaction_type === 'DRAW' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-2 text-right text-sm">{formatCurrency(transaction.margin_balance_after)}</td>
                        <td className="py-2 text-right text-sm">{formatCurrency(transaction.cash_balance_after)}</td>
                        <td className="py-2 text-sm text-gray-600 max-w-xs truncate">
                          {transaction.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved-scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Saved Planning Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{scenario.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(scenario.risk_level)}`}>
                        {scenario.risk_level}
                      </span>
                    </div>
                    
                    {scenario.description && (
                      <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Projected Balance:</span>
                        <br />
                        {formatCurrency(scenario.projected_margin_balance)}
                      </div>
                      <div>
                        <span className="font-medium">Monthly Interest:</span>
                        <br />
                        {formatCurrency(scenario.projected_monthly_interest)}
                      </div>
                      <div>
                        <span className="font-medium">Utilization:</span>
                        <br />
                        {scenario.margin_utilization_percent?.toFixed(1) || 0}%
                      </div>
                      <div>
                        <span className="font-medium">Date Created:</span>
                        <br />
                        {formatDate(scenario.scenario_date)}
                      </div>
                    </div>
                    
                    {scenario.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {scenario.notes}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Margin Balance History</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Balance History</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
