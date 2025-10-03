import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Save, X, Download, Calendar } from 'lucide-react';
import {
  MarginMaster,
  MarginPlanningOption,
  MarginPlanningGridRow,
  MarginMasterForm,
  MarginPlanningOptionForm
} from '../types/marginOpportunityPlanner';

const MarginOpportunityPlannerPage: React.FC = () => {
  const [marginMaster, setMarginMaster] = useState<MarginMaster | null>(null);
  const [options, setOptions] = useState<MarginPlanningOption[]>([]);
  const [planningGrid, setPlanningGrid] = useState<MarginPlanningGridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'master' | 'options' | 'planning' | 'calendar'>('master');
  const [loadingETrade, setLoadingETrade] = useState(false);

  // Form states
  const [editingMaster, setEditingMaster] = useState(false);
  const [masterForm, setMasterForm] = useState<MarginMasterForm>({
    current_outstanding_margin: 0,
    current_margin_rate: 10.2,
    notes: ''
  });

  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingOption, setEditingOption] = useState<MarginPlanningOption | null>(null);
  const [optionForm, setOptionForm] = useState<MarginPlanningOptionForm>({
    symbol: '',
    strike_date: '',
    strike_price: 0,
    total_contracts: 1,
    rollable: false
  });

  // Change the type of planningGridEdits to store proposed_margin as string
  const [planningGridEdits, setPlanningGridEdits] = useState<{[key: string]: {proposed_margin?: string, notes?: string}}>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [masterRes, optionsRes, gridRes] = await Promise.all([
        fetch('/api/margin-opportunity-planner/margin-master'),
        fetch('/api/margin-opportunity-planner/options'),
        fetch('/api/margin-opportunity-planner/planning-grid')
      ]);

      if (!masterRes.ok || !optionsRes.ok || !gridRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [masterData, optionsData, gridData] = await Promise.all([
        masterRes.json(),
        optionsRes.json(), 
        gridRes.json()
      ]);

      setMarginMaster(masterData);
      setOptions(optionsData); // Has all options
      setPlanningGrid(gridData); // Has only non-rollable options

      // Initialize form with current data
      if (masterData) {
        setMasterForm({
          current_outstanding_margin: masterData.current_outstanding_margin,
          current_margin_rate: masterData.current_margin_rate,
          notes: masterData.notes || ''
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarginMaster = async () => {
    try {
      const response = await fetch('/api/margin-opportunity-planner/margin-master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterForm)
      });

      if (!response.ok) throw new Error('Failed to update margin master');

      const updatedMaster = await response.json();
      setMarginMaster(updatedMaster);
      setEditingMaster(false);
      
      // Refresh planning grid since margin rate affects calculations
      fetchPlanningGrid();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update margin master');
    }
  };

  const handleSaveOption = async () => {
    try {
      const method = editingOption ? 'PUT' : 'POST';
      const url = editingOption 
        ? `/api/margin-opportunity-planner/options/${editingOption.id}`
        : '/api/margin-opportunity-planner/options';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optionForm)
      });

      if (!response.ok) throw new Error('Failed to save option');

      await fetchData(); // Refresh all data since options affect planning grid
      resetOptionForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save option');
    }
  };

  const handleDeleteOption = async (id: number) => {
    if (!confirm('Are you sure you want to delete this option?')) return;

    try {
      const response = await fetch(`/api/margin-opportunity-planner/options/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete option');

      await fetchData(); // Refresh all data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete option');
    }
  };

  const handleLoadFromETrade = async () => {
    setLoadingETrade(true);
    setError(null);
    
    try {
      // Get session ID from localStorage (should match ETrade component)
      const sessionId = localStorage.getItem('etrade_session_id');
      if (!sessionId) {
        throw new Error('ETrade session not found. Please authenticate with ETrade first.');
      }

      const response = await fetch('/api/margin-opportunity-planner/load-from-etrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load options from ETrade');
      }

      // Refresh the options data
      await fetchData();
      
      const result = await response.json();
      alert(result.message || 'Options loaded from ETrade successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load options from ETrade';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoadingETrade(false);
    }
  };

  const fetchPlanningGrid = async () => {
    try {
      const response = await fetch('/api/margin-opportunity-planner/planning-grid');
      if (!response.ok) throw new Error('Failed to fetch planning grid');
      const gridData = await response.json();
      setPlanningGrid(gridData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch planning grid');
    }
  };

  const handleSavePlanningRow = async (weekEnding: string) => {
    const edits = planningGridEdits[weekEnding];
    if (!edits) return;

    // Find the current row data to preserve existing values
    const currentRow = planningGrid.find(row => row.week_ending === weekEnding);
    if (!currentRow) return;

    try {
      const response = await fetch('/api/margin-opportunity-planner/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_ending: weekEnding,
          proposed_margin: Number(edits.proposed_margin) || 0,  // Parse to number here
          notes: edits.notes !== undefined ? edits.notes : currentRow.notes
        })
      });

      if (!response.ok) throw new Error('Failed to save planning row');

      await fetchPlanningGrid();
      
      // Clear edits for this row
      const newEdits = { ...planningGridEdits };
      delete newEdits[weekEnding];
      setPlanningGridEdits(newEdits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save planning row');
    }
  };

  const handleDeletePlanningRow = async (weekEnding: string) => {
    if (!confirm(`Are you sure you want to delete the planning row for week ending ${new Date(weekEnding).toLocaleDateString()}?`)) return;

    try {
      const response = await fetch(`/api/margin-opportunity-planner/plans/by-week/${encodeURIComponent(weekEnding)}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete planning row');

      await fetchPlanningGrid();
      
      // Clear any edits for this row
      const newEdits = { ...planningGridEdits };
      delete newEdits[weekEnding];
      setPlanningGridEdits(newEdits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete planning row');
    }
  };

  const resetOptionForm = () => {
    setOptionForm({
      symbol: '',
      strike_date: '',
      strike_price: 0,
      total_contracts: 1,
      rollable: false
    });
    setEditingOption(null);
    setShowOptionForm(false);
  };

  const startEditOption = (option: MarginPlanningOption) => {
    setOptionForm({
      symbol: option.symbol,
      strike_date: option.strike_date.split('T')[0], // Convert to YYYY-MM-DD format
      strike_price: option.strike_price,
      total_contracts: option.total_contracts,
      rollable: option.rollable
    });
    setEditingOption(option);
    setShowOptionForm(true);
  };

  // Update updatePlanningGridEdit to store proposed_margin as string without Number conversion
  const updatePlanningGridEdit = (weekEnding: string, field: 'proposed_margin' | 'notes', value: number | string) => {
    setPlanningGridEdits(prev => ({
      ...prev,
      [weekEnding]: {
        ...prev[weekEnding],
        [field]: field === 'proposed_margin' ? value : value  // Keep as string for proposed_margin
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading margin opportunity planner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const getTabMarkup = () => {
    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'master', label: 'Margin Master', icon: Target },
            { key: 'options', label: 'Options', icon: Edit2 },
            { key: 'planning', label: 'Planning Grid', icon: Target },
            { key: 'calendar', label: 'Calendar View', icon: Calendar }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>        
    )
  }

  const getHeaderMarkup = () => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Margin Opportunity Planner</h1>
        </div>
      </div>
    )
  }

  const getMasterMarkup = () => {
    return (
                <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Margin Master Settings</h2>
            {!editingMaster ? (
              <button
                onClick={() => setEditingMaster(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveMarginMaster}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={() => setEditingMaster(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editingMaster ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Outstanding Margin</label>
                <input
                  type="number"
                  step="0.01"
                  value={masterForm.current_outstanding_margin}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, current_outstanding_margin: Number(e.target.value) }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Margin Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={masterForm.current_margin_rate}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, current_margin_rate: Number(e.target.value) }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={masterForm.notes}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={masterForm.notes ? masterForm.notes.split('\n').length : 1}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Outstanding Margin</label>
                <p className="mt-1 text-sm text-gray-900">${marginMaster?.current_outstanding_margin?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Margin Rate</label>
                <p className="mt-1 text-sm text-gray-900">{marginMaster?.current_margin_rate}%</p>
              </div>
              {marginMaster?.notes && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{marginMaster.notes}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">
                  {marginMaster?.last_updated ? new Date(marginMaster.last_updated).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          )}
        </div>

    )
  }

  const getOptionsMarkup = () => {
    return (
        <div className="space-y-6">
          {/* Add/Edit Option Form */}
          {showOptionForm && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingOption ? 'Edit Option' : 'Add New Option'}
                </h2>
                <button
                  onClick={resetOptionForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Symbol</label>
                  <input
                    type="text"
                    value={optionForm.symbol}
                    onChange={(e) => setOptionForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="AAPL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strike Date</label>
                  <input
                    type="date"
                    value={optionForm.strike_date}
                    onChange={(e) => setOptionForm(prev => ({ ...prev, strike_date: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strike Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={optionForm.strike_price}
                    onChange={(e) => setOptionForm(prev => ({ ...prev, strike_price: Number(e.target.value) }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Contracts</label>
                  <input
                    type="number"
                    min="1"
                    value={optionForm.total_contracts}
                    onChange={(e) => setOptionForm(prev => ({ ...prev, total_contracts: Number(e.target.value) }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rollable"
                    checked={optionForm.rollable}
                    onChange={(e) => setOptionForm(prev => ({ ...prev, rollable: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rollable" className="ml-2 block text-sm text-gray-900">
                    Rollable (won't be assigned)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={resetOptionForm}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOption}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingOption ? 'Update' : 'Add'} Option
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Options</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleLoadFromETrade}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  disabled={loadingETrade}
                >
                  {loadingETrade ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Load from ETrade
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowOptionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Strike Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Contracts</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rollable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Group options by date
                    const groupedOptions = options.reduce((groups, option) => {
                      const originalDate = new Date(option.strike_date);
                      originalDate.setDate(originalDate.getDate() + 1); // Add one day

                      const dateKey = originalDate.toISOString().split('T')[0]; // Get adjusted date part
                      if (!groups[dateKey]) {
                        groups[dateKey] = [];
                      }
                      groups[dateKey].push(option);
                      return groups;
                    }, {} as Record<string, typeof options>);

                    const rows: JSX.Element[] = [];
                    let grandTotalContracts = 0;
                    let grandTotalValue = 0;

                    // Sort dates chronologically
                    const sortedDates = Object.keys(groupedOptions).sort();

                    sortedDates.forEach((dateKey) => {
                      const dateOptions = groupedOptions[dateKey];
                      const dateTotalContracts = dateOptions.reduce((sum, opt) => sum + opt.total_contracts, 0);
                      const dateTotalValue = dateOptions.reduce((sum, opt) => sum + (opt.strike_price * opt.total_contracts * 100), 0);
                      // margin cost is calculated as 11.9% of the total value where 11.9% is for a full year
                      const marginCost = 7 * ((dateTotalValue * 0.119) / 365); // Assuming 11.9% margin cost

                      grandTotalContracts += dateTotalContracts;
                      grandTotalValue += dateTotalValue;

                      // Add date header row
                      rows.push(
                        <tr key={`date-${dateKey}`} className="bg-gray-100">
                          <td colSpan={7} className="px-6 py-3 text-sm font-semibold text-gray-900">
                            {new Date(dateKey).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </td>
                        </tr>
                      );

                      // Add options for this date
                      dateOptions.forEach((option) => {
                        rows.push(
                          <tr key={option.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{option.symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(option.strike_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${option.strike_price}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{option.total_contracts}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              ${(option.strike_price * option.total_contracts * 100).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                option.rollable 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {option.rollable ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => startEditOption(option)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOption(option.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });

                      // Add subtotal row for this date
                      rows.push(
                        <tr key={`subtotal-${dateKey}`} className="bg-blue-50 border-t-2 border-blue-200">
                          <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-blue-900 text-right">
                            Subtotal for {new Date(dateKey).toLocaleDateString()}:
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-900 text-right">
                            {dateTotalContracts}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-900 text-right">
                            ${dateTotalValue.toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      );
                    });

                    // Add grand total row
                    if (sortedDates.length > 1) {
                      rows.push(
                        <tr key="grand-total" className="bg-gray-200 border-t-4 border-gray-400">
                          <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                            GRAND TOTAL:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                            {grandTotalContracts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                            ${grandTotalValue.toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
              {options.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No options added yet. Click "Add Option" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>

    )
  }

  const getPlanningMarkup = () => {
    return (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Planning Grid</h2>
            <p className="text-sm text-gray-500 mt-1">
              Weekly margin planning based on anticipated option assignments
              Current margin: ${marginMaster?.current_outstanding_margin?.toLocaleString() || '0'} at {marginMaster?.current_margin_rate || '0'}%
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week Ending</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbols (Non-Rollable)</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Likely Assignments</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proposed Margin</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin Impact</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Margin Impact</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Margin Cost</th>
                  <th className="px-2 py-3 text-left text-xs w-96 font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Sort planning grid by week ending date
                  const sortedGrid = [...planningGrid].sort((a, b) => 
                    new Date(a.week_ending).getTime() - new Date(b.week_ending).getTime()
                  );
                  
                  // Start with current outstanding margin as the base
                  let cumulativeImpact = marginMaster?.current_outstanding_margin || 0;
                  let cumulativeImpact2: number = marginMaster?.current_outstanding_margin || 0;

                  return sortedGrid.map((row) => {
                    const hasEdits = planningGridEdits[row.week_ending];
                    
                    // proposed margin is planned margin for that week
                    // If it's positive, that means I want to use margin that week
                    // If it's negative, I expect an influx of cash by direct deposit or maybe selling some shares
                    const displayProposedMargin = String(hasEdits?.proposed_margin ?? row.proposed_margin ?? '');  // Ensure string
                    const displayNotes = hasEdits?.notes ?? row.notes ?? '';
                     
                    // Calculate cumulative margin impact for this week:
                    // current outstanding margin - likely assignments + proposed margin + cumulative from last week
                    const currentAssignments = Number(row.likely_assignments) || 0;
                    const currentProposedMargin = Number(displayProposedMargin) || 0;

                    // Current assignments reduce margin because they are a sale of stock
                    // Proposed margin increases margin because it's money set aside
                    // Margin Impact = Proposed Margin - Likely Assignments
                    const marginImpact2 = (currentProposedMargin - currentAssignments);

                    // Show cumulative impact AFTER this week's changes
                    // cumulativeImpact = cumulativeImpact - currentAssignments + currentProposedMargin;
                    cumulativeImpact = Number(cumulativeImpact) + Number(marginImpact2);
                    // cumulativeImpact2 = Number(cumulativeImpact2) + marginImpact2;

                    console.log(`MarginOpportunityPlannerPage: stats:`, 
                        {
                            mi2: marginImpact2,
                            ci: cumulativeImpact,
                            ci2: cumulativeImpact2,
                            currentAssignments: currentAssignments,
                            symbols: row.symbols_not_rollable || '-'
                        }
                    )
                    console.log(`MarginOpportunityPlannerPage.tsx: MarginImpact2 = ${marginImpact2} Cumulative Impact = ${cumulativeImpact}, Cumulative Impact 2 = ${cumulativeImpact2}`);

                    const marginCost = Math.max(0, 7 * ((cumulativeImpact * 0.119) / 365)); // Assuming 11.9% margin cost
                    
                    return (
                      <tr key={row.week_ending} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(row.week_ending).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {row.symbols_not_rollable || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${Number(row.likely_assignments || 0).toLocaleString()}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={displayProposedMargin}
                            onChange={(e) => updatePlanningGridEdit(row.week_ending, 'proposed_margin', e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-6  py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <span className={`font-medium ${Number(marginImpact2) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Number(marginImpact2).toLocaleString()} 
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <span className={`font-medium ${cumulativeImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${cumulativeImpact.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {/* {row.margin_cost_weekly ? `$${Number(row.margin_cost_weekly).toFixed(2)}` : '-'} */}
                          {marginCost && <span> (${marginCost.toFixed(2)})</span>}
                        </td>
                        <td className="px-2 py-4 min-w-0 whitespace-nowrap">
                          <textarea
                            style={{ padding: '0.5rem' }}
                            value={displayNotes}
                            onChange={(e) => updatePlanningGridEdit(row.week_ending, 'notes', e.target.value)}
                            rows={displayNotes.split('\n').length}
                            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Add notes..."
                          />
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {hasEdits && (
                              <button
                                onClick={() => handleSavePlanningRow(row.week_ending)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Save changes"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePlanningRow(row.week_ending)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete this planning row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            {planningGrid.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No weeks with option expirations found. Add some options first.</p>
              </div>
            )}
          </div>

          {/* Help Text Section */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Column Explanations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <strong className="text-gray-900">Week Ending:</strong> The Saturday date that marks the end of the options expiration week.
              </div>
              <div>
                <strong className="text-gray-900">Symbols (Non-Rollable):</strong> Option symbols that will expire this week and are not marked as rollable.
              </div>
              <div>
                <strong className="text-gray-900">Likely Assignments:</strong> The dollar value of option assignments expected this week based on current positions.
              </div>
              <div>
                <strong className="text-gray-900">Proposed Margin:</strong> The margin amount you plan to maintain for this week. Edit this field to adjust your planned margin level.
              </div>
              <div>
                <strong className="text-gray-900">Margin Impact:</strong> The net change in margin for this week (Proposed Margin - Likely Assignments).
              </div>
              <div>
                <strong className="text-gray-900">Cumulative Margin Impact:</strong> Running total of margin changes from all previous weeks plus this week's impact.
              </div>
              <div>
                <strong className="text-gray-900">Weekly Margin Cost:</strong> The cost of maintaining the proposed margin for this week based on your current margin rate.
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <strong className="text-gray-900">Notes:</strong> Additional notes or comments about this week's margin planning. Use this to track important decisions or reminders.
              </div>
            </div>
          </div>
        </div>
    );
  }

  const getCalendarMarkup = () => {
    // Get current date and calculate calendar boundaries
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Major US holidays and market closures
    const getHolidays = (year: number) => {
      const holidays = new Map();
      
      // Fixed date holidays
      holidays.set(`${year}-0-1`, 'New Year\'s Day'); // January 1
      holidays.set(`${year}-6-4`, 'Independence Day'); // July 4
      holidays.set(`${year}-10-11`, 'Veterans Day'); // November 11
      holidays.set(`${year}-11-25`, 'Christmas Day'); // December 25
      
      // Martin Luther King Jr. Day - 3rd Monday in January
      const mlkDay = new Date(year, 0, 1 + (7 - new Date(year, 0, 1).getDay()) % 7 + 14);
      holidays.set(`${year}-${mlkDay.getMonth()}-${mlkDay.getDate()}`, 'MLK Day');
      
      // Presidents Day - 3rd Monday in February
      const presidentsDay = new Date(year, 1, 1 + (7 - new Date(year, 1, 1).getDay()) % 7 + 14);
      holidays.set(`${year}-${presidentsDay.getMonth()}-${presidentsDay.getDate()}`, 'Presidents Day');
      
      // Memorial Day - Last Monday in May
      const memorialDay = new Date(year, 4, 31);
      memorialDay.setDate(31 - (memorialDay.getDay() + 6) % 7);
      holidays.set(`${year}-${memorialDay.getMonth()}-${memorialDay.getDate()}`, 'Memorial Day');
      
      // Labor Day - 1st Monday in September
      const laborDay = new Date(year, 8, 1 + (7 - new Date(year, 8, 1).getDay()) % 7);
      holidays.set(`${year}-${laborDay.getMonth()}-${laborDay.getDate()}`, 'Labor Day');
      
      // Thanksgiving - 4th Thursday in November
      const thanksgiving = new Date(year, 10, 1);
      thanksgiving.setDate(1 + (4 - thanksgiving.getDay() + 7) % 7 + 21);
      holidays.set(`${year}-${thanksgiving.getMonth()}-${thanksgiving.getDate()}`, 'Thanksgiving');
      
      // Black Friday - Day after Thanksgiving (half day)
      const blackFriday = new Date(thanksgiving);
      blackFriday.setDate(thanksgiving.getDate() + 1);
      holidays.set(`${year}-${blackFriday.getMonth()}-${blackFriday.getDate()}`, 'Black Friday (Half Day)');
      
      // Good Friday (varies each year - simplified calculation)
      // This is an approximation - in practice you'd use a more precise Easter calculation
      const goodFriday = new Date(year, 3, 15); // Approximate, varies each year
      holidays.set(`${year}-${goodFriday.getMonth()}-${goodFriday.getDate()}`, 'Good Friday');
      
      return holidays;
    };
    
    const holidays = getHolidays(currentYear);
    
    // Group options by month
    const optionsByMonth = options.reduce((acc, option) => {
      const optionDate = new Date(option.strike_date);
      const monthKey = `${optionDate.getFullYear()}-${optionDate.getMonth()}`;
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(option);
      return acc;
    }, {} as Record<string, typeof options>);

    // Generate months to display (current month + next 3 months)
    const monthsToShow = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      monthsToShow.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        monthKey: `${date.getFullYear()}-${date.getMonth()}`,
        monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }

    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay();
    };

    const getOptionsForDate = (year: number, month: number, day: number) => {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      return options.filter(option => option.strike_date.split('T')[0] === dateStr);
    };

    const isToday = (year: number, month: number, day: number) => {
      const date = new Date(year, month, day);
      return date.toDateString() === today.toDateString();
    };

    const isPastDate = (year: number, month: number, day: number) => {
      const date = new Date(year, month, day);
      return date < today;
    };

    const isWeekend = (year: number, month: number, day: number) => {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    };

    const getHoliday = (year: number, month: number, day: number) => {
      return holidays.get(`${year}-${month}-${day}`);
    };

    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Calendar View - Option Expirations</h2>
          <p className="text-sm text-gray-500 mt-1">View your option expirations by month • Market holidays shown in red</p>
        </div>

        <div className="p-6">
          {monthsToShow.map(({ year, month, monthKey, monthName }) => {
            const monthOptions = optionsByMonth[monthKey] || [];
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfMonth(year, month);
            
            // Create calendar grid
            const calendarDays = [];
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < firstDay; i++) {
              calendarDays.push(null);
            }
            
            // Add all days of the month
            for (let day = 1; day <= daysInMonth; day++) {
              calendarDays.push(day);
            }

            return (
              <div key={monthKey} className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{monthName}</h3>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div key={day} className={`p-2 text-center text-sm font-medium border-b ${
                      index === 0 || index === 6 ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                    }`}>
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={index} className="p-1 h-28"></div>;
                    }
                    
                    const dayOptions = getOptionsForDate(year, month, day);
                    const hasOptions = dayOptions.length > 0;
                    const isTodayDate = isToday(year, month, day);
                    const isPast = isPastDate(year, month, day);
                    const isWeekendDay = isWeekend(year, month, day);
                    const holiday = getHoliday(year, month, day);
                    
                    let backgroundClass = 'bg-white';
                    let borderClass = 'border-gray-200';
                    let textClass = 'text-gray-900';
                    
                    if (isTodayDate) {
                      backgroundClass = 'bg-blue-100';
                      borderClass = 'border-blue-400';
                      textClass = 'text-blue-700';
                    } else if (holiday) {
                      backgroundClass = 'bg-red-50';
                      borderClass = 'border-red-300';
                      textClass = 'text-red-700';
                    } else if (isWeekendDay) {
                      backgroundClass = 'bg-gray-100';
                      textClass = 'text-gray-600';
                    } else if (isPast) {
                      backgroundClass = 'bg-gray-50';
                      textClass = 'text-gray-400';
                    }
                    
                    if (hasOptions) {
                      borderClass = 'border-orange-400 border-2';
                      if (!isTodayDate && !holiday) {
                        backgroundClass = 'bg-orange-50';
                      }
                    }
                    
                    return (
                      <div
                        key={day}
                        className={`p-1 h-28 border ${backgroundClass} ${borderClass} relative flex flex-col`}
                      >
                        <div className={`text-sm font-medium ${textClass} mb-1`}>
                          {day}
                        </div>
                        
                        {holiday && (
                          <div className="text-xs text-red-600 font-medium mb-1 leading-tight" title={holiday}>
                            {holiday.length > 12 ? holiday.substring(0, 12) + '...' : holiday}
                          </div>
                        )}
                        
                        {hasOptions && (
                          <div className="flex-1 overflow-hidden">
                            <div className="space-y-0.5 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                              {dayOptions.slice(0, 10).map((option, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs bg-orange-200 text-orange-900 px-1 py-0.5 rounded truncate leading-tight"
                                  title={`${option.symbol} $${option.strike_price} (${option.total_contracts} contracts)${option.rollable ? ' - Rollable' : ''}`}
                                >
                                  {option.symbol} ${option.strike_price}
                                  {option.total_contracts > 1 && ` (${option.total_contracts})`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Monthly summary */}
                {monthOptions.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {monthName} Summary ({monthOptions.length} options expiring)
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Total Contracts: {monthOptions.reduce((sum, opt) => sum + opt.total_contracts, 0)}</div>
                      <div>Total Strike Value: ${monthOptions.reduce((sum, opt) => sum + (opt.strike_price * opt.total_contracts * 100), 0).toLocaleString()}</div>
                      <div>Symbols: {[...new Set(monthOptions.map(opt => opt.symbol))].join(', ')}</div>
                      <div>Rollable: {monthOptions.filter(opt => opt.rollable).length} | Non-rollable: {monthOptions.filter(opt => !opt.rollable).length}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {options.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No options found. Add some options or load from ETrade to see the calendar view.</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Weekend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
              <span>Market Holiday</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-50 border-2 border-orange-400 rounded"></div>
              <span>Options Expire</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span>Past Date</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-4 bg-gray-300 rounded"></div>
              <span>Scroll for more</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {getHeaderMarkup()}

      {/* Tabs */}
      {getTabMarkup()}

      {/* Tab Content */}
      {activeTab === 'master' && (
        getMasterMarkup()
      )}

      {activeTab === 'options' && (
        getOptionsMarkup()
      )}

      {activeTab === 'planning' && (
        getPlanningMarkup()
      )}

      {activeTab === 'calendar' && (
        getCalendarMarkup()
      )}
    </div>
  );
};

export default MarginOpportunityPlannerPage;
