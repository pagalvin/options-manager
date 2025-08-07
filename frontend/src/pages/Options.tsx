import { FinancialLinks } from "@/components/FinancialLinks";
import { getLastThreeMonthsNames, getMonday, getNextSunday } from "@/helpers/dateHelper";
import transactionsService, { Transaction } from "@/services/transactionsService";
import { useState, useEffect } from "react";


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
}

export function Options() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [optionAnalysis, setOptionAnalysis] = useState<OptionAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideZeroLots, setHideZeroLots] = useState(true);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof OptionAnalysis;
        direction: "asc" | "desc";
    } | null>(null);

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

        // Initialize analysis for each symbol
        symbolsWithOptions.forEach((symbol) => {
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

                    // Track option contracts for total lots
                    if (transaction.transaction_type === "Sold Short") {
                        totalOptionContracts += Math.abs(quantity);
                    } else if (
                        ["Bought To Cover", "Option Assigned", "Option Expired"].includes(transaction.transaction_type)
                    ) {
                        totalOptionContracts -= Math.abs(quantity);
                    }

                    // Use the strike field directly for strike price calculation
                    const strike = parseFloat(String(transaction.strike));
                    if (transaction.transaction_type === "Sold Short" && !isNaN(strike) && strike > 0) {
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
            analysis.totalLots = Math.max(0, totalOptionContracts);
            if (analysis.symbol === "WOLF") {
                console.log(`WOLF analysis:`, { analysis, totalOptionContracts, totalShares, totalCost, strikeArray });
            }

            analysis.currentExposure = analysis.allInvestmentsAllTime - analysis.allSalesAllTime;
            if (totalShares < 1) {
                analysis.currentExposure = 0; // No exposure if no shares
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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Options Positions</h1>

            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        Options Analysis - All Symbols ({optionAnalysis.length} symbols)
                    </h2>
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
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getSortedData(optionAnalysis)
                                    .filter((analysis) => !hideZeroLots || analysis.totalLots > 0)
                                    .map((analysis) => (
                                        <tr key={analysis.symbol} className="hover:bg-gray-200">
                                            <td className="sticky left-0 z-10 bg-white hover:bg-gray-200 px-1 py-1 whitespace-nowrap text-sm font-medium text-blue-600 border-r border-gray-200">
                                                <a href={`/symbol/${analysis.symbol}`} className="hover:text-blue-800">
                                                    {analysis.symbol}
                                                    <FinancialLinks security={analysis.symbol} className="ml-2" />
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
                                        %
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">No option transactions found.</p>
                )}
            </div>
        </div>
    );
}
