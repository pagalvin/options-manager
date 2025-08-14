import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Transaction {
  id: number;
  symbol: string;
  calculated_symbol: string;
  transaction_type: string;
  security_type: string;
  quantity: number | string;
  price: number | string;
  transaction_date: string;
  commission: number | string;
  amount: number | string;
  description: string;
  strike: number | string;
}

export function SymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [manualStrikePrice, setManualStrikePrice] = useState<number | null>(null);
  const [manualOptionContracts, setManualOptionContracts] = useState<number | null>(null);
  const [recommendedWeeklyPremium, setRecommendedWeeklyPremium] = useState<number | null>(null);
  const [editingStrike, setEditingStrike] = useState(false);
  const [editingContracts, setEditingContracts] = useState(false);
  const [editingPremium, setEditingPremium] = useState(false);
  const [strikeInputValue, setStrikeInputValue] = useState('');
  const [contractsInputValue, setContractsInputValue] = useState('');
  const [premiumInputValue, setPremiumInputValue] = useState('');

  const fetchTransactions = async () => {
    if (!symbol) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/transactions/symbol/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        setError('Failed to fetch transactions for symbol');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to fetch transactions'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualStrikePrice = async () => {
    if (!symbol) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/strike-price/symbol/${symbol}/strike-price`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we convert to number or set to null
        const strikePrice = data.manualAverageStrikePrice;
        const contracts = data.manualOptionContracts;
        const weeklyPremium = data.recommendedWeeklyPremium;
        setManualStrikePrice(strikePrice ? parseFloat(String(strikePrice)) : null);
        setManualOptionContracts(contracts ? parseInt(String(contracts)) : null);
        setRecommendedWeeklyPremium(weeklyPremium ? parseFloat(String(weeklyPremium)) : null);
      }
    } catch (error) {
      console.error('Error fetching manual values:', error);
    }
  };

  const saveManualStrikePrice = async (price: number) => {
    if (!symbol) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/strike-price/symbol/${symbol}/strike-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ averageStrikePrice: price }),
      });
      
      if (response.ok) {
        setManualStrikePrice(price);
        setEditingStrike(false);
        setStrikeInputValue('');
      } else {
        setError('Failed to save manual strike price');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to save strike price'}`);
    }
  };

  const handleStrikeEdit = () => {
    setEditingStrike(true);
    setStrikeInputValue(manualStrikePrice?.toString() || '');
  };

  const handleStrikeSave = () => {
    const price = parseFloat(strikeInputValue);
    if (!isNaN(price) && price > 0) {
      saveManualStrikePrice(price);
    }
  };

  const handleStrikeCancel = () => {
    setEditingStrike(false);
    setStrikeInputValue('');
  };

  const handleContractEdit = () => {
    setEditingContracts(true);
    setContractsInputValue(manualOptionContracts?.toString() || '');
  };

  const handleContractSave = async () => {
    if (!symbol) return;
    
    try {
      const value = contractsInputValue !== '' ? parseInt(contractsInputValue) : null;
      
      const response = await fetch(`http://localhost:3001/api/strike-price/symbol/${symbol}/strike-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          averageStrikePrice: manualStrikePrice,
          optionContracts: value,
          recommendedWeeklyPremium: recommendedWeeklyPremium
        }),
      });
      
      if (response.ok) {
        setManualOptionContracts(value);
        setEditingContracts(false);
        setContractsInputValue('');
      }
    } catch (error) {
      console.error('Error saving manual option contracts:', error);
    }
  };

  const handleContractCancel = () => {
    setEditingContracts(false);
    setContractsInputValue('');
  };

  const handlePremiumEdit = () => {
    setEditingPremium(true);
    setPremiumInputValue(recommendedWeeklyPremium?.toString() || '');
  };

  const handlePremiumSave = async () => {
    if (!symbol) return;
    
    try {
      const value = premiumInputValue !== '' ? parseFloat(premiumInputValue) : null;
      
      const response = await fetch(`http://localhost:3001/api/strike-price/symbol/${symbol}/strike-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          averageStrikePrice: manualStrikePrice,
          optionContracts: manualOptionContracts,
          recommendedWeeklyPremium: value 
        }),
      });
      
      if (response.ok) {
        setRecommendedWeeklyPremium(value);
        setEditingPremium(false);
        setPremiumInputValue('');
      }
    } catch (error) {
      console.error('Error saving recommended weekly premium:', error);
    }
  };

  const handlePremiumCancel = () => {
    setEditingPremium(false);
    setPremiumInputValue('');
  };

  // Calculate realized and unrealized gains
  const calculateGains = () => {
    let currentShares = 0;
    let averageCost = 0;
    let realizedGain = 0;
    let optionContracts = 0;
    let openOptionContracts: Array<{symbol: string, strike: number, quantity: number}> = [];

    // Process transactions chronologically, separating EQ and OPTN
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    // Separate equity and option transactions
    const equityTransactions = sortedTransactions.filter(t => String(t.security_type) === 'EQ');
    const optionTransactions = sortedTransactions.filter(t => String(t.security_type) === 'OPTN');

    // Process equity transactions for share position
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

    // Count option contracts (net position) - sum all transactions by type
    // Don't group by symbol/description, just calculate net position across all options
    let netOptionContracts = 0;
    
    // Calculate realized gains from option transactions
    let optionRealizedGain = 0;
    
    optionTransactions.forEach(transaction => {
      const quantity = parseFloat(String(transaction.quantity));
      const transactionType = String(transaction.transaction_type);
      const strike = parseFloat(String(transaction.strike));
      const amount = parseFloat(String(transaction.amount));
      
      // Add option transaction amount to realized gain
      optionRealizedGain += amount;
      
      // Debug logging for CLSK
      if (symbol === 'CLSK') {
        console.log('Processing CLSK transaction:', {
          quantity,
          transactionType,
          strike,
          amount,
          description: String(transaction.description),
          date: transaction.transaction_date
        });
      }
      
      // Calculate net position by transaction type only
      if (transactionType === 'Sold Short') {
        netOptionContracts += Math.abs(quantity);
      } else if (transactionType === 'Bought To Cover' || 
                 transactionType === 'Option Assigned' || 
                 transactionType === 'Option Expired') {
        netOptionContracts -= Math.abs(quantity);
      }
    });
    
    // Add option realized gains to total realized gain
    realizedGain += optionRealizedGain;

    // Debug logging for CLSK
    if (symbol === 'CLSK') {
      console.log('CLSK Net Option Contracts:', netOptionContracts);
    }

    // Set the final option contracts count
    optionContracts = Math.max(0, netOptionContracts);

    // Calculate average strike price for open contracts (simplified)
    // For now, use a simple average of all strikes from Sold Short transactions
    const soldShortStrikes: number[] = [];
    optionTransactions.forEach(transaction => {
      const transactionType = String(transaction.transaction_type);
      const strike = parseFloat(String(transaction.strike));
      if (transactionType === 'Sold Short' && !isNaN(strike)) {
        soldShortStrikes.push(strike);
      }
    });
    
    const avgStrike = soldShortStrikes.length > 0 
      ? soldShortStrikes.reduce((sum, strike) => sum + strike, 0) / soldShortStrikes.length
      : 0;

    // Create a simplified openOptionContracts array for compatibility
    openOptionContracts = [];
    for (let i = 0; i < optionContracts; i++) {
      openOptionContracts.push({
        symbol: symbol || '',
        strike: avgStrike,
        quantity: 1
      });
    }

    // Calculate average strike price for open contracts
    const averageStrikePrice = openOptionContracts.length > 0 
      ? openOptionContracts.reduce((sum, contract) => sum + contract.strike, 0) / openOptionContracts.length
      : 0;

    // For unrealized gain, use the last equity transaction price
    const lastEquityTransaction = equityTransactions[equityTransactions.length - 1];
    const currentPrice = lastEquityTransaction ? parseFloat(String(lastEquityTransaction.price)) : 0;
    const currentValue = currentShares * currentPrice;
    const unrealizedGain = currentValue - (currentShares * averageCost);

    return {
      realizedGain,
      unrealizedGain,
      currentShares,
      averageCost,
      currentValue,
      currentPrice,
      optionContracts,
      averageStrikePrice
    };
  };

  const gains = calculateGains();
  
  // Calculate net premium collected separately
  const calculateNetPremiumCollected = () => {
    const optionTransactions = transactions.filter(t => String(t.security_type) === 'OPTN');
    
    let totalPremiumReceived = 0;
    let totalPremiumPaid = 0;
    
    optionTransactions.forEach(transaction => {
      const amount = parseFloat(String(transaction.amount));
      const transactionType = String(transaction.transaction_type);
      
      // Debug logging for specific symbols
      if (symbol === 'BBAI' || symbol === 'CIFR' || symbol === 'URGN') {
        console.log(`${symbol} Premium Calc: ${transactionType} - Amount: ${amount}`);
      }
      
      // Correct logic: Sold Short adds to premium, Bought To Cover subtracts from premium
      if (transactionType === 'Sold Short') {
        totalPremiumReceived += amount; // Premium received (positive amount)
      } else if (transactionType === 'Bought To Cover') {
        totalPremiumPaid += Math.abs(amount); // Premium paid (amount is negative, so make it positive)
      }
      // For other option transaction types (Option Assigned, Option Expired), don't affect premium
    });
    
    const netPremium = totalPremiumReceived - totalPremiumPaid;
    
    // Debug logging for specific symbols
    if (symbol === 'BBAI' || symbol === 'CIFR' || symbol === 'URGN') {
      console.log(`${symbol} Premium Summary: Received: ${totalPremiumReceived}, Paid: ${totalPremiumPaid}, Net: ${netPremium}`);
    }
    
    return netPremium;
  };
  
  const netPremiumCollected = calculateNetPremiumCollected();
  
  // Calculate max gain on strike separately to access state variables
  const calculateMaxGainOnStrike = () => {
    if (gains.optionContracts <= 0) return 0;
    
    // New Formula: (totalContracts * averageStrikePrice * 100) + sumOfEquityTransactions + sumOfPremiumCollected
    
    // Calculate sum of all equity transactions
    const equityTransactions = transactions.filter(t => String(t.security_type) === 'EQ');
    const sumOfEquityTransactions = equityTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(String(transaction.amount));
      return sum + amount;
    }, 0);
    
    // Use the already calculated net premium collected
    const sumOfPremiumCollected = netPremiumCollected;
    
    // Use manual strike price if available, otherwise use calculated average
    const effectiveStrikePrice = manualStrikePrice || gains.averageStrikePrice;
    
    // Max gain calculation: (contracts * strike * 100) + equity transactions + premium collected
    const maxGain = (gains.optionContracts * effectiveStrikePrice * 100) + sumOfEquityTransactions + sumOfPremiumCollected;
    
    return maxGain;
  };
  
  const maxGainOnStrike = calculateMaxGainOnStrike();

  useEffect(() => {
    fetchTransactions();
    fetchManualStrikePrice();
  }, [symbol]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/positions" className="text-blue-500 hover:text-blue-700">
            ← Back to Positions
          </Link>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!symbol) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/positions" className="text-blue-500 hover:text-blue-700">
            ← Back to Positions
          </Link>
          <h1 className="text-3xl font-bold text-red-600">Symbol not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/positions" className="text-blue-500 hover:text-blue-700">
            ← Back to Positions
          </Link>
          <h1 className="text-3xl font-bold">{symbol} Transactions</h1>
        </div>
        <div className="text-sm text-gray-500">
          Total Transactions: {transactions.length}
        </div>
      </div>

      {/* Position Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Current Shares</div>
          <div className="text-2xl font-bold text-gray-900">
            {gains.currentShares.toFixed(0)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Option Contracts</div>
          <div className="flex items-center space-x-2">
            {editingContracts ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="1"
                  value={contractsInputValue}
                  onChange={(e) => setContractsInputValue(e.target.value)}
                  className="text-lg font-bold text-gray-900 border rounded px-2 py-1 w-20"
                  placeholder="0"
                />
                <button
                  onClick={handleContractSave}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleContractCancel}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {manualOptionContracts !== null ? manualOptionContracts : gains.optionContracts.toFixed(0)}
                </div>
                <button
                  onClick={handleContractEdit}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Avg Strike Price</div>
          <div className="flex items-center space-x-2">
            {editingStrike ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={strikeInputValue}
                  onChange={(e) => setStrikeInputValue(e.target.value)}
                  className="text-lg font-bold text-gray-900 border rounded px-2 py-1 w-20"
                  placeholder="0.00"
                />
                <button
                  onClick={handleStrikeSave}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleStrikeCancel}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {manualStrikePrice && typeof manualStrikePrice === 'number' ? `$${manualStrikePrice.toFixed(2)}` : 'N/A'}
                </div>
                <button
                  onClick={handleStrikeEdit}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Average Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            ${gains.averageCost.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Realized Gain/Loss</div>
          <div className={`text-2xl font-bold ${gains.realizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${gains.realizedGain.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Unrealized Gain/Loss</div>
          <div className={`text-2xl font-bold ${gains.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${gains.unrealizedGain.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Max Gain On Strike</div>
          <div className={`text-2xl font-bold ${maxGainOnStrike >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${maxGainOnStrike.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Net Premium Collected</div>
          <div className={`text-2xl font-bold ${netPremiumCollected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${netPremiumCollected.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Recommended Weekly Premium</div>
          <div className="flex items-center space-x-2">
            {editingPremium ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={premiumInputValue}
                  onChange={(e) => setPremiumInputValue(e.target.value)}
                  className="text-lg font-bold text-gray-900 border rounded px-2 py-1 w-20"
                  placeholder="0.00"
                />
                <button
                  onClick={handlePremiumSave}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handlePremiumCancel}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">
                  {recommendedWeeklyPremium !== null ? `$${recommendedWeeklyPremium.toFixed(2)}` : 'N/A'}
                </div>
                <button
                  onClick={handlePremiumEdit}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Transaction History for {symbol}</h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found for {symbol}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const quantity = parseFloat(String(transaction.quantity));
                  const price = parseFloat(String(transaction.price));
                  const amount = parseFloat(String(transaction.amount));
                  const commission = parseFloat(String(transaction.commission));
                  
                  // Color code based on transaction type or quantity sign
                  const rowClass = quantity > 0 ? 'bg-green-50' : 'bg-red-50';
                  const quantityClass = quantity > 0 ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <tr key={transaction.id} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs ${
                          quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${quantityClass}`}>
                        {quantity > 0 ? '+' : ''}{quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${Math.abs(amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${commission.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Summary Section */}
        {transactions.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Total Transactions</div>
                <div className="text-lg font-semibold">{transactions.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-gray-500">Buy Transactions</div>
                <div className="text-lg font-semibold text-green-600">
                  {transactions.filter(t => parseFloat(String(t.quantity)) > 0).length}
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-sm text-gray-500">Sell Transactions</div>
                <div className="text-lg font-semibold text-red-600">
                  {transactions.filter(t => parseFloat(String(t.quantity)) < 0).length}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-500">Net Quantity</div>
                <div className="text-lg font-semibold text-blue-600">
                  {transactions.reduce((sum, t) => sum + parseFloat(String(t.quantity)), 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
