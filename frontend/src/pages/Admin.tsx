import { useState } from 'react';

export function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDeleteAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL TRANSACTIONS? This cannot be undone!')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      let message = `Success: ${result.message}. Deleted ${result.deletedCounts.transactions} transactions, ${result.deletedCounts.options} options`;
      
      if (result.deletedCounts.positions > 0) {
        message += `, ${result.deletedCounts.positions} positions`;
      }
      
      if (result.deletedCounts.positionsReset > 0) {
        message += `, reset ${result.deletedCounts.positionsReset} positions (manual strike prices preserved)`;
      }
      
      message += `.`;
      setMessage(message);
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to delete data'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Database Management</h2>
        <div className="space-y-4">
          <div>
            <button 
              onClick={handleDeleteAllData}
              disabled={isLoading}
              className={`px-4 py-2 rounded mr-4 text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isLoading ? 'Deleting...' : 'Delete All Transactions'}
            </button>
            <span className="text-gray-600">Warning: This will delete all transactions, positions, and options data (preserves securities)!</span>
          </div>
          <div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4">
              Validate Data Integrity
            </button>
            <span className="text-gray-600">Check for data consistency issues</span>
          </div>
          <div>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4">
              Create Backup
            </button>
            <span className="text-gray-600">Export all data as backup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
