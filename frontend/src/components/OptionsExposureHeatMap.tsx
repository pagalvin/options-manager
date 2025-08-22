import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface PositionSummary {
  symbol: string;
  currentShares: number;
  averageCost: number;
  optionContracts: number;
  realizedGain: number;
  unrealizedGain: number;
  netPremiumCollected: number;
  maxGainOnStrike: number;
  currentValue: number;
}

interface OptionsExposureHeatMapProps {
  positions: PositionSummary[];
}

export function OptionsExposureHeatMap({ positions }: OptionsExposureHeatMapProps) {
  const pieChartData = useMemo(() => {
    // Filter positions that have option contracts
    const optionPositions = positions.filter(p => p.optionContracts > 0);
    
    if (optionPositions.length === 0) {
      return [];
    }

    return optionPositions.map(position => {
      // Calculate total exposure using the same logic as Options page:
      // currentExposure = allInvestmentsAllTime - allSalesAllTime
      // For simplicity, we'll use current equity value as the exposure base
      const currentEquityValue = position.currentShares * position.averageCost;
      
      // Current exposure represents the actual capital at risk
      const currentExposure = Math.max(currentEquityValue, 0);
      
      // Option notional value (contracts * 100 shares * current price per share)
      // Using average cost as proxy for current price
      const optionNotionalValue = position.optionContracts * 100 * position.averageCost;
      
      // Total exposure is the sum of equity exposure and option notional exposure
      const totalExposure = currentExposure + optionNotionalValue;
      
      // Calculate exposure ratio (option exposure / total exposure)
      const exposureRatio = totalExposure > 0 ? optionNotionalValue / totalExposure : 0;
      
      // Determine risk level based on exposure ratio and premium collected
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (exposureRatio > 0.5 || position.netPremiumCollected < 0) {
        riskLevel = 'high';
      } else if (exposureRatio > 0.3 || position.optionContracts > 5) {
        riskLevel = 'medium';
      }

      return {
        name: position.symbol,
        value: totalExposure,
        optionContracts: position.optionContracts,
        exposureRatio,
        netPremium: position.netPremiumCollected,
        totalValue: position.currentValue + currentExposure,
        riskLevel,
        currentExposure,
        optionNotionalValue
      };
    }).sort((a, b) => b.value - a.value); // Sort by value for better display
  }, [positions]);

  const getColorByExposure = (exposureRatio: number) => {
    // Color gradient based on exposure ratio
    if (exposureRatio > 0.6) return '#dc2626'; // Red - high exposure
    if (exposureRatio > 0.4) return '#ea580c'; // Orange-red
    if (exposureRatio > 0.3) return '#f59e0b'; // Amber
    if (exposureRatio > 0.2) return '#eab308'; // Yellow
    if (exposureRatio > 0.1) return '#84cc16'; // Lime
    return '#22c55e'; // Green - low exposure
  };

  // Generate colors for each slice
  const colors = pieChartData.map(item => getColorByExposure(item.exposureRatio));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Total Exposure: ${data.value.toLocaleString()}</p>
          <p className="text-sm">Option Contracts: {data.optionContracts}</p>
          <p className="text-sm">Net Premium: ${data.netPremium.toFixed(2)}</p>
          <p className="text-sm">Exposure Ratio: {(data.exposureRatio * 100).toFixed(1)}%</p>
          <p className="text-sm">Risk Level: <span className="capitalize">{data.riskLevel}</span></p>
          <p className="text-sm">Current Exposure: ${data.currentExposure.toLocaleString()}</p>
          <p className="text-sm">Option Notional: ${data.optionNotionalValue.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    // Only show labels for slices larger than 5%
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {name}
      </text>
    );
  };

  if (pieChartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Options Exposure Pie Chart</h3>
        <div className="text-center py-8 text-gray-500">
          No option positions found. The pie chart will display when you have active option contracts.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Options Exposure Pie Chart</h3>
        <p className="text-sm text-gray-600">
          Slice size represents total exposure. Color indicates risk level based on option exposure ratio.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Pie Chart */}
        <div className="flex-1" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Summary */}
        <div className="lg:w-80 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Position Details</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pieChartData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div>${item.value.toLocaleString()}</div>
                    <div className="text-gray-500">
                      {((item.value / pieChartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Risk Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Positions:</span>
                <span>{pieChartData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Exposure:</span>
                <span>${pieChartData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Contracts:</span>
                <span>{pieChartData.reduce((sum, d) => sum + d.optionContracts, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Premium:</span>
                <span className={pieChartData.reduce((sum, d) => sum + d.netPremium, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${pieChartData.reduce((sum, d) => sum + d.netPremium, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Low Risk (&lt;20%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>Medium Risk (20-40%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High Risk (&gt;40%)</span>
          </div>
        </div>
        <div className="text-gray-500">
          Exposure Ratio = Option Notional Value / Total Position Value
        </div>
      </div>
    </div>
  );
}
