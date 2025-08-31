import { FinancialLinks } from "@/components/FinancialLinks";
import { getLastThreeMonthsNames, getMonday, getNextSunday } from "@/helpers/dateHelper";
import transactionsService, { Transaction } from "@/services/transactionsService";
import { useState, useEffect } from "react";
import { calculateOpenOptions } from "@/lib/utils";
import { AlertTriangle, AlertCircle, BarChart3, TrendingUp, PieChart, Target } from 'lucide-react';


interface OptionAnalysis {
    symbol: string;
    netPremiumAllTime: number;
    netPremiumCurrentMonth: number;
    netPremiumLastMonth: number;
    netPremiumTwoMonthsAgo: number;
    allInvestmentsAllTime: number;
    allSalesAllTime: number;
    currentExposure: number;
    investmentBasisSharePrice: number;
    currentBasisSharePrice: number;
    absolutePremiumGainPercentage: number;
    totalLots: number;
    premiumGainedThisWeek: number;
    averageStrikePrice: number;
    currentMaxPotentialProfit: number;
    currentMaxGainLossPercentage: number;
    manualStrikePrice?: number | null;
    manualOptionContracts?: number | null;
    recommendedWeeklyPremium?: number | null;
    firstTransactionDate?: Date;
    earningsDate?: string | null;
    daysToEarnings?: number | null;
    maxAnnualizedROI: number;
}

export function Options() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [optionAnalysis, setOptionAnalysis] = useState<OptionAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideZeroLots, setHideZeroLots] = useState(true);
    const [activeTab, setActiveTab] = useState<'grid' | 'charts'>('grid');
    const [sortConfig, setSortConfig] = useState<{
        key: keyof OptionAnalysis;
        direction: "asc" | "desc";
    } | null>(null);

    // Helper function to calculate days to earnings
    const calculateDaysToEarnings = (earningsDate: string | null): number | null => {
        if (!earningsDate) return null;
        const earningsDateObj = new Date(earningsDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        earningsDateObj.setHours(0, 0, 0, 0);
        const diffTime = earningsDateObj.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Fetch earnings data from manual options analysis
    const fetchEarningsData = async (symbols: string[]): Promise<{[symbol: string]: {earningsDate: string | null; daysToEarnings: number | null}}> => {
        const earningsData: {[symbol: string]: {earningsDate: string | null; daysToEarnings: number | null}} = {};
        
        try {
            const response = await fetch('http://localhost:3001/api/manual-options-analysis');
            if (response.ok) {
                const manualAnalysisData = await response.json();
                
                // Create a map of symbol to earnings date
                symbols.forEach(symbol => {
                    const analysis = manualAnalysisData.find((entry: any) => entry.security === symbol);
                    const earningsDate = analysis?.next_earnings_date || null;
                    const daysToEarnings = calculateDaysToEarnings(earningsDate);
                    
                    earningsData[symbol] = {
                        earningsDate,
                        daysToEarnings
                    };
                });
            }
        } catch (error) {
            console.error('Error fetching earnings data:', error);
        }
        
        return earningsData;
    };

    // Format earnings date display
    const formatEarningsDisplay = (earningsDate: string | null, daysToEarnings: number | null): JSX.Element => {
        if (!earningsDate || daysToEarnings === null) {
            return <span className="text-xs text-gray-500">ED: N/A</span>;
        }

        const formattedDate = new Date(earningsDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        const getIcon = () => {
            if (daysToEarnings < 0) {
                return null;
            }   

            if (daysToEarnings <= 7) {
                return <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />;
            } else if (daysToEarnings >= 8 && daysToEarnings <= 14) {
                return <AlertCircle className="w-3 h-3 text-yellow-500 inline ml-1" />;
            }
            return null;
        };

        return (
            <span className={`text-xs ${
                daysToEarnings <= 7 && daysToEarnings > 0 ? 'text-red-600' : 
                daysToEarnings <= 14 && daysToEarnings >= 8 ? 'text-yellow-600' : 
                'text-gray-600'
            }`}>
                ED: {formattedDate} ({daysToEarnings} days)
                {getIcon()}
            </span>
        );
    };

    // Helper function to format numbers with commas
    const formatNumber = (num: number, decimals: number = 2): string => {
        return num.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    // Sorting function
    const handleSort = (key: keyof OptionAnalysis) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Get sorted data
    const getSortedData = (data: OptionAnalysis[]) => {
        if (!sortConfig) {
            return data;
        }

        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === "string" && typeof bValue === "string") {
                return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === "number" && typeof bValue === "number") {
                return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
    };

    // Get sort indicator
    const getSortIndicator = (key: keyof OptionAnalysis) => {
        if (!sortConfig || sortConfig.key !== key) {
            return " ↕️";
        }
        return sortConfig.direction === "asc" ? " ↑" : " ↓";
    };

    // Fetch all transactions
    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await transactionsService.fetchAllTransactions();
            if (!result || result.length === 0) {
                setError("No transactions found");
                return;
            }
            setTransactions(result);
        } catch (err) {
            console.error("Error fetching all transactions:", err);
            setError("Failed to fetch all transactions");
        } finally {
            setLoading(false);
        }
    }

    // Fetch manual strike price data for a symbol
    const fetchManualStrikePrice = async (symbol: string) => {
        try {
            const response = await fetch(`http://localhost:3001/api/strike-price/symbol/${symbol}/strike-price`);
            if (response.ok) {
                const data = await response.json();
                return {
                    manualStrikePrice: data.manualAverageStrikePrice
                        ? parseFloat(String(data.manualAverageStrikePrice))
                        : null,
                    manualOptionContracts: data.manualOptionContracts
                        ? parseInt(String(data.manualOptionContracts))
                        : null,
                    recommendedWeeklyPremium: data.recommendedWeeklyPremium
                        ? parseFloat(String(data.recommendedWeeklyPremium))
                        : null,
                };
            }
        } catch (error) {
            console.error(`Error fetching manual values for ${symbol}:`, error);
        }
        return { manualStrikePrice: null, manualOptionContracts: null };
    };

    // Helper function to get date ranges
    const getDateRanges = () => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
            currentMonthStart,
            lastMonthStart,
            lastMonthEnd,
            twoMonthsAgoStart,
            twoMonthsAgoEnd,
            weekAgo,
            now,
        };
    };

    // Calculate option analysis for all symbols that ever had options
    const calculateOptionAnalysis = async (): Promise<OptionAnalysis[]> => {
        const symbolMap = new Map<string, OptionAnalysis>();
        const dateRanges = getDateRanges();

        // Get all symbols that have had option transactions
        const symbolsWithOptions = new Set<string>();
        transactions.forEach((transaction) => {
            if (transaction.security_type === "OPTN") {
                symbolsWithOptions.add(transaction.calculated_symbol);
            }
        });

        // Fetch earnings data for all symbols
        const earningsData = await fetchEarningsData(Array.from(symbolsWithOptions));

        // Initialize analysis for each symbol
        symbolsWithOptions.forEach((symbol) => {
            const earnings = earningsData[symbol];
            symbolMap.set(symbol, {
                symbol,
                netPremiumAllTime: 0,
                netPremiumCurrentMonth: 0,
                netPremiumLastMonth: 0,
                netPremiumTwoMonthsAgo: 0,
                allInvestmentsAllTime: 0,
                allSalesAllTime: 0,
                currentExposure: 0,
                investmentBasisSharePrice: 0,
                currentBasisSharePrice: 0,
                absolutePremiumGainPercentage: 0,
                totalLots: 0,
                premiumGainedThisWeek: 0,
                averageStrikePrice: 0,
                currentMaxPotentialProfit: 0,
                currentMaxGainLossPercentage: 0,
                manualStrikePrice: null,
                manualOptionContracts: null,
                recommendedWeeklyPremium: null,
                earningsDate: earnings.earningsDate,
                daysToEarnings: earnings.daysToEarnings,
                maxAnnualizedROI: 0,
            });
        });

        // Fetch manual data for all symbols
        for (const symbol of symbolsWithOptions) {
            const manualData = await fetchManualStrikePrice(symbol);
            const analysis = symbolMap.get(symbol)!;
            analysis.manualStrikePrice = manualData.manualStrikePrice;
            analysis.manualOptionContracts = manualData.manualOptionContracts;
            analysis.recommendedWeeklyPremium = manualData.recommendedWeeklyPremium;
        }

        // Process all transactions for each symbol
        symbolsWithOptions.forEach((symbol) => {
            const symbolTransactions = transactions.filter((t) => t.calculated_symbol === symbol);
            const analysis = symbolMap.get(symbol)!;

            let totalShares = 0;
            let totalCost = 0;
            let totalOptionContracts = 0;
            const strikeArray: number[] = [];

            // Use shared utility to compute open lots exactly like TransactionAnalysis
            const openLotsForSymbol = calculateOpenOptions(symbolTransactions as any, symbol);

            symbolTransactions.forEach((transaction) => {
                const transDate = new Date(transaction.transaction_date);
                const amount = parseFloat(String(transaction.amount));
                const quantity = parseFloat(String(transaction.quantity));

                if (transaction.security_type === "OPTN") {
                    // Option transactions
                    analysis.netPremiumAllTime += amount;

                    // Monthly premium calculations
                    if (transDate >= dateRanges.currentMonthStart) {
                        analysis.netPremiumCurrentMonth += amount;
                    }
                    if (transDate >= dateRanges.lastMonthStart && transDate <= dateRanges.lastMonthEnd) {
                        analysis.netPremiumLastMonth += amount;
                    }
                    if (transDate >= dateRanges.twoMonthsAgoStart && transDate <= dateRanges.twoMonthsAgoEnd) {
                        analysis.netPremiumTwoMonthsAgo += amount;
                    }

                    const mondayOfThisWeek = getMonday(new Date());
                    const nextSunday = getNextSunday();

                    const transDateOnly = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate());
                    const mondayOnly = new Date(
                        mondayOfThisWeek.getFullYear(),
                        mondayOfThisWeek.getMonth(),
                        mondayOfThisWeek.getDate()
                    );
                    const sundayOnly = new Date(nextSunday.getFullYear(), nextSunday.getMonth(), nextSunday.getDate());

                    if (transDateOnly >= mondayOnly && transDateOnly <= sundayOnly) {
                        analysis.premiumGainedThisWeek += amount;
                    }

                    // if (analysis.symbol === "BBAI") {

                    // console.log(`Options.tsx: monday/sunday dates for this week:`, {monday: mondayOfThisWeek.toISOString(), sunday: nextSunday.toISOString(), transDate: transDate.toISOString()});
                    // if (transDate >= mondayOfThisWeek && transDate <= nextSunday) {
                    //   analysis.premiumGainedThisWeek += amount;
                    // }
                    // }

                    // Track option contracts for total lots (support "Sold"/"Bought" variants)
                    const tt = (transaction.transaction_type || "").toLowerCase();
                    const isSoldOpt = tt.startsWith("sold");
                    const isBoughtOpt = tt.startsWith("bought");

                    if (isSoldOpt) {
                        totalOptionContracts += Math.abs(quantity);
                    } else if (
                        isBoughtOpt ||
                        transaction.transaction_type === "Option Assigned" ||
                        transaction.transaction_type === "Option Expired"
                    ) {
                        totalOptionContracts -= Math.abs(quantity);
                    }

                    // Use the strike field directly for strike price calculation
                    const strike = parseFloat(String(transaction.strike));
                    if (isSoldOpt && !isNaN(strike) && strike > 0) {
                        strikeArray.push(strike);
                    }
                } else if (transaction.security_type === "EQ") {
                    // Equity transactions
                    if (transaction.transaction_type === "Bought") {
                        analysis.allInvestmentsAllTime += Math.abs(amount);
                        totalShares += quantity;
                        totalCost += Math.abs(amount);
                    } else if (transaction.transaction_type === "Sold") {
                        if (transaction.calculated_symbol === "WOLF") {
                            console.log(`WOLF sell transaction, amount: ${amount}.`, { transaction });
                        }
                        analysis.allSalesAllTime += Math.abs(amount);
                        totalShares += quantity; // quantity is negative for sells
                    }
                }
            });

            // Calculate derived metrics
            analysis.totalLots = openLotsForSymbol;
            if (analysis.symbol === "WOLF") {
                console.log(`WOLF analysis:`, { analysis, totalOptionContracts, totalShares, totalCost, strikeArray });
            }

            analysis.currentExposure = analysis.allInvestmentsAllTime - analysis.allSalesAllTime;
            if (totalShares < 1) {
                analysis.currentExposure = 0; // No exposure if no shares
            }

            // If no current exposure, force lots and basis prices to 0
            if (analysis.currentExposure === 0) {
                analysis.totalLots = 0;
            }

            // analysis.investmentBasisSharePrice = totalShares > 0 ? totalCost / totalShares : 0;
            analysis.investmentBasisSharePrice = analysis.currentExposure / analysis.totalLots / 100 || 0;
            // Get current share price from most recent equity transaction
            const equityTransactions = symbolTransactions.filter((t) => t.security_type === "EQ");
            const lastEquityTransaction = equityTransactions[equityTransactions.length - 1];
            analysis.currentBasisSharePrice = lastEquityTransaction
                ? parseFloat(String(lastEquityTransaction.price))
                : 0;
            analysis.currentBasisSharePrice =
                (analysis.currentExposure - analysis.netPremiumAllTime) / analysis.totalLots / 100 || 0;
            if (analysis.totalLots == 0) {
                analysis.currentBasisSharePrice = 0; // No lots means no basis share price
                analysis.investmentBasisSharePrice = 0;
            }
            // Calculate average strike price - use manual value if available, otherwise calculate
            analysis.averageStrikePrice =
                analysis.manualStrikePrice ||
                (strikeArray.length > 0
                    ? strikeArray.reduce((sum, strike) => sum + strike, 0) / strikeArray.length
                    : 0);

            // Calculate absolute premium gain percentage
            analysis.absolutePremiumGainPercentage =
                analysis.allInvestmentsAllTime > 0
                    ? (analysis.netPremiumAllTime / analysis.allInvestmentsAllTime) * 100
                    : 0;

            // Calculate current max potential profit (strike value + all equity transactions + premium collected)
            // if (analysis.totalLots > 0 && analysis.averageStrikePrice > 0) {
            if (true) {
                // Use manual strike price if available, otherwise use calculated average
                const effectiveStrikePrice = analysis.manualStrikePrice || analysis.averageStrikePrice;
                const strikeValue = analysis.totalLots * effectiveStrikePrice * 100;
                // Sum of ALL equity transactions (both buys and sells)
                const sumOfEquityTransactions = symbolTransactions
                    .filter((t) => t.security_type === "EQ")
                    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
                if (analysis.symbol === "WOLF") {
                    console.log(`WOLF current max potential profit calculation:`, {
                        effectiveStrikePrice,
                        strikeValue,
                        sumOfEquityTransactions,
                        netPremiumAllTime: analysis.netPremiumAllTime,
                    });
                }

                analysis.currentMaxPotentialProfit = strikeValue + sumOfEquityTransactions + analysis.netPremiumAllTime;
            }

            // Calculate current max gain/loss percentage
            const totalInvested = analysis.allInvestmentsAllTime;
            // if (totalInvested > 0 && analysis.currentMaxPotentialProfit > 0) {
            if (true) {
                analysis.currentMaxGainLossPercentage = (analysis.currentMaxPotentialProfit / totalInvested) * 100;
            }

            // Calculate maximum annualized ROI for individual stock
            if (symbolTransactions.length > 0 && totalInvested > 0) {
                // Get earliest and most recent transaction dates
                const transactionDates = symbolTransactions.map(t => new Date(t.transaction_date));
                const earliestDate = new Date(Math.min(...transactionDates.map(d => d.getTime())));
                const mostRecentDate = new Date(Math.max(...transactionDates.map(d => d.getTime())));
                
                // Calculate days between earliest and most recent transactions
                const msPerDay = 1000 * 60 * 60 * 24;
                const daysBetween = Math.max(1, (mostRecentDate.getTime() - earliestDate.getTime()) / msPerDay);
                
                // Calculate annualized ROI based on max potential profit
                const rawRoi = analysis.currentMaxPotentialProfit / totalInvested; // decimal ROI
                const annualizationFactor = 365 / daysBetween;
                
                // Apply compound interest formula: (1 + roi)^(365/days) - 1
                analysis.maxAnnualizedROI = rawRoi > -1 && isFinite(annualizationFactor) 
                    ? (Math.pow(1 + rawRoi, annualizationFactor) - 1) * 100 
                    : 0;
            }
        });

        return Array.from(symbolMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (transactions.length > 0) {
            const calculateAndSetAnalysis = async () => {
                const analysis = await calculateOptionAnalysis();
                setOptionAnalysis(analysis);
            };
            calculateAndSetAnalysis();
        }
    }, [transactions]);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Options Positions</h1>
                <div className="text-center py-8">Loading options analysis...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Options Positions</h1>
                <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
            </div>
        );
    }

    const baseRowStyles = () => {
        return "px-1 py-1 whitespace-nowrap text-sm";
        // <td className={`px-4 py-4 whitespace-nowrap text-sm text-right ${
    };

    const thClasses = "text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100";
    const thRight = "text-right " + thClasses;

    const totalExposure = optionAnalysis
        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
        .reduce((sum, analysis) => sum + analysis.currentExposure, 0);

    const totalMaxGain = optionAnalysis
        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
        .reduce((sum, analysis) => sum + analysis.currentMaxPotentialProfit, 0);

    // Annualized ROI (percentage) starting from Feb 20, 2025 based on current totalExposure and totalMaxGain
    const trackingStartDate = new Date(2025, 1, 20); // Months are 0-indexed: 1 => February
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.max(1, (today.getTime() - trackingStartDate.getTime()) / msPerDay);
    const rawMaxRoi = totalExposure > 0 ? totalMaxGain / totalExposure : 0; // non-annualized ROI (decimal)
    const annualizationFactor = 365 / daysElapsed;
    const totalAnnualizedMaxRoi = rawMaxRoi > -1 ? (Math.pow(1 + rawMaxRoi, annualizationFactor) - 1) * 100 : 0; // percentage

    // Charts data preparation
    const getTopPerformers = () => {
        return optionAnalysis
            .filter(a => !hideZeroLots || a.totalLots > 0)
            .sort((a, b) => b.netPremiumAllTime - a.netPremiumAllTime)
            .slice(0, 10);
    };

    const getExposureBreakdown = () => {
        return optionAnalysis
            .filter(a => !hideZeroLots || a.totalLots > 0)
            .filter(a => a.currentExposure > 0)
            .sort((a, b) => b.currentExposure - a.currentExposure);
    };

    const getROIDistribution = () => {
        return optionAnalysis
            .filter(a => !hideZeroLots || a.totalLots > 0)
            .filter(a => isFinite(a.maxAnnualizedROI) && a.maxAnnualizedROI !== 0)
            .filter(a => a.maxAnnualizedROI <= 200) // Exclude positions with ROI over 200%
            .sort((a, b) => b.maxAnnualizedROI - a.maxAnnualizedROI);
    };

    const renderChartsTab = () => {
        const topPerformers = getTopPerformers();
        const exposureBreakdown = getExposureBreakdown();
        const roiDistribution = getROIDistribution();

        // Helper function to generate pie chart colors
        const generateColors = (count: number) => {
            const colors = [
                '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
                '#14B8A6', '#F43F5E', '#22C55E', '#A855F7', '#0EA5E9'
            ];
            return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
        };

        // Helper function to create pie chart
        const createPieChart = (data: Array<{label: string, value: number, color: string}>, title: string) => {
            const total = data.reduce((sum, item) => sum + item.value, 0);
            let currentAngle = 0;
            
            return (
                <div className="flex flex-col items-center">
                    <h4 className="text-sm font-medium mb-4 text-center">{title}</h4>
                    <div className="relative w-[28rem] h-80">
                        <svg viewBox="0 0 320 320" className="w-full h-full">
                            {/* Pie slices */}
                            {data.map((item, index) => {
                                const percentage = (item.value / total) * 100;
                                const angle = (percentage / 100) * 360;
                                const startAngle = currentAngle;
                                const endAngle = currentAngle + angle;
                                const midAngle = (startAngle + endAngle) / 2;
                                
                                // Pie slice coordinates (inner radius 0, outer radius 80)
                                const x1 = 160 + 80 * Math.cos((startAngle * Math.PI) / 180);
                                const y1 = 160 + 80 * Math.sin((startAngle * Math.PI) / 180);
                                const x2 = 160 + 80 * Math.cos((endAngle * Math.PI) / 180);
                                const y2 = 160 + 80 * Math.sin((endAngle * Math.PI) / 180);
                                const largeArc = angle > 180 ? 1 : 0;
                                
                                // Callout line coordinates
                                const innerX = 160 + 90 * Math.cos((midAngle * Math.PI) / 180);
                                const innerY = 160 + 90 * Math.sin((midAngle * Math.PI) / 180);
                                const outerX = 160 + 120 * Math.cos((midAngle * Math.PI) / 180);
                                const outerY = 160 + 120 * Math.sin((midAngle * Math.PI) / 180);
                                
                                // Label position and alignment
                                const labelX = 160 + 140 * Math.cos((midAngle * Math.PI) / 180);
                                const labelY = 160 + 140 * Math.sin((midAngle * Math.PI) / 180);
                                const isRightSide = Math.cos((midAngle * Math.PI) / 180) > 0;
                                
                                const path = `M 160 160 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                currentAngle += angle;
                                
                                // Format value based on chart type
                                const formattedValue = title.includes('Monthly') ? `$${formatNumber(item.value)}` : 
                                                     title.includes('ROI') ? `${formatNumber(item.value, 1)}%` : 
                                                     title.includes('Exposure') ? `$${formatNumber(item.value)}` : 
                                                     `$${formatNumber(item.value)}`;
                                
                                return (
                                    <g key={index}>
                                        {/* Pie slice */}
                                        <path
                                            d={path}
                                            fill={item.color}
                                            stroke="white"
                                            strokeWidth="2"
                                            className="hover:opacity-80 cursor-pointer transition-opacity duration-200"
                                        >
                                            {/* Tooltip */}
                                            <title>
                                                {item.label}: {formattedValue} ({percentage.toFixed(1)}%)
                                            </title>
                                        </path>
                                        
                                        {/* Only show callouts for slices >= 5% to avoid clutter */}
                                        {percentage >= 5 && (
                                            <>
                                                {/* Callout line */}
                                                <line
                                                    x1={innerX}
                                                    y1={innerY}
                                                    x2={outerX}
                                                    y2={outerY}
                                                    stroke="#666"
                                                    strokeWidth="1.5"
                                                />
                                                
                                                {/* Label background */}
                                                <rect
                                                    x={isRightSide ? labelX : labelX - 80}
                                                    y={labelY - 12}
                                                    width="80"
                                                    height="24"
                                                    fill="white"
                                                    stroke="#ddd"
                                                    strokeWidth="1"
                                                    rx="3"
                                                />
                                                
                                                {/* Symbol label */}
                                                <text
                                                    x={isRightSide ? labelX + 4 : labelX - 76}
                                                    y={labelY - 2}
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                    fill="#333"
                                                    textAnchor="start"
                                                >
                                                    {item.label}
                                                </text>
                                                
                                                {/* Value label */}
                                                <text
                                                    x={isRightSide ? labelX + 4 : labelX - 76}
                                                    y={labelY + 9}
                                                    fontSize="10"
                                                    fill="#666"
                                                    textAnchor="start"
                                                >
                                                    {formattedValue}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-8">
                {/* Net Premium Performance Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <BarChart3 className="mr-2 text-blue-600" size={20} />
                        Top 10 Net Premium Performers
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Bar Chart */}
                        <div className="space-y-3">
                            {topPerformers.map((analysis, index) => {
                                const maxWidth = Math.max(...topPerformers.map(a => Math.abs(a.netPremiumAllTime)));
                                const width = Math.abs(analysis.netPremiumAllTime) / maxWidth * 100;
                                const isPositive = analysis.netPremiumAllTime >= 0;
                                
                                return (
                                    <div key={analysis.symbol} className="flex items-center space-x-3">
                                        <span className="text-sm font-medium w-12 text-right">#{index + 1}</span>
                                        <span className="text-sm font-medium w-16">{analysis.symbol}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                            <div 
                                                className={`h-6 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                                style={{ width: `${width}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                                ${formatNumber(analysis.netPremiumAllTime)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Pie Chart */}
                        <div className="flex justify-center">
                            {createPieChart(
                                topPerformers.slice(0, 10).map((analysis, index) => ({
                                    label: analysis.symbol,
                                    value: Math.abs(analysis.netPremiumAllTime),
                                    color: generateColors(10)[index]
                                })),
                                "Premium Distribution"
                            )}
                        </div>
                    </div>
                </div>

                {/* Current Exposure Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <PieChart className="mr-2 text-purple-600" size={20} />
                        Current Exposure Distribution
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Bar Chart */}
                        <div className="space-y-3">
                            {exposureBreakdown.slice(0, 15).map((analysis) => {
                                const totalExposure = exposureBreakdown.reduce((sum, a) => sum + a.currentExposure, 0);
                                const percentage = totalExposure > 0 ? (analysis.currentExposure / totalExposure) * 100 : 0;
                                
                                return (
                                    <div key={analysis.symbol} className="flex items-center space-x-3">
                                        <span className="text-sm font-medium w-16">{analysis.symbol}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-5 relative">
                                            <div 
                                                className="h-5 rounded-full bg-blue-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                                {formatNumber(percentage, 1)}%
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-600 w-24 text-right">
                                            ${formatNumber(analysis.currentExposure)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Pie Chart */}
                        <div className="flex justify-center">
                            {createPieChart(
                                exposureBreakdown.slice(0, 15).map((analysis, index) => ({
                                    label: analysis.symbol,
                                    value: analysis.currentExposure,
                                    color: generateColors(15)[index]
                                })),
                                "Exposure Distribution"
                            )}
                        </div>
                    </div>
                </div>

                {/* ROI Performance Distribution */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Target className="mr-2 text-green-600" size={20} />
                        Annualized ROI Distribution (≤200%)
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Bar Chart */}
                        <div className="space-y-3">
                            {roiDistribution.slice(0, 15).map((analysis) => {
                                const maxROI = Math.max(...roiDistribution.map(a => Math.abs(a.maxAnnualizedROI)));
                                const width = Math.abs(analysis.maxAnnualizedROI) / maxROI * 100;
                                const isPositive = analysis.maxAnnualizedROI >= 0;
                                
                                return (
                                    <div key={analysis.symbol} className="flex items-center space-x-3">
                                        <span className="text-sm font-medium w-16">{analysis.symbol}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-5 relative">
                                            <div 
                                                className={`h-5 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                                style={{ width: `${width}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                                {formatNumber(analysis.maxAnnualizedROI, 1)}%
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-600 w-16 text-right">
                                            {analysis.totalLots} lots
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Pie Chart */}
                        <div className="flex justify-center">
                            {createPieChart(
                                roiDistribution.slice(0, 15).map((analysis, index) => ({
                                    label: analysis.symbol,
                                    value: Math.abs(analysis.maxAnnualizedROI),
                                    color: generateColors(15)[index]
                                })),
                                "ROI Distribution"
                            )}
                        </div>
                    </div>
                </div>

                {/* Monthly Performance Trend */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <TrendingUp className="mr-2 text-orange-600" size={20} />
                        Monthly Premium Trend (Last 3 Months)
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Monthly Statistics */}
                        <div className="space-y-4">
                            {/* Monthly totals */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-lg font-semibold text-blue-600">
                                        ${formatNumber(optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + a.netPremiumTwoMonthsAgo, 0))}
                                    </div>
                                    <div className="text-xs text-gray-600">{getLastThreeMonthsNames().twoMonthsAgo}</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-lg font-semibold text-green-600">
                                        ${formatNumber(optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + a.netPremiumLastMonth, 0))}
                                    </div>
                                    <div className="text-xs text-gray-600">{getLastThreeMonthsNames().lastMonth}</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-lg font-semibold text-purple-600">
                                        ${formatNumber(optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + a.netPremiumCurrentMonth, 0))}
                                    </div>
                                    <div className="text-xs text-gray-600">{getLastThreeMonthsNames().currentMonth}</div>
                                </div>
                            </div>

                            {/* Top monthly performers */}
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Top Current Month Performers</h4>
                                <div className="space-y-1">
                                    {optionAnalysis
                                        .filter(a => !hideZeroLots || a.totalLots > 0)
                                        .filter(a => a.netPremiumCurrentMonth > 0)
                                        .sort((a, b) => b.netPremiumCurrentMonth - a.netPremiumCurrentMonth)
                                        .slice(0, 6)
                                        .map((analysis) => (
                                            <div key={analysis.symbol} className="flex justify-between items-center p-1 bg-gray-50 rounded text-sm">
                                                <span className="font-medium">{analysis.symbol}</span>
                                                <span className="text-green-600 font-medium">
                                                    ${formatNumber(analysis.netPremiumCurrentMonth)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Monthly Pie Chart */}
                        <div className="flex justify-center">
                            {(() => {
                                const monthlyData = [
                                    {
                                        label: getLastThreeMonthsNames().twoMonthsAgo,
                                        value: optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + Math.abs(a.netPremiumTwoMonthsAgo), 0),
                                        color: '#3B82F6'
                                    },
                                    {
                                        label: getLastThreeMonthsNames().lastMonth,
                                        value: optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + Math.abs(a.netPremiumLastMonth), 0),
                                        color: '#10B981'
                                    },
                                    {
                                        label: getLastThreeMonthsNames().currentMonth,
                                        value: optionAnalysis
                                            .filter(a => !hideZeroLots || a.totalLots > 0)
                                            .reduce((sum, a) => sum + Math.abs(a.netPremiumCurrentMonth), 0),
                                        color: '#8B5CF6'
                                    }
                                ].filter(item => item.value > 0);
                                
                                return createPieChart(monthlyData, "Monthly Premium Distribution");
                            })()}
                        </div>
                    </div>
                </div>

                {/* Portfolio Summary Stats */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Portfolio Summary Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {optionAnalysis.filter(a => !hideZeroLots || a.totalLots > 0).length}
                            </div>
                            <div className="text-sm text-gray-600">Active Positions</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                ${formatNumber(totalExposure)}
                            </div>
                            <div className="text-sm text-gray-600">Total Exposure</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {formatNumber(totalAnnualizedMaxRoi, 1)}%
                            </div>
                            <div className="text-sm text-gray-600">Portfolio ROI</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                                {formatNumber(optionAnalysis
                                    .filter(a => !hideZeroLots || a.totalLots > 0)
                                    .reduce((sum, a) => sum + a.totalLots, 0), 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total Lots</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 w-100%">
            <h1 className="text-3xl font-bold">Options Positions</h1>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('grid')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'grid'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Options Grid
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'charts'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Analytics & Charts
                    </button>
                </nav>
            </div>

            {loading && (
                <div className="text-center py-8">Loading options analysis...</div>
            )}

            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
            )}

            {!loading && !error && (
                <>
                    {activeTab === 'grid' && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">
                                    Options Analysis - All Symbols ({optionAnalysis.length} symbols)
                                </h2>
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-600 whitespace-nowrap">
                                        Annualized Max ROI: {isFinite(totalAnnualizedMaxRoi) ? formatNumber(totalAnnualizedMaxRoi) : "N/A"}%
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="hideZeroLots"
                                            checked={hideZeroLots}
                                            onChange={(e) => setHideZeroLots(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="hideZeroLots" className="text-sm text-gray-700">
                                            Hide positions with 0 lots
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {optionAnalysis.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-max divide-y divide-gray-200" style={{ minWidth: "2000px" }}>
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        
                                        className="sticky left-0 z-10 bg-gray-50 px-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer"
                                        onClick={() => handleSort("symbol")}
                                    >
                                        Symbol{getSortIndicator("symbol")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("netPremiumAllTime")}
                                    >
                                        Net Premium All Time{getSortIndicator("netPremiumAllTime")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("netPremiumCurrentMonth")}
                                    >
                                        Net Premium {getLastThreeMonthsNames().currentMonth}
                                        {getSortIndicator("netPremiumCurrentMonth")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("netPremiumLastMonth")}
                                    >
                                        Net Premium {getLastThreeMonthsNames().lastMonth}
                                        {getSortIndicator("netPremiumLastMonth")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("netPremiumTwoMonthsAgo")}
                                    >
                                        Net Premium {getLastThreeMonthsNames().twoMonthsAgo}
                                        {getSortIndicator("netPremiumTwoMonthsAgo")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("allInvestmentsAllTime")}
                                    >
                                        All Investments{getSortIndicator("allInvestmentsAllTime")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("allSalesAllTime")}
                                    >
                                        All Sales{getSortIndicator("allSalesAllTime")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("currentExposure")}
                                    >
                                        Current Exposure{getSortIndicator("currentExposure")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("investmentBasisSharePrice")}
                                    >
                                        Investment Basis Price{getSortIndicator("investmentBasisSharePrice")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("currentBasisSharePrice")}
                                    >
                                        Current Basis Price{getSortIndicator("currentBasisSharePrice")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("absolutePremiumGainPercentage")}
                                    >
                                        Premium Gain %{getSortIndicator("absolutePremiumGainPercentage")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("totalLots")}
                                    >
                                        Total Lots{getSortIndicator("totalLots")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("premiumGainedThisWeek")}
                                    >
                                        Premium This Week{getSortIndicator("premiumGainedThisWeek")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("averageStrikePrice")}
                                    >
                                        Avg Strike Price{getSortIndicator("averageStrikePrice")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("recommendedWeeklyPremium")}
                                    >
                                        Rec. Weekly Premium{getSortIndicator("recommendedWeeklyPremium")}
                                    </th>

                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("currentMaxPotentialProfit")}
                                    >
                                        Max Potential Profit{getSortIndicator("currentMaxPotentialProfit")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("currentMaxGainLossPercentage")}
                                    >
                                        Max Gain/Loss %{getSortIndicator("currentMaxGainLossPercentage")}
                                    </th>
                                    <th
                                        className={thRight}
                                        onClick={() => handleSort("maxAnnualizedROI")}
                                    >
                                        Max Annualized ROI %{getSortIndicator("maxAnnualizedROI")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getSortedData(optionAnalysis)
                                    .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                    .map((analysis) => (
                                        <tr key={analysis.symbol} className="hover:bg-gray-200">
                                            <td className="sticky left-0 z-10 bg-white hover:bg-gray-200 px-1 py-1 whitespace-nowrap text-sm font-medium text-blue-600 border-r border-gray-200">
                                                <a href={`/symbol/${analysis.symbol}`} className="hover:text-blue-800">
                                                    <>{analysis.symbol}
                                                    <FinancialLinks security={analysis.symbol} className="ml-2" />
                                                    </>
                                                    <div className="mt-1">
                                                        {formatEarningsDisplay(analysis.earningsDate || null, analysis.daysToEarnings || null)}
                                                    </div>
                                                </a>
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} font-medium text-right ${
                                                    analysis.netPremiumAllTime >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.netPremiumAllTime)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.netPremiumCurrentMonth >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.netPremiumCurrentMonth)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.netPremiumLastMonth >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.netPremiumLastMonth)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.netPremiumTwoMonthsAgo >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.netPremiumTwoMonthsAgo)}
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                ${formatNumber(analysis.allInvestmentsAllTime)}
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                ${formatNumber(analysis.allSalesAllTime)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.currentExposure >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.currentExposure)}
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                ${formatNumber(analysis.investmentBasisSharePrice)}
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                ${formatNumber(analysis.currentBasisSharePrice)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} font-medium text-right ${
                                                    analysis.absolutePremiumGainPercentage >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {formatNumber(analysis.absolutePremiumGainPercentage)}%
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                {formatNumber(analysis.totalLots, 0)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.premiumGainedThisWeek >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                <div className="flex items-center justify-end space-x-1">
                                                    <span>
                                                        {analysis.totalLots > 0
                                                            ? formatNumber(analysis.premiumGainedThisWeek)
                                                            : "N/A"}
                                                    </span>
                                                    <span className="text-lg">
                                                        {analysis.totalLots > 0 && (
                                                          analysis.premiumGainedThisWeek > 0 || analysis.recommendedWeeklyPremium === 0)
                                                            ? `☑️`
                                                            : analysis.totalLots < 1
                                                            ? null
                                                            : "☐"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`${baseRowStyles()} text-right`}>
                                                {analysis.totalLots < 1
                                                    ? "N/A"
                                                    : formatNumber(analysis.averageStrikePrice)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} text-right ${
                                                    analysis.recommendedWeeklyPremium
                                                        ? "text-blue-600"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                {analysis.recommendedWeeklyPremium
                                                    ? `$${formatNumber(analysis.recommendedWeeklyPremium)}`
                                                    : "N/A"}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} font-medium text-right ${
                                                    analysis.currentMaxPotentialProfit >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                ${formatNumber(analysis.currentMaxPotentialProfit)}
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} font-medium text-right ${
                                                    analysis.currentMaxGainLossPercentage >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {formatNumber(analysis.currentMaxGainLossPercentage)}%
                                            </td>
                                            <td
                                                className={`${baseRowStyles()} font-medium text-right ${
                                                    analysis.maxAnnualizedROI >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {isFinite(analysis.maxAnnualizedROI) && analysis.maxAnnualizedROI !== 0
                                                    ? `${formatNumber(analysis.maxAnnualizedROI)}%`
                                                    : "N/A"}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                            <tfoot className="bg-gray-100">
                                <tr className="font-semibold">
                                    <td className="sticky left-0 z-10 bg-gray-100 px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200">
                                        TOTALS / AVERAGES
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumAllTime, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumAllTime, 0)
                                        )}
                                    </td>
                                    <td
                                        className={`${thRight} font-medium  ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumCurrentMonth, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumCurrentMonth, 0)
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumLastMonth, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumLastMonth, 0)
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumTwoMonthsAgo, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.netPremiumTwoMonthsAgo, 0)
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.allInvestmentsAllTime, 0)
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.allSalesAllTime, 0)
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentExposure, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentExposure, 0)
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.investmentBasisSharePrice, 0) /
                                                Math.max(
                                                    optionAnalysis.filter(
                                                        (analysis) => !hideZeroLots || analysis.totalLots > 0
                                                    ).length,
                                                    1
                                                )
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .filter((a) => a.currentBasisSharePrice > 0)
                                                .reduce((sum, a) => sum + a.currentBasisSharePrice, 0) /
                                                Math.max(
                                                    optionAnalysis
                                                        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                        .filter((a) => a.currentBasisSharePrice > 0).length,
                                                    1
                                                )
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.absolutePremiumGainPercentage, 0) /
                                                Math.max(
                                                    optionAnalysis.filter(
                                                        (analysis) => !hideZeroLots || analysis.totalLots > 0
                                                    ).length,
                                                    1
                                                ) >=
                                            0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.absolutePremiumGainPercentage, 0) /
                                                Math.max(
                                                    optionAnalysis.filter(
                                                        (analysis) => !hideZeroLots || analysis.totalLots > 0
                                                    ).length,
                                                    1
                                                )
                                        )}
                                        %
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.totalLots, 0),
                                            0
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.premiumGainedThisWeek, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        <div className="flex items-center justify-end space-x-1">
                                            <span className="text-lg">
                                                {optionAnalysis
                                                    .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                    .reduce((sum, a) => sum + a.premiumGainedThisWeek, 0) > 0
                                                    ? "☑️"
                                                    : "☐"}
                                            </span>
                                            <span>
                                                $
                                                {formatNumber(
                                                    optionAnalysis
                                                        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                        .reduce((sum, a) => sum + a.premiumGainedThisWeek, 0)
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .filter((a) => a.averageStrikePrice > 0)
                                                .reduce((sum, a) => sum + a.averageStrikePrice, 0) /
                                                Math.max(
                                                    optionAnalysis
                                                        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                        .filter((a) => a.averageStrikePrice > 0).length,
                                                    1
                                                )
                                        )}
                                    </td>

                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + (a.recommendedWeeklyPremium || 0), 0) >= 0
                                                ? "text-blue-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + (a.recommendedWeeklyPremium || 0), 0)
                                        )}
                                    </td>

                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentMaxPotentialProfit, 0) >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        $
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentMaxPotentialProfit, 0)
                                        )}
                                    </td>

                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentMaxGainLossPercentage, 0) /
                                                Math.max(
                                                    optionAnalysis.filter(
                                                        (analysis) => !hideZeroLots || analysis.totalLots > 0
                                                    ).length,
                                                    1
                                                ) >=
                                            0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >

                                        ${formatNumber(100 * (totalMaxGain / totalExposure))}%
                                        {/* xyzzy (${totalExposure.toFixed(2)}) max gain ${totalMaxGain.toFixed(2)}
                                        {formatNumber(
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .reduce((sum, a) => sum + a.currentMaxGainLossPercentage, 0) /
                                                Math.max(
                                                    optionAnalysis.filter(
                                                        (analysis) => !hideZeroLots || analysis.totalLots > 0
                                                    ).length,
                                                    1
                                                )
                                        )}
                                        % */}
                                    </td>

                                    <td
                                        className={`px-4 py-4 whitespace-nowrap text-sm font-bold text-right ${
                                            optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .filter((analysis) => isFinite(analysis.maxAnnualizedROI) && analysis.maxAnnualizedROI !== 0)
                                                .reduce((sum, a) => sum + a.maxAnnualizedROI, 0) /
                                                Math.max(
                                                    optionAnalysis
                                                        .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                        .filter((analysis) => isFinite(analysis.maxAnnualizedROI) && analysis.maxAnnualizedROI !== 0).length,
                                                    1
                                                ) >=
                                            0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {(() => {
                                            const validAnalyses = optionAnalysis
                                                .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                                .filter((analysis) => isFinite(analysis.maxAnnualizedROI) && analysis.maxAnnualizedROI !== 0);
                                            const avgAnnualizedROI = validAnalyses.length > 0
                                                ? validAnalyses.reduce((sum, a) => sum + a.maxAnnualizedROI, 0) / validAnalyses.length
                                                : 0;
                                            return isFinite(avgAnnualizedROI) && avgAnnualizedROI !== 0
                                                ? `${formatNumber(avgAnnualizedROI)}%`
                                                : "N/A";
                                        })()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">No option transactions found.</p>
                )}
                        </div>
                    )}

                    {activeTab === 'charts' && renderChartsTab()}
                </>
            )}
        </div>
    );
}
