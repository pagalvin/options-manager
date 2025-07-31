export function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Options Trading Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Positions</h3>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-gray-500">Active equity positions</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Options</h3>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-gray-500">Currently open contracts</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Net Premium</h3>
          <p className="text-2xl font-bold">$0.00</p>
          <p className="text-sm text-gray-500">Premium collected minus paid</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Current Positions</h3>
          <p className="text-gray-500">No positions found. Upload transactions to get started.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">ROI Analysis</h3>
          <p className="text-gray-500">No ROI data available yet.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium">Total Transactions</div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div>
            <div className="text-sm font-medium">Total Options</div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div>
            <div className="text-sm font-medium">Last Transaction</div>
            <div className="text-sm">N/A</div>
          </div>
          <div>
            <div className="text-sm font-medium">Database Size</div>
            <div className="text-sm">N/A</div>
          </div>
        </div>
      </div>
    </div>
  );
}
