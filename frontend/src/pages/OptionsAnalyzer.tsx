import { DeleteIcon, EditIcon, RefreshCw, Wand2, MessageSquare, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FinancialLinks } from '../components/FinancialLinks';
import { ChatInterface } from '../components/ChatInterface';
import { etradeAPI } from '@/lib/etradeAPI';

interface ManualOptionsAnalysis {
  id?: number;
  security: string;
  market_price?: number | null;
  lots?: number | null;
  option_date?: string | null;
  strike_price?: number | null;
  premium_per_contract?: number | null;
  implied_volatility?: number | null;
  delta?: number | null;
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
  implied_volatility: string;
  delta: string;
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
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [fetchingPrice, setFetchingPrice] = useState<boolean>(false);
  const [updatingStrategy, setUpdatingStrategy] = useState<boolean>(false);
  const [updatingStrategyFor, setUpdatingStrategyFor] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatSymbol, setChatSymbol] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<FormData>({
    security: '',
    market_price: '',
    lots: '',
    option_date: '',
    strike_price: '',
    premium_per_contract: '',
    implied_volatility: '',
    delta: '',
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

  // Calculate days since last update
  const calculateDaysSinceUpdate = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const updateDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    updateDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - updateDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format last updated display
  const formatLastUpdated = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const updateDate = new Date(dateStr);
    const daysSince = calculateDaysSinceUpdate(dateStr);
    const formattedDate = updateDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    return `Last updated ${formattedDate} (${daysSince} days ago)`;
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

  // Calculate strike price delta percent
  const calculateStrikePriceDeltaPercent = (marketPrice: number | null, strikePrice: number | null): number | null => {
    if (!marketPrice || !strikePrice || marketPrice <= 0) return null;
    return ((strikePrice - marketPrice) / marketPrice) * 100;
  };

  // Standard normal cumulative distribution function
  const normalCDF = (x: number): number => {
    // Approximation using error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  };

  // Calculate probability that stock will finish above strike price (Black-Scholes)
  const calculateStrikeProbability = (
    currentPrice: number | null,
    strikePrice: number | null,
    impliedVolatility: number | null,
    timeToExpiration: number | null, // in days
    delta?: number | null,
    nextEarningsDate?: string | null
  ): number | null => {
    // Method 1: Use Delta if available (preferred method)
    if (delta && delta !== 0) {
      let deltaProb = Math.abs(delta) * 100;
      
      // Adjust for earnings proximity if available
      if (nextEarningsDate) {
        const earningsDays = Math.floor(
          (new Date(nextEarningsDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (earningsDays > 0 && earningsDays < 7) {
          // Reduce confidence near earnings - cap between 30-70%
          deltaProb = Math.max(30, Math.min(70, deltaProb * 0.8));
        }
      }
      
      return Math.round(deltaProb);
    }

    // Method 2: Fallback to Black-Scholes if no Delta but have IV
    if (!currentPrice || !strikePrice || !impliedVolatility || !timeToExpiration || currentPrice <= 0 || timeToExpiration <= 0) {
      return null;
    }

    const riskFreeRate = 0.05; // 5% risk-free rate (approximate)
    const T = timeToExpiration / 365; // Convert days to years
    const volatility = impliedVolatility / 100; // Convert percentage to decimal

    // Black-Scholes d2 calculation
    const d2 = (Math.log(currentPrice / strikePrice) + (riskFreeRate - 0.5 * volatility * volatility) * T) 
               / (volatility * Math.sqrt(T));

    // Probability of finishing above strike (for covered calls)
    return normalCDF(d2) * 100; // Return as percentage
  };

  // Margin analysis calculations (assuming 13.20% margin rate)
  const MARGIN_RATE = 0.132; // 13.20%

  // Calculate margin interest by expiration date
  const calculateMarginInterestToExpiration = (lots: number | null, marketPrice: number | null, premium: number | null, optionDate: string | null): number | null => {
    if (!lots || !marketPrice || !premium || !optionDate) return null;
    const cashNeeded = calculateCashNeeded(lots, marketPrice, premium);
    if (!cashNeeded || cashNeeded <= 0) return null;
    
    const daysToExpiration = calculateDaysFromToday(optionDate);
    if (!daysToExpiration || daysToExpiration <= 0) return null;
    
    // Assume entire cash needed is from margin
    const marginAmount = cashNeeded;
    const dailyRate = MARGIN_RATE / 365;
    return marginAmount * dailyRate * daysToExpiration;
  };

  // Calculate margin interest per day
  const calculateMarginInterestPerDay = (lots: number | null, marketPrice: number | null, premium: number | null): number | null => {
    if (!lots || !marketPrice || !premium) return null;
    const cashNeeded = calculateCashNeeded(lots, marketPrice, premium);
    if (!cashNeeded || cashNeeded <= 0) return null;
    
    const marginAmount = cashNeeded;
    const dailyRate = MARGIN_RATE / 365;
    return marginAmount * dailyRate;
  };

  // Calculate margin interest per week
  const calculateMarginInterestPerWeek = (lots: number | null, marketPrice: number | null, premium: number | null): number | null => {
    const dailyInterest = calculateMarginInterestPerDay(lots, marketPrice, premium);
    return dailyInterest ? dailyInterest * 7 : null;
  };

  // Calculate margin interest per month (30 days)
  const calculateMarginInterestPerMonth = (lots: number | null, marketPrice: number | null, premium: number | null): number | null => {
    const dailyInterest = calculateMarginInterestPerDay(lots, marketPrice, premium);
    return dailyInterest ? dailyInterest * 30 : null;
  };

  // Calculate net percent gain when accounting for margin interest costs
  const calculateNetGainWhenMargined = (lots: number | null, marketPrice: number | null, strikePrice: number | null, premium: number | null, optionDate: string | null): number | null => {
    if (!lots || !marketPrice || !strikePrice || !premium || !optionDate) return null;
    
    const cashNeeded = calculateCashNeeded(lots, marketPrice, premium);
    const netOnStrike = calculateNetOnStrike(lots, marketPrice, strikePrice, premium);
    const marginInterest = calculateMarginInterestToExpiration(lots, marketPrice, premium, optionDate);
    
    if (!cashNeeded || cashNeeded <= 0 || !netOnStrike || !marginInterest) return null;
    
    // Net gain after subtracting margin interest costs
    const netGainAfterMargin = netOnStrike - marginInterest;
    
    // Return as percentage of cash needed
    return (netGainAfterMargin / cashNeeded) * 100;
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
      // Filter by hideZeroLots
      if (hideZeroLots && (!entry.lots || entry.lots === 0)) {
        return false;
      }
      // Filter by symbol
      if (symbolFilter.trim() && !entry.security.toLowerCase().includes(symbolFilter.toLowerCase().trim())) {
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
        case 'strike_price_delta':
          // Sort by strike price delta percent
          aValue = calculateStrikePriceDeltaPercent(a.market_price || null, a.strike_price || null) || -999999;
          bValue = calculateStrikePriceDeltaPercent(b.market_price || null, b.strike_price || null) || -999999;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'cash_needed':
          // Sort by cash needed
          aValue = calculateCashNeeded(a.lots || null, a.market_price || null, a.premium_per_contract || null) || 0;
          bValue = calculateCashNeeded(b.lots || null, b.market_price || null, b.premium_per_contract || null) || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'net_on_strike':
          // Sort by net gain on strike
          aValue = calculateNetOnStrike(a.lots || null, a.market_price || null, a.strike_price || null, a.premium_per_contract || null) || 0;
          bValue = calculateNetOnStrike(b.lots || null, b.market_price || null, b.strike_price || null, b.premium_per_contract || null) || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'percent_gain_on_strike':
          // Sort by percent gain on strike
          aValue = calculatePercentGainOnStrike(a.lots || null, a.market_price || null, a.strike_price || null, a.premium_per_contract || null) || -999999;
          bValue = calculatePercentGainOnStrike(b.lots || null, b.market_price || null, b.strike_price || null, b.premium_per_contract || null) || -999999;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'net_when_margined':
          // Sort by net gain when margined percent
          aValue = calculateNetGainWhenMargined(a.lots || null, a.market_price || null, a.strike_price || null, a.premium_per_contract || null, a.option_date || null) || -999999;
          bValue = calculateNetGainWhenMargined(b.lots || null, b.market_price || null, b.strike_price || null, b.premium_per_contract || null, b.option_date || null) || -999999;
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
      implied_volatility: '',
      delta: '',
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
        implied_volatility: formData.implied_volatility ? parseFloat(formData.implied_volatility) : null,
        delta: formData.delta ? parseFloat(formData.delta) : null,
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
      implied_volatility: entry.implied_volatility?.toString() || '',
      delta: entry.delta?.toString() || '',
      notes: entry.notes || '',
      next_earnings_date: normalizeDateInput(entry.next_earnings_date),
      company_name: entry.company_name || '',
      ex_dividend_date: normalizeDateInput(entry.ex_dividend_date)
    });
    setShowForm(true);
  };

  // Update strategy for existing entry (toggles lots: 0 → 1, >0 → 0)
  const updateStrategyForEntry = async (entry: ManualOptionsAnalysis) => {
    const symbol = entry.security.trim().toUpperCase();
    if (!symbol) {
      setError('Invalid security symbol');
      return;
    }
    
    try {
      setUpdatingStrategyFor(symbol);
      setError(null);
      const sessionId = etradeAPI.getSessionId();
      if (!sessionId) {
        alert('Please connect to E*TRADE on the E*TRADE page first, then try again.');
        return;
      }

      // 1) Update market price from E*TRADE quote
      const quote = await etradeAPI.getStockQuote(symbol);
      const q = quote?.QuoteResponse?.QuoteData?.[0];
      
      console.log(`OptionsAnalyzer.tsx: updateStrategyForEntry: quote:`, quote);

      const currentPrice: number | null = q?.All?.lastTrade ?? null;
      if (!currentPrice || currentPrice <= 0) {
        throw new Error('Could not determine current market price from E*TRADE.');
      }

      // Update earnings date if available
      let nextEarningsDate = entry.next_earnings_date;
      const nextEarningDateAsStringInMMDDYYFormat = q?.All?.nextEarningDate;
      if (nextEarningDateAsStringInMMDDYYFormat && nextEarningDateAsStringInMMDDYYFormat.trim().length > 0) {
        const nextEarningDateAsDate = new Date(nextEarningDateAsStringInMMDDYYFormat);
        nextEarningsDate = nextEarningDateAsDate.getFullYear() + "-" + 
          String(nextEarningDateAsDate.getMonth() + 1).padStart(2, '0') + "-" + 
          String(nextEarningDateAsDate.getDate()).padStart(2, '0');
      }

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
        const impliedVolatility = c.impliedVolatility || c.iv || null; // Get IV from E*TRADE
        const delta = c.delta || null; // Get Delta from E*TRADE
        const totalRevenue = strikePrice + premium;
        const gainPercent = ((totalRevenue - currentPrice) / currentPrice) * 100;
        if (gainPercent >= 1) {
          return {
            strikePrice,
            premium,
            totalRevenue,
            gainPercent,
            impliedVolatility,
            delta,
          };
        }
        return null;
      }).filter(Boolean) as Array<{ strikePrice: number; premium: number; totalRevenue: number; gainPercent: number; impliedVolatility: number | null; delta: number | null }>;

      if (opportunities.length === 0) {
        const expDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
        alert(`No 1%+ gain ITM call opportunities found for ${symbol} (exp: ${expDate}).`);
        return;
      }

      // Choose the smallest priced opportunity: minimal total revenue (strike + premium)
      opportunities.sort((a, b) => a.totalRevenue - b.totalRevenue);
      const chosen = opportunities[0];

      // Update the entry directly
      const optionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const updatedEntry = {
        ...entry,
        market_price: currentPrice,
        option_date: optionDate,
        strike_price: chosen.strikePrice,
        premium_per_contract: chosen.premium,
        next_earnings_date: nextEarningsDate,
        implied_volatility: chosen.impliedVolatility ? Number((chosen.impliedVolatility * 100).toFixed(2)) : null, // Convert to percentage
        delta: chosen.delta ? Number(chosen.delta.toFixed(4)) : null, // Store Delta from E*TRADE
        lots: (entry.lots && entry.lots > 0) ? 0 : 1 // Toggle: set to 1 if zero, set to 0 if > 0
      };

      // Save the updated entry
      const response = await fetch(`/api/manual-options-analysis/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEntry)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchEntries();
      setError(null);
    } catch (err) {
      console.error('Error updating strategy for entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    } finally {
      setUpdatingStrategyFor(null);
    }
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
      
      console.log(`OptionsAnalyzer.tsx: updateStrategy: quote:`, quote);

      const currentPrice: number | null = q?.All?.lastTrade ?? null;
      if (!currentPrice || currentPrice <= 0) {
        throw new Error('Could not determine current market price from E*TRADE.');
      }
      setFormData(prev => ({ ...prev, market_price: currentPrice.toFixed(2) }));

      console.log(`OptionsAnalyzer.tsx: updateStrategy: next earnings date and q.all:`,{earningDate:  q?.All?.nextEarningDate, q_all: q?.All });
      const nextEarningDateAsStringInMMDDYYFormat = q?.All?.nextEarningDate;
      if (nextEarningDateAsStringInMMDDYYFormat.trim().length < 1) {
        console.warn(`OptionsAnalyzer.tsx: updateStrategy: next earnings date is empty`);
      }
      else {
        const nextEarningDateAsDate = new Date(nextEarningDateAsStringInMMDDYYFormat);
        const nextEarningDateAsFormattedString = nextEarningDateAsDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
      });

      console.log(`OptionsAnalyzer.tsx: updateStrategy: parsed next earnings date:`, {neAsDate: nextEarningDateAsDate, neAsString: nextEarningDateAsFormattedString});

      setFormData(prev => ({ ...prev, next_earnings_date:  /* formatted as  "2025-08-13" */ nextEarningDateAsDate.getFullYear() + "-" + String(nextEarningDateAsDate.getMonth() + 1).padStart(2, '0') + "-" + String(nextEarningDateAsDate.getDate()).padStart(2, '0') }));
    }
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
        const impliedVolatility = c.impliedVolatility || c.iv || null; // Get IV from E*TRADE
        const delta = c.delta || null; // Get Delta from E*TRADE
        const totalRevenue = strikePrice + premium;
        const gainPercent = ((totalRevenue - currentPrice) / currentPrice) * 100;
        if (gainPercent >= 1) {
          return {
            strikePrice,
            premium,
            totalRevenue,
            gainPercent,
            impliedVolatility,
            delta,
          };
        }
        return null;
      }).filter(Boolean) as Array<{ strikePrice: number; premium: number; totalRevenue: number; gainPercent: number; impliedVolatility: number | null; delta: number | null }>;

      if (opportunities.length === 0) {
        const expDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
        alert(`No 1%+ gain ITM call opportunities found for ${symbol} (exp: ${expDate}).`);
        return;
      }

      // Choose the smallest priced opportunity: minimal total revenue (strike + premium)
      opportunities.sort((a, b) => a.totalRevenue - b.totalRevenue);
      const chosen = opportunities[0];

      // Update form fields: option_date (YYYY-MM-DD), strike, premium, IV, delta
      const optionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        option_date: optionDate,
        strike_price: chosen.strikePrice.toFixed(2),
        premium_per_contract: chosen.premium.toFixed(2),
        implied_volatility: chosen.impliedVolatility ? (chosen.impliedVolatility * 100).toFixed(2) : '', // Convert to percentage
        delta: chosen.delta ? chosen.delta.toFixed(4) : '', // Store Delta from E*TRADE
      }));
    } catch (err) {
      console.error('Error updating strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    } finally {
      setUpdatingStrategy(false);
    }
  };

  // Open chat for general discussion
  const openGeneralChat = () => {
    setChatSymbol(undefined);
    setIsChatOpen(true);
  };

  // Open chat for specific symbol analysis
  const openSymbolChat = (symbol: string) => {
    setChatSymbol(symbol);
    setIsChatOpen(true);
  };

  // Close chat
  const closeChat = () => {
    setIsChatOpen(false);
    setChatSymbol(undefined);
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
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Filter by Symbol:</label>
            <input
              type="text"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSymbolFilter('')}
              placeholder="e.g., AAPL, MSFT..."
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            {symbolFilter && (
              <button
                onClick={() => setSymbolFilter('')}
                className="px-2 py-1 text-gray-500 hover:text-gray-700"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
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
            onClick={openGeneralChat}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center space-x-2"
            title="Open Options Trading Chat"
          >
            <MessageSquare size={16} />
            <span>AI Chat</span>
          </button>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Implied Volatility (%)
              </label>
              <input
                type="number"
                step="0.01"
                name="implied_volatility"
                value={formData.implied_volatility}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25.00"
                title="Enter as percentage (e.g., 25.00 for 25%)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delta
              </label>
              <input
                type="number"
                step="0.0001"
                name="delta"
                value={formData.delta}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.6500"
                title="Option Delta (e.g., 0.6500 for 65% price sensitivity)"
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
        <h2 className="text-xl font-semibold mb-2">
          Manual Options Analysis ({sortedEntries.length} entries
          {hideZeroLots || symbolFilter ? ` of ${entries.length} total` : ''}
          {symbolFilter ? ` - filtered by "${symbolFilter}"` : ''}
          )
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Margin Analysis:</strong> Assumes entire cash needed is from margin at 13.20% annual rate. 
          Margin interest is shown in red as it represents a cost.
        </p>
        
        {entries.length > 0 ? (
          sortedEntries.length > 0 ? (
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
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('strike_price_delta')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Strike Price Delta %</span>
                      {sortColumn === 'strike_price_delta' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Premium / Contract
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('cash_needed')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Cash Needed</span>
                      {sortColumn === 'cash_needed' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('net_on_strike')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Net on Strike</span>
                      {sortColumn === 'net_on_strike' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('percent_gain_on_strike')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>% Gain on Strike</span>
                      {sortColumn === 'percent_gain_on_strike' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Margin Interest to Exp
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Margin / Day
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Margin / Week
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Margin / Month
                  </th>
                  <th 
                    className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort('net_when_margined')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Net When Margined %</span>
                      {sortColumn === 'net_when_margined' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className={`${baseHeaderRowStyles} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    Strike Hit Probability
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
                  
                  // Margin analysis calculations
                  const marginInterestToExp = calculateMarginInterestToExpiration(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null, entry.option_date || null);
                  const marginInterestPerDay = calculateMarginInterestPerDay(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null);
                  const marginInterestPerWeek = calculateMarginInterestPerWeek(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null);
                  const marginInterestPerMonth = calculateMarginInterestPerMonth(entry.lots || null, entry.market_price || null, entry.premium_per_contract || null);
                  const netGainWhenMargined = calculateNetGainWhenMargined(entry.lots || null, entry.market_price || null, entry.strike_price || null, entry.premium_per_contract || null, entry.option_date || null);

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">

                      <td className={`${baseRowStyles} text-sm text-gray-500`}>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit entry"
                          >
                            <EditIcon size={16}/>
                          </button>
                          <button
                            onClick={() => updateStrategyForEntry(entry)}
                            disabled={updatingStrategyFor === entry.security}
                            className="text-purple-600 hover:text-purple-900 disabled:text-gray-400"
                            title={
                              updatingStrategyFor === entry.security 
                                ? "Updating strategy..." 
                                : (entry.lots && entry.lots > 0)
                                  ? "Clear strategy (set lots to 0)"
                                  : "Set strategy (set lots to 1)"
                            }
                          >
                            {updatingStrategyFor === entry.security ? 
                              <RefreshCw className="animate-spin" size={16} /> : 
                              (entry.lots && entry.lots > 0) 
                                ? <RotateCcw size={16} />
                                : <Wand2 size={16} />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete entry"
                          >
                            <DeleteIcon size={16}/>
                          </button>
                          <button
                            onClick={() => openSymbolChat(entry.security)}
                            className="text-green-600 hover:text-green-900"
                            title="Open AI chat for this symbol"
                          >
                            <MessageSquare size={16}/>
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
                        {(() => {
                          const deltaPercent = calculateStrikePriceDeltaPercent(entry.market_price || null, entry.strike_price || null);
                          if (deltaPercent !== null) {
                            return (
                              <span className={deltaPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {deltaPercent >= 0 ? '+' : ''}{formatNumber(deltaPercent)}%
                              </span>
                            );
                          }
                          return '-';
                        })()}
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
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {marginInterestToExp !== null ? (
                          <span className="text-red-600">
                            ${formatNumber(marginInterestToExp)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {marginInterestPerDay !== null ? (
                          <span className="text-red-600">
                            ${formatNumber(marginInterestPerDay)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {marginInterestPerWeek !== null ? (
                          <span className="text-red-600">
                            ${formatNumber(marginInterestPerWeek)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {marginInterestPerMonth !== null ? (
                          <span className="text-red-600">
                            ${formatNumber(marginInterestPerMonth)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {netGainWhenMargined !== null ? (
                          <span className={netGainWhenMargined >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatNumber(netGainWhenMargined)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`${baseRowStyles} text-sm text-gray-900 text-right`}>
                        {(() => {
                          const daysToExpiration = calculateDaysFromToday(entry.option_date || null);
                          const probability = calculateStrikeProbability(
                            entry.market_price || null,
                            entry.strike_price || null,
                            entry.implied_volatility || null,
                            daysToExpiration,
                            entry.delta || null,
                            entry.next_earnings_date || null
                          );
                          if (probability !== null) {
                            return (
                              <span className={probability >= 50 ? 'text-red-600' : 'text-green-600'}>
                                {formatNumber(probability)}%
                              </span>
                            );
                          }
                          return entry.implied_volatility ? (
                            <span className="text-gray-400 text-xs">
                              Missing data
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              No IV
                            </span>
                          );
                        })()}
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
                      <td className={`${baseRowStyles} text-sm text-gray-900 max-w-xs`}>
                        <div className="flex flex-col">
                          <div 
                            className="truncate cursor-help"
                            title={entry.notes ? entry.notes.replace(/\n/g, '\n') : ''}
                          >
                            {entry.notes || (!entry.lots ? "Not planned" : "-")}
                          </div>
                          {entry.updated_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatLastUpdated(entry.updated_at)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className={`${baseRowStyles} font-semibold text-gray-900`} colSpan={9}>
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
                  <td className={`${baseRowStyles}`} colSpan={9}>
                    {/* Empty cells for % Gain on Strike, Margin columns, Net When Margined, Strike Probability, Next Earnings, Ex-Dividend, and Notes columns */}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No entries match your current filters.
                {symbolFilter && (
                  <>
                    <br />
                    <span className="text-sm">
                      Try adjusting the symbol filter "{symbolFilter}" or{' '}
                      <button
                        onClick={() => setSymbolFilter('')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        clear all filters
                      </button>
                    </span>
                  </>
                )}
              </p>
            </div>
          )
        ) : (
          <p className="text-gray-500">No manual options analysis entries found.</p>
        )}
      </div>

      {/* Chat Interface */}
      <ChatInterface
        symbol={chatSymbol}
        isOpen={isChatOpen}
        onClose={closeChat}
      />
    </div>
  );
}
