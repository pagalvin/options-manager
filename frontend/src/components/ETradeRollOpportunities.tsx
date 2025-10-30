import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Clock, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { ETradeConnectivityBanner } from './ETradeConnectivityBanner';
import transactionsService, { Transaction } from '@/services/transactionsService';
import { calculateOpenOptions } from '@/lib/utils';
import { getSuggestedRollStrike, SuggestedRollStrike, RollStrikeOption } from '@/helpers/getSuggestedRollStrike';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ROLL_STEP_DAYS = 7;
const ROLL_MAX_WEEKS = 5;
const MAX_FETCH_RETRIES = 4;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 4000;
const INTER_CANDIDATE_DELAY_MS = 250;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const numericSeconds = Number(value);
  if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
    return numericSeconds * 1000;
  }
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    const diff = parsedDate.getTime() - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
};

interface AccountInfo {
  accountIdKey: string;
  accountName: string;
}

interface PortfolioPosition {
  positionId: number;
  quantity: number;
  positionType?: string;
  symbolDescription?: string;
  Product?: {
    symbol?: string;
    securityType?: string;
    callPut?: string;
    strikePrice?: number;
    expiryYear?: number;
    expiryMonth?: number;
    expiryDay?: number;
  };
}

type AccountPortfolio = {
  Position?: PortfolioPosition[];
  position?: PortfolioPosition[];
};

interface PortfolioResponse {
  PortfolioResponse?: {
    AccountPortfolio?: AccountPortfolio[];
  };
  accountPortfolio?: AccountPortfolio[];
}

interface ManualOptionsAnalysisEntry {
  security: string;
  next_earnings_date?: string | null;
}

interface EarningsInfo {
  nextEarningsDate: string | null;
  daysToEarnings: number | null;
}

interface BasisInfo {
  originalBasis: number | null;
  currentBasis: number | null;
}

type RawOptionPosition = {
  position: PortfolioPosition;
  account: AccountInfo;
  expirationDate: Date | null;
};

interface RollCandidate {
  id: string;
  symbol: string;
  accountName: string;
  strikePrice: number | null;
  expirationDate: Date | null;
  daysToExpiration: number | null;
  quantity: number;
  originalBasis: number | null;
  currentBasis: number | null;
  minimumRollStrike: number | null;
  nextEarningsDate: string | null;
  daysToEarnings: number | null;
  suggestedRoll?: RollSuggestion | null;
  suggestionError?: string | null;
}

interface ExpirationDate {
  year: number;
  month: number;
  day: number;
  expiryType?: string;
}

interface RollSuggestion extends SuggestedRollStrike {
  expirationDate: Date;
}

interface TargetExpirationSelection {
  expiration: ExpirationDate;
  date: Date;
  daysOut: number;
}

interface CandidateGroup {
  key: string;
  label: string;
  subtitle: string;
  dateValue: number | null;
  rows: RollCandidate[];
}

const extractPositions = (response: PortfolioResponse): PortfolioPosition[] => {
  const accountPortfolios = response?.PortfolioResponse?.AccountPortfolio ?? response?.accountPortfolio ?? [];
  return accountPortfolios.flatMap(portfolio => portfolio.Position ?? portfolio.position ?? []);
};

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toExpirationDate = (position: PortfolioPosition): Date | null => {
  const year = position.Product?.expiryYear;
  const month = position.Product?.expiryMonth;
  const day = position.Product?.expiryDay;

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const calculateDaysTo = (dateString: string | null | undefined): number | null => {
  if (!dateString) {
    return null;
  }
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY);
};

const isReasonableRoll = (expirationDate: Date | null): boolean => {
  if (!expirationDate) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rollExpiration = addDays(expirationDate, ROLL_STEP_DAYS);
  const cutoff = addDays(today, ROLL_MAX_WEEKS * 7);
  
  const result = rollExpiration <= cutoff;
  
  // Log for debugging
  if (!result) {
    console.log(`isReasonableRoll=false: expiration=${expirationDate.toISOString().split('T')[0]}, rollExpiration=${rollExpiration.toISOString().split('T')[0]}, cutoff=${cutoff.toISOString().split('T')[0]}`);
  }

  // Future rule expansion goes here – add additional filters without touching the core predicate above.
  return result;
};

const formatCurrency = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const formatDate = (date: Date | null): string => {
  if (!date) {
    return 'N/A';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatEarningsDisplay = (dateString: string | null, daysTo: number | null): string => {
  if (!dateString) {
    return 'N/A';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  if (daysTo === null) {
    return formatted;
  }
  return `${formatted} (${daysTo}d)`;
};

const roundUpToCents = (value: number): number => Math.ceil(value * 100) / 100;

const fetchEarningsMap = async (symbols: string[]): Promise<Record<string, EarningsInfo>> => {
  const result: Record<string, EarningsInfo> = {};
  if (symbols.length === 0) {
    return result;
  }

  try {
    const response = await fetch('/api/manual-options-analysis');
    if (!response.ok) {
      throw new Error(`Failed to load manual options analysis: ${response.status}`);
    }

    const entries: ManualOptionsAnalysisEntry[] = await response.json();
    const symbolSet = new Set(symbols);

    entries.forEach(entry => {
      const rawSymbol = entry.security?.toUpperCase();
      if (!rawSymbol || !symbolSet.has(rawSymbol)) {
        return;
      }

      const daysTo = calculateDaysTo(entry.next_earnings_date ?? null);
      const existing = result[rawSymbol];
      if (!existing) {
        result[rawSymbol] = {
          nextEarningsDate: entry.next_earnings_date ?? null,
          daysToEarnings: daysTo,
        };
        return;
      }

      if (existing.nextEarningsDate && entry.next_earnings_date) {
        const existingDate = new Date(existing.nextEarningsDate);
        const candidateDate = new Date(entry.next_earnings_date);
        if (candidateDate < existingDate) {
          result[rawSymbol] = {
            nextEarningsDate: entry.next_earnings_date,
            daysToEarnings: daysTo,
          };
        }
        return;
      }

      if (!existing.nextEarningsDate && entry.next_earnings_date) {
        result[rawSymbol] = {
          nextEarningsDate: entry.next_earnings_date,
          daysToEarnings: daysTo,
        };
      }
    });
  } catch (error) {
    console.error('Error fetching earnings data for roll planner:', error);
  }

  return result;
};

const buildBasisMap = async (symbols: string[]): Promise<Record<string, BasisInfo>> => {
  const result: Record<string, BasisInfo> = {};
  if (symbols.length === 0) {
    return result;
  }

  try {
    const transactions = await transactionsService.fetchAllTransactions();
    const symbolSet = new Set(symbols);
    const grouped = new Map<string, Transaction[]>();

    transactions.forEach(tx => {
      const rawSymbol = tx.calculated_symbol?.toUpperCase();
      if (!rawSymbol || !symbolSet.has(rawSymbol)) {
        return;
      }
      if (!grouped.has(rawSymbol)) {
        grouped.set(rawSymbol, []);
      }
      grouped.get(rawSymbol)!.push(tx);
    });

    symbolSet.forEach(symbol => {
      const symbolTransactions = grouped.get(symbol) ?? [];
      if (symbolTransactions.length === 0) {
        result[symbol] = { originalBasis: null, currentBasis: null };
        return;
      }

      let netPremium = 0;
      let totalInvestments = 0;
      let totalSales = 0;

      symbolTransactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        const type = (tx.transaction_type || '').toUpperCase();
        if (tx.security_type === 'OPTN') {
          netPremium += amount;
        } else if (tx.security_type === 'EQ') {
          if (type === 'BOUGHT') {
            totalInvestments += Math.abs(amount);
          } else if (type === 'SOLD') {
            totalSales += Math.abs(amount);
          }
        }
      });

      const openLots = calculateOpenOptions(symbolTransactions as Transaction[], symbol);
      const lotShares = openLots * 100;
      const currentExposure = totalInvestments - totalSales;

      const originalBasis = lotShares > 0 ? currentExposure / lotShares : null;
      const currentBasis = lotShares > 0 ? (currentExposure - netPremium) / lotShares : originalBasis;

      result[symbol] = {
        originalBasis: isFiniteNumber(originalBasis) ? originalBasis : null,
        currentBasis: isFiniteNumber(currentBasis) ? currentBasis : null,
      };
    });
  } catch (error) {
    console.error('Error calculating basis data for roll planner:', error);
  }

  return result;
};

interface ETradeRollOpportunitiesProps {
  sessionId: string;
}

export const ETradeRollOpportunities: React.FC<ETradeRollOpportunitiesProps> = ({ sessionId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RollCandidate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const enrichCandidatesWithSuggestions = useCallback(async (baseRows: RollCandidate[]): Promise<RollCandidate[]> => {
    if (baseRows.length === 0) {
      return baseRows;
    }

    if (!sessionId) {
      return baseRows.map(row => ({
        ...row,
        suggestedRoll: null,
        suggestionError: 'Authentication required for roll guidance',
      }));
    }

    const expirationCache = new Map<string, ExpirationDate[]>();
    const chainCache = new Map<string, RollStrikeOption[]>();

    const fetchWithRetry = async (url: string, label: string, init?: RequestInit): Promise<Response> => {
      let delay = INITIAL_RETRY_DELAY_MS;
      let lastResponse: Response | null = null;

      for (let attempt = 1; attempt <= MAX_FETCH_RETRIES; attempt++) {
        const response = await fetch(url, init);

        if (response.status !== 429) {
          return response;
        }

        lastResponse = response;

        if (attempt === MAX_FETCH_RETRIES) {
          return response;
        }

        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = parseRetryAfter(retryAfterHeader);
        const waitMs = Math.min(retryAfterMs ?? delay, MAX_RETRY_DELAY_MS);

        console.warn(`Roll planner ${label} request hit rate limit (429). Retrying in ${waitMs}ms.`);
        await sleep(waitMs);

        delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
      }

      if (lastResponse) {
        return lastResponse;
      }

      throw new Error(`Unable to execute ${label} request`);
    };

    const parseNumber = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const parseOptionChainCalls = (data: unknown): RollStrikeOption[] => {
      // Unwrap OptionChainResponse if present
      const chainData = (data as any)?.OptionChainResponse ?? data;
      
      const optionPairs = Array.isArray(chainData?.optionPairs)
        ? chainData.optionPairs
        : Array.isArray(chainData?.OptionPair)
          ? chainData.OptionPair
          : [];

      return optionPairs
        .map((pair: any) => pair?.Call ?? pair?.call)
        .filter((call: unknown): call is Record<string, unknown> => Boolean(call))
        .map((call: Record<string, unknown>): RollStrikeOption | null => {
          const strike = parseNumber((call as any)?.strikePrice);
          if (strike === null) {
            return null;
          }
          return {
            strike,
            bid: parseNumber((call as any)?.bid),
            ask: parseNumber((call as any)?.ask),
            openInterest: parseNumber((call as any)?.openInterest),
          };
        })
  .filter((option: RollStrikeOption | null): option is RollStrikeOption => option !== null);
    };

    const fetchExpirations = async (symbol: string): Promise<ExpirationDate[]> => {
      if (expirationCache.has(symbol)) {
        return expirationCache.get(symbol)!;
      }

      const expirationUrl = `/api/etrade/options/${encodeURIComponent(symbol)}/expirations?expiryType=ALL`;
      const response = await fetchWithRetry(expirationUrl, `expirations:${symbol}`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (response.status === 429) {
        throw new Error('Rate limited fetching expirations');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch expirations (${response.status})`);
      }

      const payload = await response.json();
      const rawDates = Array.isArray(payload?.expirationDates) ? payload.expirationDates : [];

      const normalized = rawDates
        .map((entry: any): ExpirationDate | null => {
          const year = parseNumber(entry?.year);
          const month = parseNumber(entry?.month);
          const day = parseNumber(entry?.day);
          if (year === null || month === null || day === null) {
            return null;
          }
          return {
            year,
            month,
            day,
            expiryType: typeof entry?.expiryType === 'string' ? entry.expiryType : undefined,
          };
        })
  .filter((entry: ExpirationDate | null): entry is ExpirationDate => entry !== null);

      expirationCache.set(symbol, normalized);
      return normalized;
    };

    const fetchChain = async (symbol: string, expiration: ExpirationDate): Promise<RollStrikeOption[]> => {
      const key = `${symbol}-${expiration.year}-${expiration.month}-${expiration.day}`;
      if (chainCache.has(key)) {
        return chainCache.get(key)!;
      }

      const params = new URLSearchParams({
        expiryYear: String(expiration.year),
        expiryMonth: String(expiration.month),
        expiryDay: String(expiration.day),
      });

      const chainUrl = `/api/etrade/options/${encodeURIComponent(symbol)}?${params.toString()}`;
      const response = await fetchWithRetry(chainUrl, `chain:${symbol}`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (response.status === 429) {
        throw new Error('Rate limited fetching option chain');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch option chain (${response.status})`);
      }

      const payload = await response.json();
      const options = parseOptionChainCalls(payload);
      chainCache.set(key, options);
      return options;
    };

    const selectTargetExpiration = (expirations: ExpirationDate[], currentExpiration: Date | null): TargetExpirationSelection | null => {
      if (expirations.length === 0) {
        return null;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const normalizedCurrent = currentExpiration ? new Date(currentExpiration) : null;
      if (normalizedCurrent) {
        normalizedCurrent.setHours(0, 0, 0, 0);
      }

      // Calculate days from current expiration (for rolling), not from today
      const referenceDate = normalizedCurrent || today;

      const enriched = expirations
        .map(exp => {
          const date = new Date(exp.year, exp.month - 1, exp.day);
          date.setHours(0, 0, 0, 0);
          const daysOut = Math.ceil((date.getTime() - today.getTime()) / MS_PER_DAY);
          const daysFromCurrent = Math.ceil((date.getTime() - referenceDate.getTime()) / MS_PER_DAY);
          return {
            expiration: exp,
            date,
            daysOut,
            daysFromCurrent,
          };
        })
        .filter(item => item.daysOut > 0 && (!normalizedCurrent || item.date.getTime() > normalizedCurrent.getTime()));

      if (enriched.length === 0) {
        return null;
      }

      // Look for expirations 7-10 days after the current expiration
      const windowMatches = enriched.filter(item => item.daysFromCurrent >= 7 && item.daysFromCurrent <= 10);
      if (windowMatches.length > 0) {
        const sortedWindow = [...windowMatches].sort((a, b) => a.daysFromCurrent - b.daysFromCurrent);
        return {
          expiration: sortedWindow[0].expiration,
          date: sortedWindow[0].date,
          daysOut: sortedWindow[0].daysOut,
        };
      }

      // If no 7-10 day window, take the nearest future expiration
      const sortedAll = [...enriched].sort((a, b) => a.daysFromCurrent - b.daysFromCurrent);
      return {
        expiration: sortedAll[0].expiration,
        date: sortedAll[0].date,
        daysOut: sortedAll[0].daysOut,
      };
    };

    const processCandidate = async (candidate: RollCandidate): Promise<RollCandidate> => {
      const baseResult: RollCandidate = {
        ...candidate,
        suggestedRoll: null,
        suggestionError: null,
      };

      const strike = candidate.strikePrice;
      const basis = isFiniteNumber(candidate.currentBasis)
        ? candidate.currentBasis
        : isFiniteNumber(candidate.originalBasis)
          ? candidate.originalBasis
          : null;

      if (!isFiniteNumber(strike) || !isFiniteNumber(basis) || basis <= 0 || !candidate.expirationDate) {
        return {
          ...baseResult,
          suggestionError: 'Insufficient basis data',
        };
      }

      try {
        const currentExpiration: ExpirationDate = {
          year: candidate.expirationDate.getFullYear(),
          month: candidate.expirationDate.getMonth() + 1,
          day: candidate.expirationDate.getDate(),
        };

        const currentChain = await fetchChain(candidate.symbol, currentExpiration);
        const matchingOption = currentChain.find(option => Math.abs(option.strike - strike) < 1e-3);

        let buyToCloseCost = matchingOption && isFiniteNumber(matchingOption.ask)
          ? matchingOption.ask
          : matchingOption && isFiniteNumber(matchingOption.bid)
            ? matchingOption.bid
            : null;

        // If we can't get a price for the current leg, use a nominal value
        // This is common for options very close to expiration that are OTM
        if (!isFiniteNumber(buyToCloseCost) || buyToCloseCost <= 0) {
          console.log(`No market price for ${candidate.symbol} strike ${strike} - using nominal $0.01`);
          buyToCloseCost = 0.01;
        }

        const expirations = await fetchExpirations(candidate.symbol);
        console.log(`${candidate.symbol}: Found ${expirations.length} expirations`);
        const target = selectTargetExpiration(expirations, candidate.expirationDate);

        if (!target) {
          console.log(`${candidate.symbol}: No suitable target expiration found`);
          return {
            ...baseResult,
            suggestionError: 'No expiration 7-10 days out',
          };
        }

        const daysFromCurrent = candidate.expirationDate 
          ? Math.ceil((target.date.getTime() - candidate.expirationDate.getTime()) / MS_PER_DAY)
          : target.daysOut;
        console.log(`${candidate.symbol}: Target expiration ${target.date.toISOString().split('T')[0]} (${daysFromCurrent} days from current expiration)`);
        const targetChain = await fetchChain(candidate.symbol, target.expiration);
        console.log(`${candidate.symbol}: Target chain has ${targetChain.length} call options`);
        if (targetChain.length === 0) {
          return {
            ...baseResult,
            suggestionError: 'No quotes for target week',
          };
        }

        const suggestionCore = getSuggestedRollStrike(strike, basis, buyToCloseCost, targetChain);

        if (!suggestionCore) {
          return {
            ...baseResult,
            suggestionError: 'No strikes meet 1% margin',
          };
        }

        return {
          ...baseResult,
          suggestedRoll: {
            ...suggestionCore,
            expirationDate: target.date,
          },
        };
      } catch (caughtError) {
        console.error(`Error evaluating roll suggestion for ${candidate.symbol}:`, caughtError);
        return {
          ...baseResult,
          suggestionError: caughtError instanceof Error ? caughtError.message : 'Failed to evaluate roll',
        };
      }
    };

    const results: RollCandidate[] = [];
    for (let idx = 0; idx < baseRows.length; idx += 1) {
      const candidate = baseRows[idx];
      const enriched = await processCandidate(candidate);
      results.push(enriched);

      if (idx < baseRows.length - 1) {
        await sleep(INTER_CANDIDATE_DELAY_MS);
      }
    }

    return results;
  }, [sessionId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accountResponse = await fetch('/api/etrade/accounts', {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!accountResponse.ok) {
        throw new Error(`Failed to load accounts: ${accountResponse.status}`);
      }

      const accounts: AccountInfo[] = await accountResponse.json();
      if (accounts.length === 0) {
        setCandidates([]);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      const optionPositions: RawOptionPosition[] = [];

      await Promise.all(
        accounts.map(async account => {
          const portfolioResponse = await fetch(`/api/etrade/accounts/${account.accountIdKey}/portfolio?view=QUICK&totalsRequired=false`, {
            headers: {
              'X-Session-ID': sessionId,
            },
          });

          if (!portfolioResponse.ok) {
            throw new Error(`Failed to load portfolio for ${account.accountName}: ${portfolioResponse.status}`);
          }

          const data: PortfolioResponse = await portfolioResponse.json();
          const positions = extractPositions(data);

          positions.forEach(position => {
            const product = position.Product;
            if (!product) {
              return;
            }

            const isOption = product.securityType === 'OPTN';
            const isCall = product.callPut?.toUpperCase() === 'CALL';
            const isShort = (position.positionType || '').toUpperCase() === 'SHORT';
            const quantity = Math.abs(position.quantity ?? 0);

            if (!isOption || !isCall || !isShort || quantity === 0) {
              return;
            }

            const expirationDate = toExpirationDate(position);
            const symbol = product.symbol?.toUpperCase() ?? 'UNKNOWN';
            const reasonable = isReasonableRoll(expirationDate);
            console.log(`Position ${symbol}: expiration=${expirationDate?.toISOString().split('T')[0]}, isReasonableRoll=${reasonable}`);
            
            if (!reasonable) {
              return;
            }

            optionPositions.push({
              position,
              account,
              expirationDate,
            });
          });
        })
      );

      if (optionPositions.length === 0) {
        setCandidates([]);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      const symbols = Array.from(
        new Set(
          optionPositions
            .map(item => item.position.Product?.symbol?.toUpperCase() ?? '')
            .filter(Boolean)
        )
      ).sort();

      const [earningsMap, basisMap] = await Promise.all([
        fetchEarningsMap(symbols),
        buildBasisMap(symbols),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rows = optionPositions
        .map<RollCandidate | null>((item, idx) => {
          const product = item.position.Product;
          const rawSymbol = product?.symbol?.toUpperCase();
          if (!rawSymbol) {
            return null;
          }

          const basis = basisMap[rawSymbol];
          const earnings = earningsMap[rawSymbol];
          const strike = product?.strikePrice ?? null;
          const quantity = Math.abs(item.position.quantity ?? 0);

          const daysToExpiration = item.expirationDate
            ? Math.max(0, Math.ceil((item.expirationDate.getTime() - today.getTime()) / MS_PER_DAY))
            : null;

          const basisForRoll = basis?.currentBasis && basis.currentBasis > 0
            ? basis.currentBasis
            : basis?.originalBasis ?? null;

          const minimumRollStrike = basisForRoll && basisForRoll > 0
            ? roundUpToCents(basisForRoll * 1.01)
            : null;

          return {
            id: item.position.positionId ? `${item.account.accountIdKey}-${item.position.positionId}` : `${rawSymbol}-${idx}`,
            symbol: rawSymbol,
            accountName: item.account.accountName,
            strikePrice: strike ?? null,
            expirationDate: item.expirationDate,
            daysToExpiration,
            quantity,
            originalBasis: basis?.originalBasis ?? null,
            currentBasis: basis?.currentBasis ?? null,
            minimumRollStrike,
            nextEarningsDate: earnings?.nextEarningsDate ?? null,
            daysToEarnings: earnings?.daysToEarnings ?? null,
          };
        })
        .filter((candidate): candidate is RollCandidate => candidate !== null)
        .sort((a, b) => {
          if (a.daysToExpiration === null && b.daysToExpiration === null) {
            return a.symbol.localeCompare(b.symbol);
          }
          if (a.daysToExpiration === null) {
            return 1;
          }
          if (b.daysToExpiration === null) {
            return -1;
          }
          if (a.daysToExpiration !== b.daysToExpiration) {
            return a.daysToExpiration - b.daysToExpiration;
          }
          return a.symbol.localeCompare(b.symbol);
        });

      let finalRows = rows;
      try {
        finalRows = await enrichCandidatesWithSuggestions(rows);
      } catch (suggestionError) {
        console.error('Error enriching roll suggestions:', suggestionError);
        finalRows = rows.map(candidate => ({
          ...candidate,
          suggestedRoll: null,
          suggestionError: 'Unable to evaluate roll suggestions',
        }));
      }

      setCandidates(finalRows);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading roll planner data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load E*TRADE roll data');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, enrichCandidatesWithSuggestions]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    loadData();
  }, [sessionId, loadData]);

  const groupedCandidates = useMemo<CandidateGroup[]>(() => {
    if (candidates.length === 0) {
      return [];
    }

    const groups = new Map<string, { dateValue: number | null; rows: RollCandidate[] }>();

    candidates.forEach(candidate => {
      const dateValue = candidate.expirationDate ? candidate.expirationDate.getTime() : null;
      const key = dateValue !== null ? `date-${dateValue}` : 'unknown';

      if (!groups.has(key)) {
        groups.set(key, { dateValue, rows: [] });
      }

      groups.get(key)!.rows.push(candidate);
    });

    const sortedGroups = Array.from(groups.entries())
      .map(([key, value]) => {
        const rows = [...value.rows].sort((a, b) => {
          if (a.symbol !== b.symbol) {
            return a.symbol.localeCompare(b.symbol);
          }
          if (a.accountName !== b.accountName) {
            return a.accountName.localeCompare(b.accountName);
          }
          const strikeA = a.strikePrice ?? 0;
          const strikeB = b.strikePrice ?? 0;
          return strikeA - strikeB;
        });

        const reference = rows[0];
        const hasDate = value.dateValue !== null && reference.expirationDate;
        const label = hasDate && reference.expirationDate
          ? `Expiration ${formatDate(reference.expirationDate)}`
          : 'Expiration date unavailable';

        const daysLabel = typeof reference?.daysToExpiration === 'number'
          ? `${reference.daysToExpiration}d remaining`
          : 'Days remaining unknown';

        const positionLabel = rows.length === 1 ? 'position' : 'positions';
        const subtitle = `${rows.length} ${positionLabel} • ${daysLabel}`;

        return {
          key,
          label,
          subtitle,
          dateValue: value.dateValue,
          rows,
        };
      })
      .sort((a, b) => {
        if (a.dateValue === null && b.dateValue === null) {
          return a.label.localeCompare(b.label);
        }
        if (a.dateValue === null) {
          return 1;
        }
        if (b.dateValue === null) {
          return -1;
        }
        return a.dateValue - b.dateValue;
      });

    return sortedGroups;
  }, [candidates]);

  return (
    <div className="space-y-4">
      <ETradeConnectivityBanner className="mb-2" />

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Roll Planner</h2>
            <p className="text-sm text-gray-600">
              Short call positions eligible for a one-week roll with at least 1% net profit margin.
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2 mb-4">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading && candidates.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <RefreshCw className="animate-spin mr-2" size={20} />
            Loading roll candidates...
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-blue-700">
            <h3 className="font-semibold mb-2">No roll candidates found</h3>
            <p className="text-sm">
              There are currently no short call positions that meet the roll criteria. Check back after updating your
              positions or as expirations draw closer.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedCandidates.map(group => (
              <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <CalendarDays size={16} className="text-gray-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.label}</p>
                      <p className="text-xs text-gray-500">{group.subtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Strike</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Original Basis</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Basis</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Roll Strike</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Roll</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Earnings</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Contracts</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {group.rows.map(candidate => (
                        <tr key={candidate.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            <div className="flex flex-col">
                              <span>{candidate.symbol}</span>
                              {candidate.daysToExpiration !== null && (
                                <span className="text-xs text-gray-500">{candidate.daysToExpiration}d remaining</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {candidate.strikePrice !== null ? formatCurrency(candidate.strikePrice) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(candidate.originalBasis)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(candidate.currentBasis)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Target size={14} className="text-green-600" />
                              <span>
                                {candidate.minimumRollStrike !== null
                                  ? formatCurrency(candidate.minimumRollStrike)
                                  : 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {candidate.suggestedRoll ? (
                              <div className="flex flex-col items-end space-y-1">
                                <div className="flex items-center space-x-1">
                                  <TrendingUp size={14} className="text-blue-600" />
                                  <span className="font-semibold text-blue-700">
                                    {formatCurrency(candidate.suggestedRoll.strike)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(candidate.suggestedRoll.expirationDate)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Margin {formatPercent(candidate.suggestedRoll.margin)} • Net{' '}
                                  {formatCurrency(candidate.suggestedRoll.netCredit)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Bid/Ask {formatCurrency(candidate.suggestedRoll.bid)} /{' '}
                                  {formatCurrency(candidate.suggestedRoll.ask)}
                                  {candidate.suggestedRoll.openInterest !== null && (
                                    <span>
                                      {' '}• OI{' '}
                                      {Math.round(candidate.suggestedRoll.openInterest).toLocaleString('en-US')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : candidate.suggestionError ? (
                              <span className="text-xs text-red-600">{candidate.suggestionError}</span>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Clock size={14} className="text-gray-500" />
                              <span>{formatEarningsDisplay(candidate.nextEarningsDate, candidate.daysToEarnings)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{candidate.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{candidate.accountName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
