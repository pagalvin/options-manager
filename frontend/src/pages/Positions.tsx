import { FinancialLinks } from '@/components/FinancialLinks';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Position {
  id: number;
  symbol: string;
  quantity: number | string;
  average_cost: number | string;
  total_invested: number | string;
  current_value?: number | string;
  unrealized_pnl?: number | string;
  security_name?: string;
  recommended_weekly_premium?: number | string;
}

export function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
        filterPositions(data, selectedSymbol);
      } else {
        setError('Failed to fetch positions');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to fetch positions'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/positions/all');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
        filterPositions(data, selectedSymbol);
      } else {
        setError('Failed to fetch all positions');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to fetch all positions'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterPositions = (positionsData: Position[], symbol: string) => {
    // First filter out positions with negative quantities (invalid data)
    const validPositions = positionsData.filter(pos => {
      const quantity = parseFloat(String(pos.quantity));
      return quantity >= 0; // Only include positions with non-negative quantities
    });
    
    // Log if any positions were filtered out due to negative quantities
    const filteredOutCount = positionsData.length - validPositions.length;
    if (filteredOutCount > 0) {
      console.warn(`Filtered out ${filteredOutCount} position(s) with negative quantities:`, 
        positionsData.filter(pos => parseFloat(String(pos.quantity)) < 0).map(pos => `${pos.symbol}: ${pos.quantity}`)
      );
    }
    
    if (symbol === 'all') {
      setFilteredPositions(validPositions);
    } else {
      setFilteredPositions(validPositions.filter(pos => pos.symbol === symbol));
    }
  };

  useEffect(() => {
    if (showClosedPositions) {
      fetchAllPositions();
    } else {
      fetchPositions();
    }
  }, [showClosedPositions]);

  useEffect(() => {
    filterPositions(positions, selectedSymbol);
  }, [selectedSymbol, positions]);

  const handleToggleClosedPositions = () => {
    setShowClosedPositions(!showClosedPositions);
    // Reset symbol filter when toggling to avoid confusion
    setSelectedSymbol('all');
  };

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  // Get unique symbols for dropdown
  const uniqueSymbols = Array.from(new Set(positions.map(pos => pos.symbol))).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Current Positions</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p>Loading positions...</p>
        </div>
      </div>
    );
  }

  const baseRowStyles = (doRightJustify?: boolean) => `p-1 m-1 whitespace-nowrap text-sm text-gray-900 hover:bg-gray-200 ${doRightJustify ? 'text-right' : ''}`;
  const headerRowStyles = (doRightJustify?: boolean) => `px-1 py-1 text-xs font-medium text-gray-500 uppercase ${doRightJustify ? 'text-right' : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Current Positions</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Filter by symbol:</label>
            <select
              value={selectedSymbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Symbols</option>
              {uniqueSymbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showClosedPositions}
              onChange={handleToggleClosedPositions}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Show closed positions</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-1 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          {selectedSymbol === 'all' ? 'Open Positions' : `Positions for ${selectedSymbol}`}
        </h2>
        
        {filteredPositions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {selectedSymbol === 'all' 
                ? 'No positions found.' 
                : `No positions found for ${selectedSymbol}.`
              }
            </p>
            <p className="text-sm text-gray-400">
              {selectedSymbol === 'all' 
                ? 'Upload transactions or click "Recalculate Positions" to generate position data.'
                : 'Try selecting "All Symbols" or check "Show closed positions" if this symbol has been closed out.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-white hover:bg-gray-200 px-1 py-1 whitespace-nowrap text-sm font-medium text-gray-500 border-r border-gray-200">
                    Symbol
                  </th>
                  <th className={headerRowStyles(true)}>
                    Quantity
                  </th>
                  <th className={headerRowStyles(true)}>
                    Avg Cost
                  </th>
                  <th className={headerRowStyles(true)}>
                    Total Invested
                  </th>
                  <th className={headerRowStyles(true)}>
                    Current Basis
                  </th>
                  <th className={headerRowStyles(true)}>
                    Current Value
                  </th>
                  <th className={headerRowStyles()}>
                    Unrealized P&L
                  </th>
                  <th className={headerRowStyles()}>
                    Rec. Weekly Premium
                  </th>
                  <th className={headerRowStyles()}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPositions.map((position) => {
                  // Convert string values to numbers for calculations
                  const quantity = parseFloat(String(position.quantity));
                  const averageCost = parseFloat(String(position.average_cost));
                  const totalInvested = parseFloat(String(position.total_invested));
                  const currentValueFromDB = parseFloat(String(position.current_value || '0'));
                  
                  const currentValue = currentValueFromDB > 0 ? currentValueFromDB : (quantity * averageCost);
                  const currentBasis = quantity * averageCost;
                  const unrealizedPnl = currentValue - totalInvested;
                  const pnlClass = unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600';
                  const isClosed = quantity === 0;
                  const rowClass = isClosed ? 'bg-gray-200 opacity-75' : ' hover:bg-gray-100';
                  
                  return (
                    <tr key={position.id} className={`${rowClass} p-1 m-1`}>
                      <td className={baseRowStyles()}>
                        <Link 
                          to={`/symbol/${position.symbol}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {position.symbol}
                        </Link>
                        <FinancialLinks security={position.symbol} className="ml-2" />
                        {position.security_name && (
                          <div className="text-xs text-gray-500">{position.security_name}</div>
                        )}
                      </td>
                      <td className={baseRowStyles(true)}>
                        {quantity.toLocaleString()}
                      </td>
                      <td className={baseRowStyles(true)}>
                        ${averageCost.toFixed(2)}
                      </td>
                      <td className={baseRowStyles(true)}>
                        ${totalInvested.toFixed(2)}
                      </td>
                      <td className={baseRowStyles(true)}>
                        ${currentBasis.toFixed(2)}
                      </td>
                      <td className={baseRowStyles(true)}>
                        ${currentValue.toFixed(2)}
                      </td>
                      <td className={`p-1 whitespace-nowrap text-sm text-right ${pnlClass}`}>
                        {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                        <div className="text-xs text-gray-500">
                          ({((unrealizedPnl / Math.abs(totalInvested)) * 100).toFixed(1)}%)
                        </div>
                      </td>
                      <td className={baseRowStyles(true)}>
                        {position.recommended_weekly_premium ? 
                          `$${parseFloat(String(position.recommended_weekly_premium)).toFixed(2)}` : 
                          '-'
                        }
                      </td>
                      <td className={baseRowStyles()}>
                        {isClosed ? (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            Closed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Open
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-4 text-sm text-gray-500">
              {selectedSymbol === 'all' ? (
                <>
                  Total Valid Positions: {filteredPositions.length}
                  {showClosedPositions && (
                    <>
                      {' | '}
                      Open: {filteredPositions.filter(p => parseFloat(String(p.quantity)) !== 0).length}
                      {' | '}
                      Closed: {filteredPositions.filter(p => parseFloat(String(p.quantity)) === 0).length}
                    </>
                  )}
                  {positions.length !== filteredPositions.length && (
                    <>
                      {' | '}
                      <span className="text-orange-600">
                        {positions.length - filteredPositions.length} position(s) with invalid data excluded
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Showing {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''} for {selectedSymbol}
                  {positions.filter(p => parseFloat(String(p.quantity)) >= 0).length > filteredPositions.length && (
                    <> | {positions.filter(p => parseFloat(String(p.quantity)) >= 0).length - filteredPositions.length} other symbols available</>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
