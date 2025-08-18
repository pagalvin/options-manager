import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  security_type: string;
  calculated_symbol: string;
  symbol: string;
  quantity: number;
  amount: number;
  price: number;
  commission: number;
  description: string;
}

interface MonthlyData {
  month: string;
  premiumCollected: number;
  realizedGain: number;
  totalGain: number;
  cumulativeGain: number;
  optionCount: number;
  stockTradeCount: number;
}

interface SymbolPerformance {
  symbol: string;
  totalGain: number;
  premiumCollected: number;
  optionContracts: number;
  shares: number;
}

interface TransactionTypeData {
  type: string;
  count: number;
  value: number;
  color: string;
}

export function Performance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transactions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly performance data
  const calculateMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, MonthlyData>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          premiumCollected: 0,
          realizedGain: 0,
          totalGain: 0,
          cumulativeGain: 0,
          optionCount: 0,
          stockTradeCount: 0
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      const amount = parseFloat(String(transaction.amount));

      if (transaction.security_type === 'OPTN') {
        monthData.premiumCollected += amount;
        monthData.optionCount += 1;
      } else if (transaction.security_type === 'EQ') {
        monthData.stockTradeCount += 1;
      }

      monthData.realizedGain += amount;
      monthData.totalGain += amount;
    });

    // Convert to array and sort chronologically by monthKey (YYYY-MM format)
    const sortedData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by monthKey (YYYY-MM)
      .map(([_, value]) => value); // Extract just the values
    
    let cumulativeSum = 0;
    
    sortedData.forEach(data => {
      cumulativeSum += data.totalGain;
      data.cumulativeGain = cumulativeSum;
    });

    return sortedData;
  };

  // Calculate symbol performance
  const calculateSymbolPerformance = (): SymbolPerformance[] => {
    const symbolMap = new Map<string, SymbolPerformance>();

    transactions.forEach(transaction => {
      const symbol = transaction.calculated_symbol;
      
      // Skip transactions without a valid symbol (like transfers, deposits, etc.)
      if (!symbol || symbol.trim() === '' || 
          transaction.transaction_type === 'Online Transfer' || 
          transaction.transaction_type === 'Transfer') {
        return;
      }
      
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, {
          symbol,
          totalGain: 0,
          premiumCollected: 0,
          optionContracts: 0,
          shares: 0
        });
      }

      const symbolData = symbolMap.get(symbol)!;
      const amount = parseFloat(String(transaction.amount));
      const quantity = parseFloat(String(transaction.quantity));

      symbolData.totalGain += amount;

      if (transaction.security_type === 'OPTN') {
        symbolData.premiumCollected += amount;
        if (transaction.transaction_type === 'Sold Short') {
          symbolData.optionContracts += Math.abs(quantity);
        } else if (['Bought To Cover', 'Option Assigned', 'Option Expired'].includes(transaction.transaction_type)) {
          symbolData.optionContracts -= Math.abs(quantity);
        }
      } else if (transaction.security_type === 'EQ') {
        symbolData.shares += quantity;
      }
    });

    return Array.from(symbolMap.values())
      .filter(data => Math.abs(data.totalGain) > 0.01 || data.optionContracts > 0 || Math.abs(data.shares) > 0)
      .sort((a, b) => b.totalGain - a.totalGain)
      .slice(0, 10); // Top 10 symbols
  };

  // Calculate transaction type distribution
  const calculateTransactionTypes = (): TransactionTypeData[] => {
    const typeMap = new Map<string, { count: number; value: number }>();

    transactions.forEach(transaction => {
      const type = transaction.transaction_type;
      const amount = Math.abs(parseFloat(String(transaction.amount)));

      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, value: 0 });
      }

      const typeData = typeMap.get(type)!;
      typeData.count += 1;
      typeData.value += amount;
    });

    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
      '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#0000ff'
    ];

    return Array.from(typeMap.entries())
      .map(([type, data], index) => ({
        type,
        count: data.count,
        value: data.value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Performance Analysis</h1>
        <div className="text-center py-8">Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Performance Analysis</h1>
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      </div>
    );
  }

  const monthlyData = calculateMonthlyData();
  const symbolPerformance = calculateSymbolPerformance();
  const transactionTypes = calculateTransactionTypes();

  // Helpers for weekly net premium chart
  const formatYyyyMmDd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const startOfWeekSunday = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0 = Sunday
    const diff = day; // days since Sunday
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // compute threshold week start (Sunday of week containing 2025-02-20)
  const thresholdWeekStart = (() => {
    const ref = new Date('2025-02-20T00:00:00');
    return startOfWeekSunday(ref);
  })();

  // Unique option symbols for filter
  const optionSymbols = Array.from(
    new Set(
      transactions
        .filter(t => t.security_type === 'OPTN' && t.calculated_symbol && t.calculated_symbol.trim() !== '')
        .map(t => t.calculated_symbol)
    )
  ).sort();

  // Weekly net premium data starting from threshold week
  const weeklyNetPremiumData = (() => {
    const weeklyMap = new Map<string, { week: string; netPremium: number }>();
    transactions
      .filter(t => t.security_type === 'OPTN')
      .filter(t => selectedSymbol === 'ALL' || t.calculated_symbol === selectedSymbol)
      .forEach(t => {
        const d = new Date(t.transaction_date);
        const weekStart = startOfWeekSunday(d);
        if (weekStart < thresholdWeekStart) return;
        const key = formatYyyyMmDd(weekStart);
        if (!weeklyMap.has(key)) weeklyMap.set(key, { week: key, netPremium: 0 });
        const val = weeklyMap.get(key)!;
        const amt = Number(t.amount) || 0;
        val.netPremium += amt;
      });

    // sort by week ascending and return as array
    return Array.from(weeklyMap.values()).sort((a, b) => a.week.localeCompare(b.week));
  })();

  // Monthly net premium data (similar to weekly but aggregated by month)
  const monthlyNetPremiumData = (() => {
    const monthlyMap = new Map<string, { month: string; monthName: string; netPremium: number }>();
    transactions
      .filter(t => t.security_type === 'OPTN')
      .filter(t => selectedSymbol === 'ALL' || t.calculated_symbol === selectedSymbol)
      .forEach(t => {
        const d = new Date(t.transaction_date);
        if (d < thresholdWeekStart) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyMap.has(key)) monthlyMap.set(key, { month: key, monthName, netPremium: 0 });
        const val = monthlyMap.get(key)!;
        const amt = Number(t.amount) || 0;
        val.netPremium += amt;
      });

    // sort by month ascending and return as array
    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  })();
  const tablesStartDate = new Date('2025-02-01T00:00:00');
  const filteredOptionTxSinceStart = transactions.filter(t => {
    if (t.security_type !== 'OPTN') return false;
    if (selectedSymbol !== 'ALL' && t.calculated_symbol !== selectedSymbol) return false;
    const d = new Date(t.transaction_date);
    return d >= tablesStartDate;
  });

  // Total net premium by month since 2025-02-01
  const totalByMonthData = (() => {
    const map = new Map<string, { key: string; label: string; sum: number }>();
    filteredOptionTxSinceStart.forEach(t => {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map.has(key)) map.set(key, { key, label, sum: 0 });
      const rec = map.get(key)!;
      rec.sum += Number(t.amount) || 0;
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(r => ({ period: r.label, total: r.sum }));
  })();

  // Total net premium by week (weeks start Sunday) since 2025-02-01
  const totalByWeekData = (() => {
    const map = new Map<string, { key: string; start: Date; sum: number }>();
    filteredOptionTxSinceStart.forEach(t => {
      const d = new Date(t.transaction_date);
      const ws = startOfWeekSunday(d);
      const key = formatYyyyMmDd(ws);
      if (!map.has(key)) map.set(key, { key, start: ws, sum: 0 });
      const rec = map.get(key)!;
      rec.sum += Number(t.amount) || 0;
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(r => ({
        period: `Week of ${r.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        total: r.sum
      }));
  })();

  // Summary averages derived from totals
  const avgNetMonthlyPremium = totalByMonthData.length
    ? totalByMonthData.reduce((s, r) => s + r.total, 0) / totalByMonthData.length
    : 0;
  const avgNetWeeklyPremium = totalByWeekData.length
    ? totalByWeekData.reduce((s, r) => s + r.total, 0) / totalByWeekData.length
    : 0;

  // --- Net ROI (all transactions) ---
  const excludedTypes = new Set<string>(['Online Transfer', 'Transfer']);

  const filteredAllSinceStartForROI = transactions.filter(t => {
    if (excludedTypes.has(t.transaction_type)) return false;
    if (selectedSymbol !== 'ALL') {
      if (!t.calculated_symbol || t.calculated_symbol !== selectedSymbol) return false;
    }
    return true;
  });

  // Weekly Net ROI chart (same threshold and Sunday weeks)
  const weeklyRoiData = (() => {
    const map = new Map<string, { week: string; net: number; absSum: number }>();
    filteredAllSinceStartForROI.forEach(t => {
      const d = new Date(t.transaction_date);
      const ws = startOfWeekSunday(d);
      if (ws < thresholdWeekStart) return;
      const key = formatYyyyMmDd(ws);
      if (!map.has(key)) map.set(key, { week: key, net: 0, absSum: 0 });
      const rec = map.get(key)!;
      const amt = Number(t.amount) || 0;
      rec.net += amt;
      rec.absSum += Math.abs(amt);
    });
    return Array.from(map.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .map(r => ({ week: r.week, roiPct: r.absSum > 0 ? (r.net / r.absSum) * 100 : 0 }));
  })();

  // Monthly ROI table since 2025-02-01
  const roiByMonthData = (() => {
    const map = new Map<string, { key: string; label: string; net: number; absSum: number }>();
    filteredAllSinceStartForROI.forEach(t => {
      const d = new Date(t.transaction_date);
      if (d < tablesStartDate) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map.has(key)) map.set(key, { key, label, net: 0, absSum: 0 });
      const rec = map.get(key)!;
      const amt = Number(t.amount) || 0;
      rec.net += amt;
      rec.absSum += Math.abs(amt);
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(r => ({ period: r.label, roiPct: r.absSum > 0 ? (r.net / r.absSum) * 100 : 0 }));
  })();

  // Weekly ROI table since 2025-02-01 (weeks start Sunday)
  const roiByWeekData = (() => {
    const map = new Map<string, { key: string; start: Date; net: number; absSum: number }>();
    filteredAllSinceStartForROI.forEach(t => {
      const d = new Date(t.transaction_date);
      if (d < tablesStartDate) return;
      const ws = startOfWeekSunday(d);
      const key = formatYyyyMmDd(ws);
      if (!map.has(key)) map.set(key, { key, start: ws, net: 0, absSum: 0 });
      const rec = map.get(key)!;
      const amt = Number(t.amount) || 0;
      rec.net += amt;
      rec.absSum += Math.abs(amt);
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(r => ({
        period: `Week of ${r.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        roiPct: r.absSum > 0 ? (r.net / r.absSum) * 100 : 0
      }));
  })();

  const avgMonthlyROI = roiByMonthData.length
    ? roiByMonthData.reduce((s, r) => s + r.roiPct, 0) / roiByMonthData.length
    : 0;
  const avgWeeklyROI = roiByWeekData.length
    ? roiByWeekData.reduce((s, r) => s + r.roiPct, 0) / roiByWeekData.length
    : 0;

  // Weekly Net Premium as % of At-Risk Equity
  // At-Risk Equity definition: cumulative net value of all EQ transactions up to Saturday for symbols with option sales
  type WeekKey = string; // YYYY-MM-DD (Sunday)

  const weeklyPremiumPctData = (() => {
    // 1) Identify symbols with option sales per week (Sunday-start), regardless of coverage
    const symbolsWithSoldByWeek = new Map<WeekKey, Set<string>>();
    transactions
      .filter(t => t.security_type === 'OPTN' && t.transaction_type === 'Sold Short')
      .forEach(t => {
        const d = new Date(t.transaction_date);
        const wk = formatYyyyMmDd(startOfWeekSunday(d));
        const sym = t.calculated_symbol?.trim();
        if (!sym) return;
        if (selectedSymbol !== 'ALL' && sym !== selectedSymbol) return;
        if (!symbolsWithSoldByWeek.has(wk)) symbolsWithSoldByWeek.set(wk, new Set());
        symbolsWithSoldByWeek.get(wk)!.add(sym);
      });

    // Early exit if no option-selling weeks
    if (symbolsWithSoldByWeek.size === 0) return [] as { week: string; pct: number; premium: number; atRisk: number }[];

    // 2) Get all EQ equity transactions with multiples of 100 shares, sorted by date
    const eqTransactions = transactions
      .filter(t => t.security_type === 'EQ' && (t.transaction_type === 'Bought' || t.transaction_type === 'Sold'))
      .filter(t => {
        const qty = Math.abs(Number(t.quantity) || 0);
        return qty % 100 === 0; // only multiples of 100
      })
      .filter(t => {
        const sym = t.calculated_symbol?.trim();
        return sym && (selectedSymbol === 'ALL' || sym === selectedSymbol);
      })
      .map(t => ({
        date: new Date(t.transaction_date),
        symbol: t.calculated_symbol?.trim() || '',
        type: t.transaction_type as 'Bought' | 'Sold',
        qty: Number(t.quantity) || 0, // keep sign: positive for bought, negative for sold
        price: Number(t.price) || 0,
        amount: Number(t.amount) || 0 // transaction amount (negative for buys, positive for sales)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3) Calculate weekly at-risk for all equity positions, and premium only for symbols with option sales
    const weeklyAtRiskSnapshot = new Map<WeekKey, number>();
    const weeklyPremium = new Map<WeekKey, number>();
    
    // Get all weeks from threshold onward
    const allWeeks = new Set<WeekKey>();
    
    // Add weeks with option sales
    for (const weekKey of symbolsWithSoldByWeek.keys()) {
      allWeeks.add(weekKey);
    }
    
    // Add weeks with equity transactions after threshold
    for (const tx of eqTransactions) {
      if (tx.date >= thresholdWeekStart) {
        const weekKey = formatYyyyMmDd(startOfWeekSunday(tx.date));
        allWeeks.add(weekKey);
      }
    }
    
    for (const weekKey of allWeeks) {
      const weekStart = new Date(weekKey + 'T00:00:00');
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday
      weekEnd.setHours(23, 59, 59, 999);

      // Replay all transactions up to Saturday to get net invested amounts
      const symbolNetInvested = new Map<string, number>();
      
      for (const tx of eqTransactions) {
        if (tx.date > weekEnd) break; // transactions are sorted by date
        
        const currentNet = symbolNetInvested.get(tx.symbol) || 0;
        // For net invested calculation: subtract amount (since purchases are negative, sales positive)
        // Net invested = total purchases - total sales
        symbolNetInvested.set(tx.symbol, currentNet - tx.amount);
      }
      
      // Sum net invested for ALL symbols with positive net investment (at-risk calculation)
      let totalAtRisk = 0;
      for (const netInvested of symbolNetInvested.values()) {
        if (netInvested > 0) {
          totalAtRisk += netInvested;
        }
      }
      
      weeklyAtRiskSnapshot.set(weekKey, totalAtRisk);
      
      // Calculate premium for ALL option transactions this week (not limited by symbol)
      const weekPremium = transactions
        .filter(t => t.security_type === 'OPTN')
        .filter(t => {
          const d = new Date(t.transaction_date);
          return d >= weekStart && d <= weekEnd;
        })
        .filter(t => {
          const sym = t.calculated_symbol?.trim();
          return sym && (selectedSymbol === 'ALL' || sym === selectedSymbol);
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      weeklyPremium.set(weekKey, weekPremium);
    }

    // 5) Build chart data: pct = premium / atRisk * 100
    const weeks = Array.from(new Set<string>([
      ...Array.from(weeklyAtRiskSnapshot.keys()),
      ...Array.from(weeklyPremium.keys()),
    ])).sort((a, b) => a.localeCompare(b));

    const data = weeks.map(wk => {
      const atRisk = weeklyAtRiskSnapshot.get(wk) || 0;
      const premium = weeklyPremium.get(wk) || 0;
      const pct = atRisk > 0 ? (premium / atRisk) * 100 : 0;
      return { week: wk, pct, premium, atRisk };
    });

    return data;
  })();

  // Monthly Net Premium as % of At-Risk Equity (similar logic but aggregated by month)
  const monthlyPremiumPctData = (() => {
    // 1) Get all months from threshold onward
    const allMonths = new Set<string>(); // YYYY-MM format
    
    // Add months with equity transactions after threshold
    for (const tx of transactions.filter(t => t.security_type === 'EQ' && (t.transaction_type === 'Bought' || t.transaction_type === 'Sold'))) {
      const txDate = new Date(tx.transaction_date);
      if (txDate >= thresholdWeekStart) {
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        allMonths.add(monthKey);
      }
    }
    
    // 2) Calculate monthly data
    const monthlyAtRiskSnapshot = new Map<string, number>();
    const monthlyPremium = new Map<string, number>();
    
    for (const monthKey of allMonths) {
      const [year, month] = monthKey.split('-');
      const monthEnd = new Date(parseInt(year), parseInt(month), 0); // last day of month
      monthEnd.setHours(23, 59, 59, 999);
      
      // Calculate net invested up to end of month for ALL symbols
      const symbolNetInvested = new Map<string, number>();
      
      for (const tx of transactions.filter(t => t.security_type === 'EQ' && (t.transaction_type === 'Bought' || t.transaction_type === 'Sold'))) {
        const txDate = new Date(tx.transaction_date);
        if (txDate > monthEnd) continue;
        
        const qty = Math.abs(Number(tx.quantity) || 0);
        if (qty % 100 !== 0) continue; // only multiples of 100
        
        const sym = tx.calculated_symbol?.trim();
        if (!sym || (selectedSymbol !== 'ALL' && sym !== selectedSymbol)) continue;
        
        const currentNet = symbolNetInvested.get(sym) || 0;
        const amount = Number(tx.amount) || 0;
        symbolNetInvested.set(sym, currentNet - amount);
      }
      
      // Sum net invested for symbols with positive net investment
      let totalAtRisk = 0;
      for (const netInvested of symbolNetInvested.values()) {
        if (netInvested > 0) {
          totalAtRisk += netInvested;
        }
      }
      
      monthlyAtRiskSnapshot.set(monthKey, totalAtRisk);
      
      // Calculate premium for ALL option transactions this month
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1); // first day of month
      const monthPremium = transactions
        .filter(t => t.security_type === 'OPTN')
        .filter(t => {
          const d = new Date(t.transaction_date);
          return d >= monthStart && d <= monthEnd;
        })
        .filter(t => {
          const sym = t.calculated_symbol?.trim();
          return sym && (selectedSymbol === 'ALL' || sym === selectedSymbol);
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      monthlyPremium.set(monthKey, monthPremium);
    }
    
    // Build chart data
    const months = Array.from(allMonths).sort((a, b) => a.localeCompare(b));
    
    const data = months.map(mk => {
      const atRisk = monthlyAtRiskSnapshot.get(mk) || 0;
      const premium = monthlyPremium.get(mk) || 0;
      const pct = atRisk > 0 ? (premium / atRisk) * 100 : 0;
      const [year, month] = mk.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { month: mk, monthName, pct, premium, atRisk };
    });

    return data;
  })();

  // Calculate completed equity transactions gain/loss
  const calculateCompletedEquityData = (period: 'weekly' | 'monthly') => {
    // Group equity transactions by symbol and calculate net gain/loss for completed positions
    const equityTransactions = transactions.filter(t => 
      t.security_type === 'EQ' && 
      (t.transaction_type === 'Bought' || t.transaction_type === 'Sold') &&
      (selectedSymbol === 'ALL' || t.calculated_symbol === selectedSymbol)
    );

    // Group by symbol to track buy/sell pairs
    const symbolTransactions = new Map<string, Array<{
      date: Date;
      type: 'Bought' | 'Sold';
      quantity: number;
      amount: number;
      price: number;
    }>>();

    equityTransactions.forEach(t => {
      const symbol = t.calculated_symbol;
      if (!symbol) return;
      
      if (!symbolTransactions.has(symbol)) {
        symbolTransactions.set(symbol, []);
      }
      
      symbolTransactions.get(symbol)!.push({
        date: new Date(t.transaction_date),
        type: t.transaction_type as 'Bought' | 'Sold',
        quantity: Math.abs(Number(t.quantity)),
        amount: Number(t.amount),
        price: Number(t.price)
      });
    });

    // Calculate completed transactions (where shares were bought and then sold)
    const completedTransactions: Array<{
      symbol: string;
      sellDate: Date;
      gainLoss: number;
      quantity: number;
    }> = [];

    symbolTransactions.forEach((txs, symbol) => {
      const sortedTxs = txs.sort((a, b) => a.date.getTime() - b.date.getTime());
      let holdings = 0;
      let costBasis = 0;
      
      sortedTxs.forEach(tx => {
        if (tx.type === 'Bought') {
          holdings += tx.quantity;
          costBasis += Math.abs(tx.amount); // Amount is negative for purchases
        } else if (tx.type === 'Sold' && holdings > 0) {
          const sharesSold = Math.min(tx.quantity, holdings);
          const avgCostPerShare = costBasis / holdings;
          const costOfSoldShares = sharesSold * avgCostPerShare;
          const saleProceeds = tx.amount; // Amount is positive for sales
          const gainLoss = saleProceeds - costOfSoldShares;
          
          completedTransactions.push({
            symbol,
            sellDate: tx.date,
            gainLoss,
            quantity: sharesSold
          });
          
          holdings -= sharesSold;
          costBasis -= costOfSoldShares;
        }
      });
    });

    // Group completed transactions by time period
    const periodData = new Map<string, { period: string; netPremium: number; equityGainLoss: number; combined: number }>();

    // Add net premium data
    transactions
      .filter(t => t.security_type === 'OPTN')
      .filter(t => selectedSymbol === 'ALL' || t.calculated_symbol === selectedSymbol)
      .forEach(t => {
        const d = new Date(t.transaction_date);
        if (d < thresholdWeekStart) return;
        
        let key: string;
        if (period === 'weekly') {
          const weekStart = startOfWeekSunday(d);
          key = formatYyyyMmDd(weekStart);
        } else {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!periodData.has(key)) {
          periodData.set(key, { period: key, netPremium: 0, equityGainLoss: 0, combined: 0 });
        }
        
        const data = periodData.get(key)!;
        data.netPremium += Number(t.amount) || 0;
      });

    // Add completed equity data
    completedTransactions.forEach(ct => {
      if (ct.sellDate < thresholdWeekStart) return;
      
      let key: string;
      if (period === 'weekly') {
        const weekStart = startOfWeekSunday(ct.sellDate);
        key = formatYyyyMmDd(weekStart);
      } else {
        key = `${ct.sellDate.getFullYear()}-${String(ct.sellDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!periodData.has(key)) {
        periodData.set(key, { period: key, netPremium: 0, equityGainLoss: 0, combined: 0 });
      }
      
      const data = periodData.get(key)!;
      data.equityGainLoss += ct.gainLoss;
    });

    // Calculate combined values
    periodData.forEach(data => {
      data.combined = data.netPremium + data.equityGainLoss;
    });

    const sortedData = Array.from(periodData.values()).sort((a, b) => a.period.localeCompare(b.period));
    
    return sortedData;
  };

  const weeklyGainData = calculateCompletedEquityData('weekly');
  const monthlyGainData = calculateCompletedEquityData('monthly');

  // Calculate all-time totals for weekly combined performance
  const weeklyAllTimeTotals = {
    netPremium: weeklyGainData.reduce((sum, data) => sum + data.netPremium, 0),
    equityGainLoss: weeklyGainData.reduce((sum, data) => sum + data.equityGainLoss, 0),
    get combined() { return this.netPremium + this.equityGainLoss; }
  };

  // Calculate capital flow data
  const calculateCapitalFlowData = (period: 'weekly' | 'monthly') => {
    const flowData = new Map<string, { period: string; inflow: number; outflow: number; netFlow: number }>();

    transactions
      .filter(t => selectedSymbol === 'ALL' || t.calculated_symbol === selectedSymbol)
      .forEach(t => {
        const d = new Date(t.transaction_date);
        if (d < thresholdWeekStart) return;
        
        let key: string;
        if (period === 'weekly') {
          const weekStart = startOfWeekSunday(d);
          key = formatYyyyMmDd(weekStart);
        } else {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!flowData.has(key)) {
          flowData.set(key, { period: key, inflow: 0, outflow: 0, netFlow: 0 });
        }
        
        const data = flowData.get(key)!;
        const amount = Number(t.amount) || 0;
        
        // Inflows: Dividends (positive), Online Transfers (positive), Net gain/loss of premium
        if (t.transaction_type === 'Dividend' && amount > 0) {
          data.inflow += amount;
        } else if (t.transaction_type === 'Online Transfer' && amount > 0) {
          data.inflow += amount;
        } else if (t.security_type === 'OPTN') {
          // Net gain/loss of premium (positive adds to inflow, negative reduces inflow)
          data.inflow += amount;
        }
        
        // Outflows: Online Transfers (negative)
        if (t.transaction_type === 'Online Transfer' && amount < 0) {
          data.outflow += Math.abs(amount);
        }
      });

    // Calculate net flow and sort by period
    flowData.forEach(data => {
      data.netFlow = data.inflow - data.outflow;
    });

    const sortedData = Array.from(flowData.values()).sort((a, b) => a.period.localeCompare(b.period));
    
    // Calculate cumulative values
    let cumulativeInflow = 0;
    let cumulativeOutflow = 0;
    let cumulativeNetFlow = 0;
    
    const cumulativeData = sortedData.map(data => {
      cumulativeInflow += data.inflow;
      cumulativeOutflow += data.outflow;
      cumulativeNetFlow += data.netFlow;
      
      return {
        period: data.period,
        inflow: data.inflow,
        outflow: data.outflow,
        netFlow: data.netFlow,
        cumulativeInflow,
        cumulativeOutflow,
        cumulativeNetFlow
      };
    });

    return cumulativeData;
  };

  const weeklyCapitalFlowData = calculateCapitalFlowData('weekly');
  const monthlyCapitalFlowData = calculateCapitalFlowData('monthly');

  // Calculate summary metrics
  const totalPremiumCollected = monthlyData.reduce((sum, data) => sum + data.premiumCollected, 0);
  const totalRealizedGain = monthlyData.reduce((sum, data) => sum + data.realizedGain, 0);
  const totalOptionTrades = transactionTypes.filter(t => t.type.includes('Option') || t.type.includes('Sold Short') || t.type.includes('Bought To Cover')).reduce((sum, t) => sum + t.count, 0);
  const totalEquityTrades = transactionTypes.filter(t => t.type === 'Bought' || t.type === 'Sold').reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance Analysis</h1>

      {/* New Combined Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Combined Performance Chart - 2/3 width */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Weekly Combined Performance</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="symbolFilterCombined">Symbol:</label>
              <select
                id="symbolFilterCombined"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                <option value="ALL">All</option>
                {optionSymbols.map(sym => (
                  <option key={`combined-${sym}`} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyGainData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tickFormatter={(v) => {
                const d = new Date(v + 'T00:00:00');
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }} />
              <YAxis />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                
                const start = new Date(String(label) + 'T00:00:00');
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                const dateLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {dateLabel}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-blue-600">Net Premium:</span>
                      <span className="font-semibold">${data?.netPremium?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-green-600">Equity Gain/Loss:</span>
                      <span className="font-semibold">${data?.equityGainLoss?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-purple-600">Combined Total:</span>
                      <span className="font-semibold">${data?.combined?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="netPremium" name="Net Premium" fill="#3b82f6" />
              <Bar dataKey="equityGainLoss" name="Completed Equity Gain/Loss" fill="#10b981" />
              <Bar dataKey="combined" name="Combined Total" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Weekly combined performance showing net options premium and completed equity transactions.</p>
          
          {/* All Time Summary Statistics */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-blue-600 font-medium">All Time Net Premium</div>
              <div className={`text-lg font-bold ${weeklyAllTimeTotals.netPremium >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ${weeklyAllTimeTotals.netPremium.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs text-green-600 font-medium">All Time Equity Gain/Loss</div>
              <div className={`text-lg font-bold ${weeklyAllTimeTotals.equityGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${weeklyAllTimeTotals.equityGainLoss.toFixed(2)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-xs text-purple-600 font-medium">All Time Combined Total</div>
              <div className={`text-lg font-bold ${weeklyAllTimeTotals.combined >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                ${weeklyAllTimeTotals.combined.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Combined Performance Chart - 1/3 width */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-lg font-semibold">Monthly Combined Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyGainData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(v) => {
                  if (v === 'All Time') return 'All Time';
                  const [year, month] = v.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
                angle={-45} 
                textAnchor="end" 
                height={80} 
                fontSize={12} 
              />
              <YAxis />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                
                let monthName: string;
                if (String(label) === 'All Time') {
                  monthName = 'All Time';
                } else {
                  const [year, month] = String(label).split('-');
                  monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }
                
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {monthName}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-blue-600">Net Premium:</span>
                      <span className="font-semibold">${data?.netPremium?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-green-600">Equity Gain/Loss:</span>
                      <span className="font-semibold">${data?.equityGainLoss?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-purple-600">Combined Total:</span>
                      <span className="font-semibold">${data?.combined?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="netPremium" name="Net Premium" fill="#3b82f6" />
              <Bar dataKey="equityGainLoss" name="Completed Equity Gain/Loss" fill="#10b981" />
              <Bar dataKey="combined" name="Combined Total" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Monthly combined performance showing net options premium and completed equity transactions.</p>
        </div>
      </div>

      {/* Capital Flow Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Capital Flow Chart - 2/3 width */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Weekly Capital Flow</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="symbolFilterCapitalWeekly">Symbol:</label>
              <select
                id="symbolFilterCapitalWeekly"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                <option value="ALL">All</option>
                {optionSymbols.map(sym => (
                  <option key={`capital-weekly-${sym}`} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyCapitalFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tickFormatter={(v) => {
                const d = new Date(v + 'T00:00:00');
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }} />
              <YAxis />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                
                const start = new Date(String(label) + 'T00:00:00');
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                const dateLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {dateLabel}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-green-600">Cumulative Inflow:</span>
                      <span className="font-semibold">${data?.cumulativeInflow?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-red-600">Cumulative Outflow:</span>
                      <span className="font-semibold">${data?.cumulativeOutflow?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-blue-600">Cumulative Net Flow:</span>
                      <span className="font-semibold">${data?.cumulativeNetFlow?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="cumulativeInflow" name="Cumulative Inflow" fill="#10b981" />
              <Bar dataKey="cumulativeOutflow" name="Cumulative Outflow" fill="#ef4444" />
              <Bar dataKey="cumulativeNetFlow" name="Cumulative Net Flow" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">
            Cumulative capital flow showing running totals. Inflows: Dividends, deposits, net premium gain/loss. 
            Outflows: Withdrawals.
          </p>
        </div>

        {/* Monthly Capital Flow Chart - 1/3 width */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-lg font-semibold">Monthly Capital Flow</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyCapitalFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(v) => {
                  const [year, month] = v.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
                angle={-45} 
                textAnchor="end" 
                height={80} 
                fontSize={12} 
              />
              <YAxis />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                
                const [year, month] = String(label).split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {monthName}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-green-600">Cumulative Inflow:</span>
                      <span className="font-semibold">${data?.cumulativeInflow?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-red-600">Cumulative Outflow:</span>
                      <span className="font-semibold">${data?.cumulativeOutflow?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-blue-600">Cumulative Net Flow:</span>
                      <span className="font-semibold">${data?.cumulativeNetFlow?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="cumulativeInflow" name="Cumulative Inflow" fill="#10b981" />
              <Bar dataKey="cumulativeOutflow" name="Cumulative Outflow" fill="#ef4444" />
              <Bar dataKey="cumulativeNetFlow" name="Cumulative Net Flow" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">
            Cumulative monthly capital flow. Inflows: Dividends, deposits, net premium gain/loss. Outflows: Withdrawals.
          </p>
        </div>
      </div>

      {/* Net Premium as % of At-Risk Equity by Week and Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart - 2/3 width */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Weekly Net Premium as % of At-Risk Equity</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="symbolFilter2">Symbol:</label>
              {/* reuse same selectedSymbol state */}
              <select
                id="symbolFilter2"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                <option value="ALL">All</option>
                {optionSymbols.map(sym => (
                  <option key={`pct-${sym}`} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyPremiumPctData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tickFormatter={(v) => {
                const d = new Date(v + 'T00:00:00');
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }} />
              <YAxis tickFormatter={(v) => `${v}%`} />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const datum = (payload[0] as any)?.payload as { pct: number; premium: number; atRisk: number } | undefined;
                const start = new Date(String(label) + 'T00:00:00');
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                const pct = datum?.pct ?? 0;
                const premium = datum?.premium ?? 0;
                const atRisk = datum?.atRisk ?? 0;
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {`${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">Premium % of At-Risk</span>
                      <span className="font-semibold">{pct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">Net Premium</span>
                      <span className="font-semibold">${premium.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">At-Risk (Week End)</span>
                      <span className="font-semibold">${atRisk.toFixed(2)}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="pct" name="Premium % of At-Risk" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Weeks start on Sunday. At-Risk = net equity cost basis for all symbols.</p>
        </div>

        {/* Monthly Chart - 1/3 width */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-lg font-semibold">Monthly Net Premium as % of At-Risk Equity</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyPremiumPctData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis tickFormatter={(v) => `${v}%`} />
              <Tooltip content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const datum = (payload[0] as any)?.payload as { pct: number; premium: number; atRisk: number; monthName: string } | undefined;
                const pct = datum?.pct ?? 0;
                const premium = datum?.premium ?? 0;
                const atRisk = datum?.atRisk ?? 0;
                const monthName = datum?.monthName ?? String(label);
                return (
                  <div className="bg-white border border-gray-200 rounded p-3 shadow text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {monthName}
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">Premium % of At-Risk</span>
                      <span className="font-semibold">{pct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">Net Premium</span>
                      <span className="font-semibold">${premium.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-gray-600">At-Risk (Month End)</span>
                      <span className="font-semibold">${atRisk.toFixed(2)}</span>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              <Bar dataKey="pct" name="Premium % of At-Risk" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">At-Risk = net equity cost basis for all symbols.</p>
        </div>
      </div>

      {/* Net Premium Flow by Week and Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Net Premium Chart - 2/3 width */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Net Premium Flow by Week</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="symbolFilter">Symbol:</label>
              <select
                id="symbolFilter"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                <option value="ALL">All</option>
                {optionSymbols.map(sym => (
                  <option key={sym} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyNetPremiumData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tickFormatter={(v) => {
                const d = new Date(v + 'T00:00:00');
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }} />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Net Premium']} labelFormatter={(label: string) => {
                const d = new Date(label + 'T00:00:00');
                const end = new Date(d);
                end.setDate(d.getDate() + 6);
                return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              }} />
              <Legend />
              <Bar dataKey="netPremium" name="Net Premium">
                {weeklyNetPremiumData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.netPremium >= 0 ? '#82ca9d' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Weeks start on Sunday. Showing data from week of Feb 20, 2025 onward.</p>
        </div>

        {/* Monthly Net Premium Chart - 1/3 width */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-lg font-semibold">Net Premium Flow by Month</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyNetPremiumData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${(value as number).toFixed(2)}`, 'Net Premium']} labelFormatter={(label: string) => label} />
              <Legend />
              <Bar dataKey="netPremium" name="Net Premium">
                {monthlyNetPremiumData.map((entry, idx) => (
                  <Cell key={`cell-monthly-${idx}`} fill={entry.netPremium >= 0 ? '#60a5fa' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">Monthly option premium flow since Feb 2025.</p>
        </div>
      </div>
      
      {/* Totals tables (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Total Net Premium by Month (since Feb 1, 2025)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net Premium</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {totalByMonthData.map(row => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{row.period}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${row.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${row.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {totalByMonthData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-500 text-center">No data</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700">Average Net Monthly Premium</td>
                  <td className={`px-4 py-2 text-sm font-semibold ${avgNetMonthlyPremium >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${avgNetMonthlyPremium.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Total Net Premium by Week (since Feb 1, 2025)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net Premium</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {totalByWeekData.map(row => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{row.period}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${row.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${row.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {totalByWeekData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-500 text-center">No data</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700">Average Net Weekly Premium</td>
                  <td className={`px-4 py-2 text-sm font-semibold ${avgNetWeeklyPremium >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${avgNetWeeklyPremium.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Net ROI by Week (all transactions) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Net ROI by Week</h3>
          {/* Uses the same symbol filter select above */}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={weeklyRoiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tickFormatter={(v) => {
              const d = new Date(v + 'T00:00:00');
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }} />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: number) => [`${(value as number).toFixed(2)}%`, 'Net ROI']} labelFormatter={(label: string) => {
              const d = new Date(label + 'T00:00:00');
              const end = new Date(d);
              end.setDate(d.getDate() + 6);
              return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }} />
            <Legend />
            <Bar dataKey="roiPct" name="Net ROI">
              {weeklyRoiData.map((entry, idx) => (
                <Cell key={`cell-roi-${idx}`} fill={entry.roiPct >= 0 ? '#60a5fa' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-gray-500">Weeks start on Sunday. Same symbol filter applies.</p>
      </div>

      {/* ROI tables (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Net ROI by Month (since Feb 1, 2025)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net ROI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roiByMonthData.map(row => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{row.period}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${row.roiPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.roiPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {roiByMonthData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-500 text-center">No data</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700">Average Monthly ROI</td>
                  <td className={`px-4 py-2 text-sm font-semibold ${avgMonthlyROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {avgMonthlyROI.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Net ROI by Week (since Feb 1, 2025)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net ROI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roiByWeekData.map(row => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{row.period}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${row.roiPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.roiPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {roiByWeekData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-500 text-center">No data</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700">Average Weekly ROI</td>
                  <td className={`px-4 py-2 text-sm font-semibold ${avgWeeklyROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {avgWeeklyROI.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Premium Collected</h3>
          <p className={`text-2xl font-bold ${totalPremiumCollected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPremiumCollected.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Realized Gain</h3>
          <p className={`text-2xl font-bold ${totalRealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalRealizedGain.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Option Trades</h3>
          <p className="text-2xl font-bold text-blue-600">{totalOptionTrades}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Equity Trades</h3>
          <p className="text-2xl font-bold text-purple-600">{totalEquityTrades}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Performance Line Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Monthly Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulativeGain" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Cumulative Gain"
              />
              <Line 
                type="monotone" 
                dataKey="premiumCollected" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Monthly Premium"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Symbol Performance Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Performing Symbols</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={symbolPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Bar dataKey="totalGain" fill="#8884d8" name="Total Gain" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Premium Collection Area Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Premium Collection Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              <Area 
                type="monotone" 
                dataKey="premiumCollected" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                fillOpacity={0.6}
                name="Premium Collected"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Type Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Transaction Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={transactionTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percent }) => percent > 5 ? `${type}: ${(percent).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {transactionTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, props: any) => [
                `${value} transactions`,
                props.payload.type
              ]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Monthly Activity Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="optionCount" fill="#8884d8" name="Option Trades" />
            <Bar dataKey="stockTradeCount" fill="#82ca9d" name="Stock Trades" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Symbol Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Symbol Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium Collected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Option Contracts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {symbolPerformance.map((symbol) => (
                <tr key={symbol.symbol} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {symbol.symbol}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    symbol.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${symbol.totalGain.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    symbol.premiumCollected >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${symbol.premiumCollected.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {symbol.optionContracts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {symbol.shares.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
