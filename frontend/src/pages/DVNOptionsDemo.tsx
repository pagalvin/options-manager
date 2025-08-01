import React, { useState } from 'react';
import OptionsChainDisplay from '../components/OptionsChainDisplay';
import GreekAnalysis from '../components/GreekAnalysis';

// Sample DVN data based on your JSON response
const sampleDVNData = {
  "OptionChainResponse": {
    "timeStamp": 1753992000,
    "quoteType": "CLOSING",
    "nearPrice": 33.225,
    "OptionPair": [
      {
        "Call": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991998,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $20 Call",
          "optionType": "CALL" as const,
          "strikePrice": 20,
          "symbol": "DVN",
          "bid": 12.45,
          "ask": 13.65,
          "bidSize": 87,
          "askSize": 11,
          "inTheMoney": "y" as const,
          "volume": 0,
          "openInterest": 0,
          "netChange": 0,
          "lastPrice": 13.8,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:CALL:20.000000",
          "osiKey": "DVN---250905C00020000",
          "OptionGreeks": {
            "rho": 0.01973,
            "vega": 0.00042,
            "theta": 0,
            "delta": 0.99934,
            "gamma": 0.00068,
            "iv": 0.55385,
            "currentValue": true
          }
        },
        "Put": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991941,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $20 Put",
          "optionType": "PUT" as const,
          "strikePrice": 20,
          "symbol": "DVN",
          "bid": 0,
          "ask": 0.69,
          "bidSize": 0,
          "askSize": 149,
          "inTheMoney": "n" as const,
          "volume": 0,
          "openInterest": 0,
          "netChange": 0,
          "lastPrice": 2.13,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:PUT:20.000000",
          "osiKey": "DVN---250905P00020000",
          "OptionGreeks": {
            "rho": -0.00004,
            "vega": 0.00043,
            "theta": -0.00029,
            "delta": -0.0012,
            "gamma": 0.00068,
            "iv": 0.55379,
            "currentValue": true
          }
        }
      },
      {
        "Call": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991995,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $32 Call",
          "optionType": "CALL" as const,
          "strikePrice": 32,
          "symbol": "DVN",
          "bid": 2.25,
          "ask": 2.41,
          "bidSize": 29,
          "askSize": 37,
          "inTheMoney": "y" as const,
          "volume": 1,
          "openInterest": 2,
          "netChange": -0.34,
          "lastPrice": 2.33,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:CALL:32.000000",
          "osiKey": "DVN---250905C00032000",
          "OptionGreeks": {
            "rho": 0.01949,
            "vega": 0.03809,
            "theta": -0.01973,
            "delta": 0.66493,
            "gamma": 0.09263,
            "iv": 0.37592,
            "currentValue": true
          }
        },
        "Put": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753992000,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $32 Put",
          "optionType": "PUT" as const,
          "strikePrice": 32,
          "symbol": "DVN",
          "bid": 0.89,
          "ask": 1,
          "bidSize": 10,
          "askSize": 49,
          "inTheMoney": "n" as const,
          "volume": 5,
          "openInterest": 19,
          "netChange": 0.08,
          "lastPrice": 0.92,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:PUT:32.000000",
          "osiKey": "DVN---250905P00032000",
          "OptionGreeks": {
            "rho": -0.01046,
            "vega": 0.03822,
            "theta": -0.02015,
            "delta": -0.33952,
            "gamma": 0.09387,
            "iv": 0.37577,
            "currentValue": true
          }
        }
      },
      {
        "Call": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991998,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $33 Call",
          "optionType": "CALL" as const,
          "strikePrice": 33,
          "symbol": "DVN",
          "bid": 1.67,
          "ask": 1.79,
          "bidSize": 17,
          "askSize": 58,
          "inTheMoney": "y" as const,
          "volume": 2,
          "openInterest": 54,
          "netChange": 0.09,
          "lastPrice": 2.11,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:CALL:33.000000",
          "osiKey": "DVN---250905C00033000",
          "OptionGreeks": {
            "rho": 0.01683,
            "vega": 0.04108,
            "theta": -0.02097,
            "delta": 0.56654,
            "gamma": 0.10209,
            "iv": 0.36812,
            "currentValue": true
          }
        },
        "Put": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991993,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $33 Put",
          "optionType": "PUT" as const,
          "strikePrice": 33,
          "symbol": "DVN",
          "bid": 1.27,
          "ask": 1.41,
          "bidSize": 36,
          "askSize": 31,
          "inTheMoney": "n" as const,
          "volume": 20,
          "openInterest": 52,
          "netChange": 0.17,
          "lastPrice": 1.32,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:PUT:33.000000",
          "osiKey": "DVN---250905P00033000",
          "OptionGreeks": {
            "rho": -0.01313,
            "vega": 0.04108,
            "theta": -0.02135,
            "delta": -0.43948,
            "gamma": 0.10368,
            "iv": 0.3681,
            "currentValue": true
          }
        }
      },
      {
        "Call": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991995,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $34 Call",
          "optionType": "CALL" as const,
          "strikePrice": 34,
          "symbol": "DVN",
          "bid": 1.18,
          "ask": 1.3,
          "bidSize": 32,
          "askSize": 4,
          "inTheMoney": "n" as const,
          "volume": 34,
          "openInterest": 156,
          "netChange": -0.27,
          "lastPrice": 1.25,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:CALL:34.000000",
          "osiKey": "DVN---250905C00034000",
          "OptionGreeks": {
            "rho": 0.01386,
            "vega": 0.04143,
            "theta": -0.02093,
            "delta": 0.4614,
            "gamma": 0.10437,
            "iv": 0.3632,
            "currentValue": true
          }
        },
        "Put": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991998,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $34 Put",
          "optionType": "PUT" as const,
          "strikePrice": 34,
          "symbol": "DVN",
          "bid": 1.8,
          "ask": 1.93,
          "bidSize": 16,
          "askSize": 36,
          "inTheMoney": "y" as const,
          "volume": 31,
          "openInterest": 86,
          "netChange": 0.31,
          "lastPrice": 1.89,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:PUT:34.000000",
          "osiKey": "DVN---250905P00034000",
          "OptionGreeks": {
            "rho": -0.01547,
            "vega": 0.04127,
            "theta": -0.02135,
            "delta": -0.54386,
            "gamma": 0.10679,
            "iv": 0.36327,
            "currentValue": true
          }
        }
      },
      {
        "Call": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991998,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $35 Call",
          "optionType": "CALL" as const,
          "strikePrice": 35,
          "symbol": "DVN",
          "bid": 0.8,
          "ask": 0.92,
          "bidSize": 30,
          "askSize": 18,
          "inTheMoney": "n" as const,
          "volume": 0,
          "openInterest": 149,
          "netChange": 0,
          "lastPrice": 1.07,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:CALL:35.000000",
          "osiKey": "DVN---250905C00035000",
          "OptionGreeks": {
            "rho": 0.01095,
            "vega": 0.03914,
            "theta": -0.0196,
            "delta": 0.36195,
            "gamma": 0.09925,
            "iv": 0.36042,
            "currentValue": true
          }
        },
        "Put": {
          "optionCategory": "STANDARD",
          "optionRootSymbol": "DVN",
          "timeStamp": 1753991998,
          "adjustedFlag": false,
          "displaySymbol": "DVN Sep 05 '25 $35 Put",
          "optionType": "PUT" as const,
          "strikePrice": 35,
          "symbol": "DVN",
          "bid": 2.36,
          "ask": 2.67,
          "bidSize": 99,
          "askSize": 171,
          "inTheMoney": "y" as const,
          "volume": 30,
          "openInterest": 71,
          "netChange": 0.4,
          "lastPrice": 2.45,
          "quoteDetail": "https://api.etrade.com/v1/market/quote/DVN:2025:9:5:PUT:35.000000",
          "osiKey": "DVN---250905P00035000",
          "OptionGreeks": {
            "rho": -0.01724,
            "vega": 0.03868,
            "theta": -0.02003,
            "delta": -0.64619,
            "gamma": 0.1025,
            "iv": 0.3603,
            "currentValue": true
          }
        }
      }
    ],
    "SelectedED": {
      "month": 9,
      "year": 2025,
      "day": 5
    }
  }
};

const DVNOptionsDemo: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [view, setView] = useState<'chain' | 'analysis'>('chain');

  const currentPrice = 33.225; // DVN current price
  const optionChainData = sampleDVNData.OptionChainResponse;

  // Calculate days to expiration
  const expiryDate = new Date(2025, 8, 5); // September 5, 2025 (month is 0-indexed)
  const today = new Date();
  const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const handleOptionSelect = (option: any) => {
    setSelectedOption(option);
    setView('analysis');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DVN Options Analysis Demo
          </h1>
          <p className="text-gray-600">
            Demonstrating enhanced options chain display and Greek analysis components with real DVN data
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setView('chain')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'chain'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Options Chain
              </button>
              <button
                onClick={() => setView('analysis')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={!selectedOption}
              >
                Greek Analysis {selectedOption && `(${selectedOption.displaySymbol})`}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {view === 'chain' ? (
          <div className="space-y-6">
            <OptionsChainDisplay
              optionChain={optionChainData}
              currentPrice={currentPrice}
              symbol="DVN"
            />
            
            {/* Quick Option Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Analysis - Select an Option
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {optionChainData.OptionPair.map((pair, index) => (
                  <div key={index} className="space-y-2">
                    {pair.Call && (
                      <button
                        onClick={() => handleOptionSelect(pair.Call)}
                        className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <div className="font-medium text-green-800">
                          ${pair.Call.strikePrice} Call
                        </div>
                        <div className="text-sm text-gray-600">
                          ${pair.Call.lastPrice.toFixed(2)} | IV: {(pair.Call.OptionGreeks.iv * 100).toFixed(1)}%
                        </div>
                      </button>
                    )}
                    {pair.Put && (
                      <button
                        onClick={() => handleOptionSelect(pair.Put)}
                        className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <div className="font-medium text-red-800">
                          ${pair.Put.strikePrice} Put
                        </div>
                        <div className="text-sm text-gray-600">
                          ${pair.Put.lastPrice.toFixed(2)} | IV: {(pair.Put.OptionGreeks.iv * 100).toFixed(1)}%
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : selectedOption ? (
          <GreekAnalysis
            option={selectedOption}
            currentPrice={currentPrice}
            daysToExpiry={daysToExpiry}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No option selected</p>
              <p>Go back to the Options Chain tab and select an option to analyze</p>
            </div>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Integration Notes
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>1. Data Structure:</strong> The components expect the OptionChainResponse format as shown in your JSON.
            </p>
            <p>
              <strong>2. Backend Integration:</strong> Your existing backend route `/api/etrade/options/:symbol` should work seamlessly.
            </p>
            <p>
              <strong>3. Type Safety:</strong> All types are properly defined to match the E*TRADE API response structure.
            </p>
            <p>
              <strong>4. Greek Analysis:</strong> The OptionGreeks object uses the exact field names from your API response.
            </p>
            <p>
              <strong>5. Customization:</strong> Both components accept props and can be styled/customized as needed.
            </p>
          </div>
        </div>

        {/* Sample API Call */}
        <div className="mt-6 bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Sample API Integration
          </h3>
          <pre className="text-green-400 text-sm overflow-x-auto">
{`// Fetch options data from your backend
const fetchDVNOptions = async () => {
  const response = await fetch(
    'http://localhost:3000/api/etrade/options/DVN?expiryYear=2025&expiryMonth=9&expiryDay=5',
    {
      headers: {
        'X-Session-ID': sessionId,
      },
    }
  );
  const data = await response.json();
  
  // Use with components
  <OptionsChainDisplay
    optionChain={data.OptionChainResponse}
    currentPrice={33.225}
    symbol="DVN"
  />
};`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DVNOptionsDemo;
