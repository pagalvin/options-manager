import React from 'react';
import { TrendingUp, TrendingDown, Activity, Target, Info, BarChart3 } from 'lucide-react';

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

interface GreekAnalysisProps {
  option: OptionData;
  currentPrice: number;
  daysToExpiry: number;
}

const GreekAnalysis: React.FC<GreekAnalysisProps> = ({ option, currentPrice, daysToExpiry }) => {
  const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate intrinsic and extrinsic value
  const intrinsicValue = option.optionType === 'CALL' 
    ? Math.max(0, currentPrice - option.strikePrice)
    : Math.max(0, option.strikePrice - currentPrice);
  
  const extrinsicValue = option.lastPrice - intrinsicValue;
  const timeValue = extrinsicValue;

  // Delta analysis
  const getDeltaAnalysis = () => {
    const delta = Math.abs(option.OptionGreeks.delta);
    if (delta >= 0.8) return { level: 'Very High', color: 'text-red-600', description: 'Moves almost 1:1 with stock' };
    if (delta >= 0.6) return { level: 'High', color: 'text-orange-600', description: 'Strong correlation with stock price' };
    if (delta >= 0.4) return { level: 'Moderate', color: 'text-yellow-600', description: 'Moderate sensitivity to stock movement' };
    if (delta >= 0.2) return { level: 'Low', color: 'text-blue-600', description: 'Limited sensitivity to stock movement' };
    return { level: 'Very Low', color: 'text-gray-600', description: 'Minimal price sensitivity' };
  };

  // Gamma analysis
  const getGammaAnalysis = () => {
    const gamma = option.OptionGreeks.gamma;
    if (gamma >= 0.1) return { level: 'Very High', color: 'text-red-600', description: 'Delta changes rapidly' };
    if (gamma >= 0.05) return { level: 'High', color: 'text-orange-600', description: 'Significant delta acceleration' };
    if (gamma >= 0.02) return { level: 'Moderate', color: 'text-yellow-600', description: 'Moderate delta changes' };
    if (gamma >= 0.01) return { level: 'Low', color: 'text-blue-600', description: 'Slow delta changes' };
    return { level: 'Very Low', color: 'text-gray-600', description: 'Minimal delta movement' };
  };

  // Theta analysis
  const getThetaAnalysis = () => {
    const dailyDecay = Math.abs(option.OptionGreeks.theta);
    const percentDecay = (dailyDecay / option.lastPrice) * 100;
    
    if (percentDecay >= 5) return { level: 'Very High', color: 'text-red-600', description: 'Rapid time decay' };
    if (percentDecay >= 3) return { level: 'High', color: 'text-orange-600', description: 'Significant time decay' };
    if (percentDecay >= 1) return { level: 'Moderate', color: 'text-yellow-600', description: 'Moderate time decay' };
    if (percentDecay >= 0.5) return { level: 'Low', color: 'text-blue-600', description: 'Slow time decay' };
    return { level: 'Very Low', color: 'text-gray-600', description: 'Minimal time decay' };
  };

  // Vega analysis
  const getVegaAnalysis = () => {
    const vega = option.OptionGreeks.vega;
    if (vega >= 0.3) return { level: 'Very High', color: 'text-red-600', description: 'Highly sensitive to volatility' };
    if (vega >= 0.2) return { level: 'High', color: 'text-orange-600', description: 'Sensitive to volatility changes' };
    if (vega >= 0.1) return { level: 'Moderate', color: 'text-yellow-600', description: 'Moderate volatility sensitivity' };
    if (vega >= 0.05) return { level: 'Low', color: 'text-blue-600', description: 'Low volatility sensitivity' };
    return { level: 'Very Low', color: 'text-gray-600', description: 'Minimal volatility impact' };
  };

  // IV analysis
  const getIVAnalysis = () => {
    const iv = option.OptionGreeks.iv;
    if (iv >= 1.0) return { level: 'Extremely High', color: 'text-red-600', description: 'Very expensive premium' };
    if (iv >= 0.6) return { level: 'High', color: 'text-orange-600', description: 'Expensive premium' };
    if (iv >= 0.4) return { level: 'Moderate', color: 'text-yellow-600', description: 'Average premium' };
    if (iv >= 0.2) return { level: 'Low', color: 'text-blue-600', description: 'Cheap premium' };
    return { level: 'Very Low', color: 'text-gray-600', description: 'Very cheap premium' };
  };

  const deltaAnalysis = getDeltaAnalysis();
  const gammaAnalysis = getGammaAnalysis();
  const thetaAnalysis = getThetaAnalysis();
  const vegaAnalysis = getVegaAnalysis();
  const ivAnalysis = getIVAnalysis();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Greek Analysis - {option.displaySymbol}
      </h3>

      {/* Option Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600">Last Price</div>
          <div className="text-lg font-semibold">{formatCurrency(option.lastPrice)}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-600">Intrinsic Value</div>
          <div className="text-lg font-semibold text-blue-800">{formatCurrency(intrinsicValue)}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600">Time Value</div>
          <div className="text-lg font-semibold text-green-800">{formatCurrency(timeValue)}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-sm text-purple-600">Moneyness</div>
          <div className="text-lg font-semibold text-purple-800">
            {option.inTheMoney === 'y' ? 'ITM' : 'OTM'}
          </div>
        </div>
      </div>

      {/* Greeks Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Delta */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-blue-500" />
            <h4 className="font-semibold text-gray-900">Delta</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-blue-600">
                {option.OptionGreeks.delta.toFixed(3)}
              </span>
              <span className={`text-sm font-medium ${deltaAnalysis.color}`}>
                {deltaAnalysis.level}
              </span>
            </div>
            <p className="text-sm text-gray-600">{deltaAnalysis.description}</p>
            <div className="text-xs text-gray-500">
              ${Math.abs(option.OptionGreeks.delta).toFixed(2)} per $1 stock move
            </div>
          </div>
        </div>

        {/* Gamma */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h4 className="font-semibold text-gray-900">Gamma</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-green-600">
                {option.OptionGreeks.gamma.toFixed(3)}
              </span>
              <span className={`text-sm font-medium ${gammaAnalysis.color}`}>
                {gammaAnalysis.level}
              </span>
            </div>
            <p className="text-sm text-gray-600">{gammaAnalysis.description}</p>
            <div className="text-xs text-gray-500">
              Delta changes by {option.OptionGreeks.gamma.toFixed(3)} per $1 stock move
            </div>
          </div>
        </div>

        {/* Theta */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-gray-900">Theta</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-red-600">
                {option.OptionGreeks.theta.toFixed(3)}
              </span>
              <span className={`text-sm font-medium ${thetaAnalysis.color}`}>
                {thetaAnalysis.level}
              </span>
            </div>
            <p className="text-sm text-gray-600">{thetaAnalysis.description}</p>
            <div className="text-xs text-gray-500">
              {formatCurrency(Math.abs(option.OptionGreeks.theta))} loss per day
            </div>
          </div>
        </div>

        {/* Vega */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <h4 className="font-semibold text-gray-900">Vega</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-purple-600">
                {option.OptionGreeks.vega.toFixed(3)}
              </span>
              <span className={`text-sm font-medium ${vegaAnalysis.color}`}>
                {vegaAnalysis.level}
              </span>
            </div>
            <p className="text-sm text-gray-600">{vegaAnalysis.description}</p>
            <div className="text-xs text-gray-500">
              {formatCurrency(option.OptionGreeks.vega)} per 1% IV change
            </div>
          </div>
        </div>

        {/* Rho */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-gray-500" />
            <h4 className="font-semibold text-gray-900">Rho</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-gray-600">
                {option.OptionGreeks.rho.toFixed(3)}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {Math.abs(option.OptionGreeks.rho) >= 0.1 ? 'Significant' : 'Minimal'}
              </span>
            </div>
            <p className="text-sm text-gray-600">Interest rate sensitivity</p>
            <div className="text-xs text-gray-500">
              {formatCurrency(option.OptionGreeks.rho)} per 1% rate change
            </div>
          </div>
        </div>

        {/* Implied Volatility */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-orange-500" />
            <h4 className="font-semibold text-gray-900">Implied Vol</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-orange-600">
                {formatPercent(option.OptionGreeks.iv)}
              </span>
              <span className={`text-sm font-medium ${ivAnalysis.color}`}>
                {ivAnalysis.level}
              </span>
            </div>
            <p className="text-sm text-gray-600">{ivAnalysis.description}</p>
            <div className="text-xs text-gray-500">
              Market's volatility expectation
            </div>
          </div>
        </div>
      </div>

      {/* Risk Profile */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-semibold text-gray-900 mb-3">Risk Profile Summary</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Time Decay Risk:</strong>
            <div className={`${thetaAnalysis.color} font-medium`}>
              {thetaAnalysis.level} - Loses {formatCurrency(Math.abs(option.OptionGreeks.theta))} daily
            </div>
          </div>
          <div>
            <strong>Volatility Risk:</strong>
            <div className={`${vegaAnalysis.color} font-medium`}>
              {vegaAnalysis.level} - IV at {formatPercent(option.OptionGreeks.iv)}
            </div>
          </div>
          <div>
            <strong>Price Sensitivity:</strong>
            <div className={`${deltaAnalysis.color} font-medium`}>
              {deltaAnalysis.level} - Delta of {option.OptionGreeks.delta.toFixed(3)}
            </div>
          </div>
          <div>
            <strong>Acceleration Risk:</strong>
            <div className={`${gammaAnalysis.color} font-medium`}>
              {gammaAnalysis.level} - Gamma of {option.OptionGreeks.gamma.toFixed(3)}
            </div>
          </div>
        </div>
      </div>

      {/* Trading Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-semibold text-blue-900 mb-3">Trading Insights</h5>
        <div className="space-y-2 text-sm text-blue-800">
          {daysToExpiry <= 7 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>⚠️ Expiring soon - High time decay risk</span>
            </div>
          )}
          {option.OptionGreeks.iv > 0.6 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>📈 High IV - Consider selling premium</span>
            </div>
          )}
          {option.OptionGreeks.iv < 0.3 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>📉 Low IV - Consider buying premium</span>
            </div>
          )}
          {Math.abs(option.OptionGreeks.delta) > 0.7 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>🎯 High delta - Stock-like behavior</span>
            </div>
          )}
          {option.OptionGreeks.gamma > 0.1 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>⚡ High gamma - Delta can change rapidly</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GreekAnalysis;
