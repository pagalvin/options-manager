import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface OptionGreeks {
  rho: number;
  vega: number;
  theta: number;
  delta: number;
  gamma: number;
  iv: number;
  currentValue: boolean;
}

interface OptionData {
  optionCategory: string;
  optionRootSymbol: string;
  timeStamp: number;
  adjustedFlag: boolean;
  displaySymbol: string;
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  inTheMoney: 'y' | 'n';
  volume: number;
  openInterest: number;
  netChange: number;
  lastPrice: number;
  quoteDetail: string;
  osiKey: string;
  OptionGreeks: OptionGreeks;
}

interface OptionPair {
  Call?: OptionData;
  Put?: OptionData;
}

interface OptionChainData {
  timeStamp: number;
  quoteType: string;
  nearPrice: number;
  OptionPair: OptionPair[];
  SelectedED: {
    month: number;
    year: number;
    day: number;
  };
}

interface OptionsChainDisplayProps {
  optionChain: OptionChainData;
  currentPrice: number;
  symbol: string;
}

const OptionsChainDisplay: React.FC<OptionsChainDisplayProps> = ({
  optionChain,
  currentPrice,
  symbol
}) => {
  const [sortBy, setSortBy] = useState<'strike' | 'volume' | 'openInterest' | 'iv'>('strike');
  const [filterType, setFilterType] = useState<'all' | 'itm' | 'otm' | 'near'>('all');

  // Helper functions
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMoneyness = (strike: number, spot: number, isCall: boolean) => {
    if (isCall) {
      if (strike < spot) return { label: 'ITM', color: 'bg-green-100 text-green-800' };
      if (strike === spot) return { label: 'ATM', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'OTM', color: 'bg-gray-100 text-gray-800' };
    } else {
      if (strike > spot) return { label: 'ITM', color: 'bg-green-100 text-green-800' };
      if (strike === spot) return { label: 'ATM', color: 'bg-yellow-100 text-yellow-800' };
      return { label: 'OTM', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getBidAskSpread = (bid: number, ask: number): number => {
    if (bid === 0 || ask === 0) return 0;
    return ((ask - bid) / ((ask + bid) / 2)) * 100;
  };

  const getLiquidityScore = (volume: number, openInterest: number): string => {
    const score = volume + (openInterest * 0.1);
    if (score >= 100) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 10) return 'Fair';
    return 'Poor';
  };

  const getDaysToExpiration = (): number => {
    const expiry = new Date(optionChain.SelectedED.year, optionChain.SelectedED.month - 1, optionChain.SelectedED.day);
    const today = new Date();
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Filter and sort options
  const filteredAndSortedPairs = useMemo(() => {
    let pairs = [...optionChain.OptionPair];

    // Filter
    if (filterType !== 'all') {
      pairs = pairs.filter(pair => {
        const call = pair.Call;
        const put = pair.Put;
        const strike = call?.strikePrice || put?.strikePrice || 0;
        
        if (filterType === 'itm') {
          return (call && call.inTheMoney === 'y') || (put && put.inTheMoney === 'y');
        }
        if (filterType === 'otm') {
          return (call && call.inTheMoney === 'n') || (put && put.inTheMoney === 'n');
        }
        if (filterType === 'near') {
          return Math.abs(strike - currentPrice) <= currentPrice * 0.1; // Within 10%
        }
        return true;
      });
    }

    // Sort
    pairs.sort((a, b) => {
      const strikeA = a.Call?.strikePrice || a.Put?.strikePrice || 0;
      const strikeB = b.Call?.strikePrice || b.Put?.strikePrice || 0;
      
      switch (sortBy) {
        case 'volume':
          const volumeA = (a.Call?.volume || 0) + (a.Put?.volume || 0);
          const volumeB = (b.Call?.volume || 0) + (b.Put?.volume || 0);
          return volumeB - volumeA;
        case 'openInterest':
          const oiA = (a.Call?.openInterest || 0) + (a.Put?.openInterest || 0);
          const oiB = (b.Call?.openInterest || 0) + (b.Put?.openInterest || 0);
          return oiB - oiA;
        case 'iv':
          const ivA = a.Call?.OptionGreeks.iv || a.Put?.OptionGreeks.iv || 0;
          const ivB = b.Call?.OptionGreeks.iv || b.Put?.OptionGreeks.iv || 0;
          return ivB - ivA;
        case 'strike':
        default:
          return strikeA - strikeB;
      }
    });

    return pairs;
  }, [optionChain.OptionPair, filterType, sortBy, currentPrice]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      totalCallVolume: 0,
      totalPutVolume: 0,
      totalCallOI: 0,
      totalPutOI: 0,
      avgCallIV: 0,
      avgPutIV: 0,
      callCount: 0,
      putCount: 0
    };

    optionChain.OptionPair.forEach(pair => {
      if (pair.Call) {
        stats.totalCallVolume += pair.Call.volume;
        stats.totalCallOI += pair.Call.openInterest;
        stats.avgCallIV += pair.Call.OptionGreeks.iv;
        stats.callCount++;
      }
      if (pair.Put) {
        stats.totalPutVolume += pair.Put.volume;
        stats.totalPutOI += pair.Put.openInterest;
        stats.avgPutIV += pair.Put.OptionGreeks.iv;
        stats.putCount++;
      }
    });

    if (stats.callCount > 0) stats.avgCallIV /= stats.callCount;
    if (stats.putCount > 0) stats.avgPutIV /= stats.putCount;

    return stats;
  }, [optionChain.OptionPair]);

  const expiryDate = new Date(optionChain.SelectedED.year, optionChain.SelectedED.month - 1, optionChain.SelectedED.day);
  const daysToExpiry = getDaysToExpiration();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Options Chain - {symbol}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Expires: {expiryDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                daysToExpiry <= 7 ? 'bg-red-100 text-red-800' :
                daysToExpiry <= 30 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {daysToExpiry} days remaining
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Current Price</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentPrice)}
            </div>
            <div className="text-sm text-gray-500">
              Near Price: {formatCurrency(optionChain.nearPrice)}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Call Volume</div>
            <div className="text-lg font-semibold text-green-800">
              {formatLargeNumber(summaryStats.totalCallVolume)}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-red-600">Put Volume</div>
            <div className="text-lg font-semibold text-red-800">
              {formatLargeNumber(summaryStats.totalPutVolume)}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600">P/C Ratio</div>
            <div className="text-lg font-semibold text-blue-800">
              {summaryStats.totalCallVolume > 0 ? 
                (summaryStats.totalPutVolume / summaryStats.totalCallVolume).toFixed(2) : 
                'N/A'}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-purple-600">Avg IV</div>
            <div className="text-lg font-semibold text-purple-800">
              {formatPercent((summaryStats.avgCallIV + summaryStats.avgPutIV) / 2)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Options</option>
              <option value="itm">In-The-Money</option>
              <option value="otm">Out-Of-Money</option>
              <option value="near">Near ATM (±10%)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="strike">Strike Price</option>
              <option value="volume">Volume</option>
              <option value="openInterest">Open Interest</option>
              <option value="iv">Implied Volatility</option>
            </select>
          </div>
        </div>
      </div>

      {/* Options Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th colSpan={7} className="px-4 py-3 text-center text-sm font-semibold text-green-700 uppercase bg-green-50">
                Call Options
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase bg-gray-100">
                Strike
              </th>
              <th colSpan={7} className="px-4 py-3 text-center text-sm font-semibold text-red-700 uppercase bg-red-50">
                Put Options
              </th>
            </tr>
            <tr className="bg-gray-50">
              {/* Call Headers */}
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bid/Ask</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Last</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Vol</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">OI</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">IV</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Greeks</th>
              
              {/* Strike Header */}
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase bg-gray-100">Price</th>
              
              {/* Put Headers */}
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Greeks</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">IV</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">OI</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Vol</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Last</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bid/Ask</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedPairs.map((pair, index) => {
              const strike = pair.Call?.strikePrice || pair.Put?.strikePrice || 0;
              const isNearMoney = Math.abs(strike - currentPrice) <= currentPrice * 0.02;
              
              return (
                <tr key={index} className={`hover:bg-gray-50 ${isNearMoney ? 'bg-yellow-50' : ''}`}>
                  {/* Call Options */}
                  <td className="px-2 py-3">
                    {pair.Call && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        getMoneyness(strike, currentPrice, true).color
                      }`}>
                        {getMoneyness(strike, currentPrice, true).label}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Call ? (
                      <div>
                        <div className="font-medium">{formatCurrency(pair.Call.bid)} / {formatCurrency(pair.Call.ask)}</div>
                        <div className="text-xs text-gray-500">
                          Spread: {getBidAskSpread(pair.Call.bid, pair.Call.ask).toFixed(1)}%
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Call ? (
                      <div>
                        <div className="font-medium">{formatCurrency(pair.Call.lastPrice)}</div>
                        {pair.Call.netChange !== 0 && (
                          <div className={`text-xs ${pair.Call.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pair.Call.netChange >= 0 ? '+' : ''}{formatCurrency(pair.Call.netChange)}
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3 text-sm">{pair.Call ? formatLargeNumber(pair.Call.volume) : '-'}</td>
                  <td className="px-2 py-3 text-sm">{pair.Call ? formatLargeNumber(pair.Call.openInterest) : '-'}</td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Call ? (
                      <div>
                        <div className="font-medium">{formatPercent(pair.Call.OptionGreeks.iv)}</div>
                        <div className="text-xs text-gray-500">
                          {getLiquidityScore(pair.Call.volume, pair.Call.openInterest)}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3 text-xs">
                    {pair.Call && (
                      <div className="space-y-1">
                        <div>Δ: {pair.Call.OptionGreeks.delta.toFixed(3)}</div>
                        <div>Θ: {pair.Call.OptionGreeks.theta.toFixed(3)}</div>
                      </div>
                    )}
                  </td>

                  {/* Strike Price */}
                  <td className="px-2 py-3 text-center bg-gray-50">
                    <div className="font-bold text-lg">{formatCurrency(strike)}</div>
                    <div className="text-xs text-gray-500">
                      {((strike - currentPrice) / currentPrice * 100).toFixed(1)}%
                    </div>
                  </td>

                  {/* Put Options */}
                  <td className="px-2 py-3 text-xs">
                    {pair.Put && (
                      <div className="space-y-1">
                        <div>Δ: {pair.Put.OptionGreeks.delta.toFixed(3)}</div>
                        <div>Θ: {pair.Put.OptionGreeks.theta.toFixed(3)}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Put ? (
                      <div>
                        <div className="font-medium">{formatPercent(pair.Put.OptionGreeks.iv)}</div>
                        <div className="text-xs text-gray-500">
                          {getLiquidityScore(pair.Put.volume, pair.Put.openInterest)}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3 text-sm">{pair.Put ? formatLargeNumber(pair.Put.openInterest) : '-'}</td>
                  <td className="px-2 py-3 text-sm">{pair.Put ? formatLargeNumber(pair.Put.volume) : '-'}</td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Put ? (
                      <div>
                        <div className="font-medium">{formatCurrency(pair.Put.lastPrice)}</div>
                        {pair.Put.netChange !== 0 && (
                          <div className={`text-xs ${pair.Put.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pair.Put.netChange >= 0 ? '+' : ''}{formatCurrency(pair.Put.netChange)}
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    {pair.Put ? (
                      <div>
                        <div className="font-medium">{formatCurrency(pair.Put.bid)} / {formatCurrency(pair.Put.ask)}</div>
                        <div className="text-xs text-gray-500">
                          Spread: {getBidAskSpread(pair.Put.bid, pair.Put.ask).toFixed(1)}%
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-3">
                    {pair.Put && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        getMoneyness(strike, currentPrice, false).color
                      }`}>
                        {getMoneyness(strike, currentPrice, false).label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>Data timestamp: {new Date(optionChain.timeStamp * 1000).toLocaleString()}</p>
        <p>Quote type: {optionChain.quoteType}</p>
      </div>
    </div>
  );
};

export default OptionsChainDisplay;
