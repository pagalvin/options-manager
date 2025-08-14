import { DeleteIcon, EditIcon, RefreshCw, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FinancialLinks } from '../components/FinancialLinks';
import { etradeAPI } from '@/lib/etradeAPI';

interface ManualOptionsAnalysis {
  id?: number;
  security: string;
  market_price?: number | null;
  lots?: number | null;
  option_date?: string | null;
  strike_price?: number | null;
  premium_per_contract?: number | null;
  notes?: string | null;
  next_earnings_date?: string | null;
  company_name?: string | null;
  ex_dividend_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FormData {
  security: string;
  market_price: string;
  lots: string;
  option_date: string;
  strike_price: string;
  premium_per_contract: string;
  notes: string;
  next_earnings_date: string;
  company_name: string;
  ex_dividend_date: string;
}

export function OptionsAnalyzer() {
  const [entries, setEntries] = useState<ManualOptionsAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualOptionsAnalysis | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('security');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hideZeroLots, setHideZeroLots] = useState<boolean>(true);
  const [fetchingPrice, setFetchingPrice] = useState<boolean>(false);
  const [updatingStrategy, setUpdatingStrategy] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    security: '',
    market_price: '',
    lots: '',
    option_date: '',
    strike_price: '',
    premium_per_contract: '',
    notes: '',
    next_earnings_date: '',
    company_name: '',
    ex_dividend_date: ''
  });

  // Format numbers with commas
  const formatNumber = (num: number, decimals: number = 2): string => {

    const num2 = new Number(num);
    const rounded = Number(num2.toFixed(decimals));
    const result = rounded.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    // console.log(`Formatting number: ${num} with decimals: ${decimals}, result: ${result}`);
    return result;
  };

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Calculate days from today
  const calculateDaysFromToday = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const optionDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    optionDate.setHours(0, 0, 0, 0);
    const diffTime = optionDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate cash needed for covered call
  const calculateCashNeeded = (lots: number | null, marketPrice: number | null, premium: number | null): number | null => {
    if (!lots || !marketPrice || !premium) return null;
    return (lots * 100 * marketPrice) - (premium * lots * 100);
  };

  // Calculate net gain if sold at strike
  const calculateNetOnStrike = (lots: number | null, marketPrice: number | null, strikePrice: number | null, premium: number | null): number | null => {
    if (!lots || !marketPrice || !strikePrice || !premium) return null;
    const stockGain = (strikePrice - marketPrice) * lots * 100;
    const premiumGain = premium * lots * 100;
    return stockGain + premiumGain;
  };

  // Calculate percent gain if sold at strike
  const calculatePercentGainOnStrike = (lots: number | null, marketPrice: number | null, strikePrice: number | null, premium: number | null): number | null => {
    if (!lots || !marketPrice || !strikePrice || !premium) return null;
    const cashNeeded = calculateCashNeeded(lots, marketPrice, premium);
    const netGain = calculateNetOnStrike(lots, marketPrice, strikePrice, premium);
    if (!cashNeeded || cashNeeded <= 0 || !netGain) return null;
    return (netGain / cashNeeded) * 100;
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort entries based on current sort settings
  const sortedEntries = [...entries]
    .filter(entry => {
      if (hideZeroLots && (!entry.lots || entry.lots === 0)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'security':
          aValue = a.security;
          bValue = b.security;
          // String sorting for security symbols
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        case 'market_price':
          // Force numeric sorting for market price
          aValue = Number(a.market_price) || 0;
          bValue = Number(b.market_price) || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        default:
          return 0;
      }
    });

  // Fetch current market price from Alpha Vantage API
  const fetchMarketPrice = async () => {
    if (!formData.security.trim()) {
      setError('Please enter a security symbol first');
      return;
    }

    try {
      setFetchingPrice(true);
      setError(null);
      
      // Using the API key from the environment
      // API key should be set in .env.local as VITE_ALPHA_VANTAGE_API_KEY
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'YOUR_API_KEY';
      const symbol = formData.security.trim().toUpperCase();
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`API Error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        throw new Error('API call frequency limit reached. Please try again later.');
      }
      
      // Extract the current price from the response
      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) {
        throw new Error(`No price data found for symbol: ${symbol}`);
      }
      
      const currentPrice = parseFloat(quote['05. price']);
      
      // Update the market price field
      setFormData(prev => ({
        ...prev,
        market_price: currentPrice.toFixed(2)
      }));
      
    } catch (err) {
      console.error('Error fetching market price:', err);
      setError(`Failed to fetch market price: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Fetch all entries
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manual-options-analysis');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      security: '',
      market_price: '',
      lots: '',
      option_date: '',
      strike_price: '',
      premium_per_contract: '',
      notes: '',
      next_earnings_date: '',
      company_name: '',
      ex_dividend_date: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.security.trim()) {
      setError('Security symbol is required');
      return;
    }

    try {
      const payload = {
        security: formData.security.trim().toUpperCase(),
        market_price: formData.market_price ? parseFloat(formData.market_price) : null,
        lots: formData.lots ? parseInt(formData.lots) : null,
        option_date: formData.option_date || null,
        strike_price: formData.strike_price ? parseFloat(formData.strike_price) : null,
        premium_per_contract: formData.premium_per_contract ? parseFloat(formData.premium_per_contract) : null,
        notes: formData.notes.trim() || null,
        next_earnings_date: formData.next_earnings_date || null,
        company_name: formData.company_name.trim() || null,
        ex_dividend_date: formData.ex_dividend_date || null
      };

      const url = editingEntry 
        ? `/api/manual-options-analysis/${editingEntry.id}`
        : '/api/manual-options-analysis';
      
      const method = editingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchEntries();
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError('Failed to save entry');
    }
  };

  // Handle edit
  const handleEdit = (entry: ManualOptionsAnalysis) => {
    const normalizeDateInput = (d?: string | null) => {
      if (!d) return '';
      // If already YYYY-MM-DD, keep first 10 chars; avoid timezone shifts
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
      // If ISO string, split at T
      if (d.includes('T')) return d.split('T')[0];
      // Fallback: try Date parse then format to YYYY-MM-DD
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return '';
    };
    setEditingEntry(entry);
    setFormData({
      security: entry.security,
      market_price: entry.market_price?.toString() || '',
      lots: entry.lots?.toString() || '',
      option_date: normalizeDateInput(entry.option_date),
      strike_price: entry.strike_price?.toString() || '',
      premium_per_contract: entry.premium_per_contract?.toString() || '',
      notes: entry.notes || '',
      next_earnings_date: normalizeDateInput(entry.next_earnings_date),
      company_name: entry.company_name || '',
      ex_dividend_date: normalizeDateInput(entry.ex_dividend_date)
    });
    setShowForm(true);
  };

  // Update strategy using E*TRADE: refresh price and pick minimal 1%+ ITM call
  const updateStrategy = async () => {
    const symbol = formData.security.trim().toUpperCase();
    if (!symbol) {
      setError('Please enter a security symbol first');
      return;
    }
    try {
      setUpdatingStrategy(true);
      setError(null);
      const sessionId = etradeAPI.getSessionId();
      if (!sessionId) {
        alert('Please connect to E*TRADE on the E*TRADE page first, then try again.');
        return;
      }

      // 1) Update market price from E*TRADE quote
      const quote = await etradeAPI.getStockQuote(symbol);
      const q = quote?.QuoteResponse?.QuoteData?.[0];
      const currentPrice: number | null = q?.All?.lastTrade ?? null;
      if (!currentPrice || currentPrice <= 0) {
        throw new Error('Could not determine current market price from E*TRADE.');
      }
      setFormData(prev => ({ ...prev, market_price: currentPrice.toFixed(2) }));

      // 2) Get nearest expiration and fetch option chain
      const exps = await etradeAPI.getOptionExpirationDates(symbol);
      const expirations = exps?.expirationDates || exps?.ExpirationDates || [];
      if (!expirations.length) {
        alert('No option expirations found for this symbol.');
        return;
      }
      const first = expirations[0];
      const year = String(first.year);
      const month = String(first.month);
      const day = String(first.day);
      const chainRaw = await etradeAPI.getOptionChain(symbol, year, month, day);
      const chain = chainRaw?.OptionChainResponse ? {
        ...chainRaw.OptionChainResponse,
        OptionPair: chainRaw.OptionChainResponse.OptionPair || [],
        SelectedED: chainRaw.OptionChainResponse.SelectedED,
      } : chainRaw;
      const pairs = chain?.optionPairs || chain?.OptionPair || [];
      if (!pairs.length) {
        alert('No option chain data returned for the nearest expiration.');
        return;
      }

      // Build 1%+ ITM call opportunities (same logic as E*TRADE page)
      const opportunities = pairs.map((pair: any) => {
        const c = pair.Call;
        if (!c) return null;
        if (c.inTheMoney !== 'y') return null;
        if (!c.bid || c.bid <= 0) return null;
        const strikePrice = c.strikePrice as number;
        const premium = c.bid as number;
        const totalRevenue = strikePrice + premium;
        const gainPercent = ((totalRevenue - currentPrice) / currentPrice) * 100;
        if (gainPercent >= 1) {
          return {
            strikePrice,
            premium,
            totalRevenue,
            gainPercent,
          };
        }
        return null;
      }).filter(Boolean) as Array<{ strikePrice: number; premium: number; totalRevenue: number; gainPercent: number }>;

      if (opportunities.length === 0) {
        const expDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
        alert(`No 1%+ gain ITM call opportunities found for ${symbol} (exp: ${expDate}).`);
        return;
      }

      // Choose the smallest priced opportunity: minimal total revenue (strike + premium)
      opportunities.sort((a, b) => a.totalRevenue - b.totalRevenue);
      const chosen = opportunities[0];

      // Update form fields: option_date (YYYY-MM-DD), strike, premium
      const optionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        option_date: optionDate,
        strike_price: chosen.strikePrice.toFixed(2),
        premium_per_contract: chosen.premium.toFixed(2),
      }));
    } catch (err) {
      console.error('Error updating strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    } finally {
      setUpdatingStrategy(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/manual-options-analysis/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchEntries();
      setError(null);
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry');
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Options Analyzer</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  const baseRowStyles = "px-2 py-2 whitespace-nowrap text-sm";
  const baseHeaderRowStyles = "px-2 py-2 font-medium text-gray-500 uppercase tracking-wider";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Options Analyzer</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideZeroLots}
              onChange={(e) => setHideZeroLots(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Hide zero lot entries</span>
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add New Entry'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingEntry ? 'Edit Entry' : 'Add New Entry'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Symbol *
              </label>
              <input
                type="text"
                name="security"
                value={formData.security}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AAPL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Price
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  name="market_price"
                  value={formData.market_price}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={fetchMarketPrice}
                  disabled={fetchingPrice || !formData.security.trim()}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                  title="Fetch current market price"
                >
                  {fetchingPrice ? '⏳' : '💲'}
                </button>
                <button
                  type="button"
                  onClick={updateStrategy}
                  disabled={updatingStrategy || !formData.security.trim()}
                  className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap flex items-center space-x-1"
                  title="Use E*TRADE data to pick the minimal 1%+ ITM call"
                >
                  {updatingStrategy ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                  <span>Update strategy</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lots/Contracts
              </label>
              <input
                type="number"
                name="lots"
                value={formData.lots}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option Date
              </label>
              <input
                type="date"
                name="option_date"
                value={formData.option_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strike Price
              </label>
              <input
                type="number"
                step="0.01"
                name="strike_price"
                value={formData.strike_price}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Premium per Contract
              </label>
              <input
                type="number"
                step="0.01"
                name="premium_per_contract"
                value={formData.premium_per_contract}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Apple Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Earnings Date
              </label>
              <input
                type="date"
                name="next_earnings_date"
                value={formData.next_earnings_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ex-Dividend Date
              </label>
              <input
                type="date"
                name="ex_dividend_date"
                value={formData.ex_dividend_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {editingEntry ? 'Update Entry' : 'Create Entry'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Manual Options Analysis ({sortedEntries.length} entries{hideZeroLots ? ` of ${entries.length} total` : ''})
        </h2>
        
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Actions
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('security')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Security</span>
                      {sortColumn === 'security' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('market_price')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Market Price</span>
                      {sortColumn === 'market_price' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Lots
                  </th>
                  <th className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Option Date
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Strike Price
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Premium / Contract
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Cash Needed
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Net on Strike
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    % Gain on Strike
                  </th>
                  <th className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Next Earnings
                  </th>
                  <th className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Ex-Dividend
                  </th>
                  <th className={`${baseHeaderRowStyles} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEntries.map((entry) => {
                  const daysFromToday = calculateDaysFromToday(entry.option_date || null);
                  const exDividendDaysFromToday = calculateDaysFromToday(entry.ex_dividend_date || null);
                  const nextEarningsDaysFromToday = calculateDaysFromToday(entry.next_earnings_date || null);
                  const cashNeeded = calculateCashNeeded(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null);
                  const netOnStrike = calculateNetOnStrike(entry.lots || null, entry.market_price || null, entry.strike_price || null, entry.premium_per_contract || null);
                  const percentGainOnStrike = calculatePercentGainOnStrike(entry.lots || null, entry.market_price || null, entry.strike_price || null, entry.premium_per_contract || null);

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">

                                            <td className={`${baseRowStyles} text-sm text-gray-500`}>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EditIcon/>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <DeleteIcon/>
                          </button>
                        </div>
                      </td>

                      <td className={`${baseRowStyles} font-medium text-blue-600`}>
                        <a href={`/symbol/${entry.security}`} className="hover:text-blue-800">
                          {entry.security}
                        </a>
                        <FinancialLinks security={entry.security} />
                        {entry.company_name && (
                          <span className="text-xs text-gray-500 ml-2"><br/>{entry.company_name}</span>
                        )}
                        <br/>
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        { entry.market_price ? `$${formatNumber(entry.market_price)}` : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {entry.lots && entry.lots ? formatNumber(entry.lots, 0) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900`}>
                        {formatDate(entry.option_date || null)}
                        {daysFromToday !== null && (
                          <span className={daysFromToday < 0 ? 'text-red-600' : daysFromToday < 30 ? 'text-yellow-600' : 'text-gray-900'}>
                            <br/>{daysFromToday} days
                          </span>
                        )}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {entry.lots && entry.strike_price ? `$${formatNumber(entry.strike_price)}` : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {entry.lots && entry.premium_per_contract ? `$${formatNumber(entry.premium_per_contract)}` : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {cashNeeded !== null ? `$${formatNumber(cashNeeded)}` : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {netOnStrike !== null ? (
                          <span className={netOnStrike >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${formatNumber(netOnStrike)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {percentGainOnStrike !== null ? (
                          <span className={percentGainOnStrike >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatNumber(percentGainOnStrike)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900`}>
                        {formatDate(entry.next_earnings_date || null)}
                        {nextEarningsDaysFromToday !== null ? (
                          <span className={nextEarningsDaysFromToday < 0 ? 'text-red-600' : nextEarningsDaysFromToday < 30 ? 'text-yellow-600' : 'text-gray-900'}>
                            <br/>{nextEarningsDaysFromToday} days
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900`}>
                        {formatDate(entry.ex_dividend_date || null)}
                        {exDividendDaysFromToday !== null ? (
                          <span className={exDividendDaysFromToday < 0 ? 'text-red-600' : exDividendDaysFromToday < 30 ? 'text-yellow-600' : 'text-gray-900'}>
                            <br/>{exDividendDaysFromToday} days
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 max-w-xs truncate`}>
                        {entry.notes}
                        {!entry.lots && "Not planned"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className={`${baseRowStyles} font-semibold text-gray-900`} colSpan={8}>
                    Total
                  </td>
                  <td className={`${baseRowStyles} font-semibold text-gray-900 text-right`}>
                    {(() => {
                      const totalCashNeeded = sortedEntries
                        .filter(entry => entry.lots && entry.lots > 0)
                        .reduce((sum, entry) => {
                          const cashNeeded = calculateCashNeeded(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null);
                          return sum + (cashNeeded || 0);
                        }, 0);
                      return totalCashNeeded > 0 ? `$${formatNumber(totalCashNeeded)}` : '-';
                    })()}
                  </td>
                  <td className={`${baseRowStyles}`} colSpan={6}>
                    {/* Empty cells for Net on Strike, % Gain on Strike, Company Name, Next Earnings, Ex-Dividend, and Notes columns */}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No manual options analysis entries found.</p>
        )}
      </div>
    </div>
  );
}
