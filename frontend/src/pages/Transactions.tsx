import { useState, useRef, useEffect } from 'react';

interface Transaction {
  id: number;
  symbol: string;
  calculated_symbol: string;
  transaction_type: string;
  quantity: number | string;
  price: number | string;
  transaction_date: string;
  fees: number | string;
  description: string;
}

interface ManualTransactionForm {
  transactionDate: string;
  transactionType: string;
  securityType: string;
  calculatedSymbol: string;
  quantity: number;
  price: number;
  commission: number;
  description: string;
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [deleteFirst, setDeleteFirst] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualEntryStatus, setManualEntryStatus] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState<ManualTransactionForm>({
    transactionDate: new Date().toISOString().split('T')[0],
    transactionType: 'BUY',
    securityType: 'EQ',
    calculatedSymbol: '',
    quantity: 0,
    price: 0,
    commission: 0,
    description: '',
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Please select a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('deleteFirst', deleteFirst.toString());

    try {

      if (deleteFirst) {
        const deleteResponse = await fetch('http://localhost:3001/api/admin/transactions', {
          method: 'DELETE',
        });
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete existing transactions');
        }
      }

      const response = await fetch('http://localhost:3001/api/transactions/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        let message = `Successfully uploaded! ${result.processedCount} transactions processed, ${result.skippedCount} duplicates skipped.`;
        if (result.deletedCount > 0) {
          message = `Deleted ${result.deletedCount} existing transactions. ` + message;
        }
        setUploadStatus(message);
        // Refresh transactions list
        fetchTransactions();
      } else {
        setUploadStatus(`Error: ${result.error || 'Upload failed'}`);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setManualEntryStatus('');

    try {
      const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualForm),
      });

      if (response.ok) {
        setManualEntryStatus('Transaction added successfully!');
        // Reset form
        setManualForm({
          transactionDate: new Date().toISOString().split('T')[0],
          transactionType: 'BUY',
          securityType: 'EQ',
          calculatedSymbol: '',
          quantity: 0,
          price: 0,
          commission: 0,
          description: '',
        });
        // Refresh transactions list
        fetchTransactions();
      } else {
        const error = await response.json();
        setManualEntryStatus(`Error: ${error.error || 'Failed to add transaction'}`);
      }
    } catch (error) {
      setManualEntryStatus(`Error: ${error instanceof Error ? error.message : 'Failed to add transaction'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualFormChange = (field: keyof ManualTransactionForm, value: string | number) => {
    setManualForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setManualForm({
      transactionDate: transaction.transaction_date.split('T')[0],
      transactionType: transaction.transaction_type,
      securityType: 'EQ', // Default, you may want to add this field to Transaction interface
      calculatedSymbol: transaction.calculated_symbol,
      quantity: parseFloat(String(transaction.quantity)),
      price: parseFloat(String(transaction.price)),
      commission: parseFloat(String(transaction.fees || '0')),
      description: transaction.description,
    });
    setShowManualEntry(true);
    setManualEntryStatus('Editing transaction - make your changes and click Update Transaction');
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    setIsUpdating(true);
    setManualEntryStatus('');

    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualForm),
      });

      if (response.ok) {
        setManualEntryStatus('Transaction updated successfully!');
        setEditingTransaction(null);
        // Reset form
        setManualForm({
          transactionDate: new Date().toISOString().split('T')[0],
          transactionType: 'BUY',
          securityType: 'EQ',
          calculatedSymbol: '',
          quantity: 0,
          price: 0,
          commission: 0,
          description: '',
        });
        // Refresh transactions list
        fetchTransactions();
      } else {
        const error = await response.json();
        setManualEntryStatus(`Error: ${error.error || 'Failed to update transaction'}`);
      }
    } catch (error) {
      setManualEntryStatus(`Error: ${error instanceof Error ? error.message : 'Failed to update transaction'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(transactionId);

    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh transactions list
        fetchTransactions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete transaction'}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete transaction'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setManualForm({
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'BUY',
      securityType: 'EQ',
      calculatedSymbol: '',
      quantity: 0,
      price: 0,
      commission: 0,
      description: '',
    });
    setManualEntryStatus('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>
      
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Upload eTrade CSV</h2>
        <p className="text-gray-600 mb-4">
          Upload your eTrade transaction history CSV file to automatically process and analyze your trades.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="deleteFirst"
              checked={deleteFirst}
              onChange={(e) => setDeleteFirst(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="deleteFirst" className="text-sm text-gray-700">
              <span className="text-red-600 font-medium">Delete all existing transactions first</span>
              <span className="text-gray-500 block text-xs">Warning: This will permanently remove all transaction data before uploading new data</span>
            </label>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload CSV File'}
          </button>
          
          {uploadStatus && (
            <div className={`p-3 rounded ${uploadStatus.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {uploadStatus}
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {editingTransaction ? 'Edit Transaction' : 'Manual Transaction Entry'}
          </h2>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showManualEntry ? 'Hide Form' : 'Show Form'}
          </button>
        </div>
        
        {showManualEntry && (
          <div>
            {editingTransaction && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-blue-800 text-sm">
                  <strong>Editing Transaction #{editingTransaction.id}</strong> - Original: {editingTransaction.transaction_type} {editingTransaction.quantity} {editingTransaction.calculated_symbol} @ ${parseFloat(String(editingTransaction.price)).toFixed(2)}
                </p>
              </div>
            )}
            <form onSubmit={editingTransaction ? handleUpdateTransaction : handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={manualForm.transactionDate}
                  onChange={(e) => handleManualFormChange('transactionDate', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={manualForm.transactionType}
                  onChange={(e) => handleManualFormChange('transactionType', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                  <option value="SELL_TO_OPEN">SELL TO OPEN</option>
                  <option value="BUY_TO_CLOSE">BUY TO CLOSE</option>
                  <option value="SELL_TO_CLOSE">SELL TO CLOSE</option>
                  <option value="BUY_TO_OPEN">BUY TO OPEN</option>
                  <option value="DIVIDEND">DIVIDEND</option>
                  <option value="SPLIT">SPLIT</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Type
                </label>
                <select
                  value={manualForm.securityType}
                  onChange={(e) => handleManualFormChange('securityType', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EQ">Stock (EQ)</option>
                  <option value="OPT">Option (OPT)</option>
                  <option value="ETF">ETF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={manualForm.calculatedSymbol}
                  onChange={(e) => handleManualFormChange('calculatedSymbol', e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={manualForm.quantity || ''}
                  onChange={(e) => handleManualFormChange('quantity', parseFloat(e.target.value) || 0)}
                  placeholder="100"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Share
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualForm.price || ''}
                  onChange={(e) => handleManualFormChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="150.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission/Fees
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualForm.commission || ''}
                  onChange={(e) => handleManualFormChange('commission', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={manualForm.description}
                onChange={(e) => handleManualFormChange('description', e.target.value)}
                placeholder="Manual transaction entry"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Value: ${((manualForm.quantity || 0) * (manualForm.price || 0)).toFixed(2)}
                {manualForm.commission > 0 && (
                  <span> + ${manualForm.commission.toFixed(2)} fees</span>
                )}
              </div>
              
              <div className="flex space-x-2">
                {editingTransaction && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={editingTransaction ? isUpdating : isSubmitting}
                  className={`px-6 py-2 rounded text-white disabled:bg-gray-400 disabled:cursor-not-allowed ${
                    editingTransaction 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {editingTransaction 
                    ? (isUpdating ? 'Updating...' : 'Update Transaction')
                    : (isSubmitting ? 'Adding...' : 'Add Transaction')
                  }
                </button>
              </div>
            </div>
            
            {manualEntryStatus && (
              <div className={`p-3 rounded ${manualEntryStatus.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {manualEntryStatus}
              </div>
            )}
          </form>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions found. Upload a CSV file to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice(0, 20).map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.calculated_symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.transaction_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(String(transaction.price || '0')).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(parseFloat(String(transaction.quantity || '0')) * parseFloat(String(transaction.price || '0')) + parseFloat(String(transaction.fees || '0'))).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          disabled={isDeleting === transaction.id}
                          className="text-red-600 hover:text-red-900 text-sm disabled:text-gray-400"
                        >
                          {isDeleting === transaction.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {transactions.length > 20 && (
              <div className="mt-4 text-sm text-gray-500">
                Showing 20 of {transactions.length} transactions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
