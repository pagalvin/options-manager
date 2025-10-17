export interface RollStrikeOption {
  strike: number;
  bid: number | null;
  ask: number | null;
  openInterest: number | null;
}

export interface SuggestedRollStrike {
  strike: number;
  margin: number;
  bid: number;
  ask: number;
  openInterest: number | null;
  netCredit: number;
  spread: number;
}

const isPositiveNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normalizeQuote = (value: number | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function getSuggestedRollStrike(
  currentStrike: number,
  currentBasis: number,
  buyToCloseCost: number,
  optionChain: RollStrikeOption[],
): SuggestedRollStrike | null {
  if (!isPositiveNumber(currentStrike) || !isPositiveNumber(currentBasis) || !isPositiveNumber(buyToCloseCost)) {
    return null;
  }

  const candidates = optionChain
    .map(option => ({
      strike: normalizeQuote(option.strike) ?? null,
      bid: normalizeQuote(option.bid),
      ask: normalizeQuote(option.ask),
      openInterest: normalizeQuote(option.openInterest),
    }))
    .filter(option => option.strike !== null && (option.strike as number) > currentStrike + 1e-6)
    .map(option => {
      const bid = option.bid ?? 0;
      const ask = option.ask ?? option.bid ?? 0;
      const netCredit = bid - buyToCloseCost;
      const margin = currentBasis > 0 ? netCredit / currentBasis : 0;
      const spread = Math.max(ask - bid, 0);

      return {
        strike: option.strike as number,
        bid,
        ask,
        openInterest: option.openInterest ?? null,
        netCredit,
        margin,
        spread,
      };
    })
    .filter(option => option.netCredit > 0 && option.margin >= 0.01 && isPositiveNumber(option.bid));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.strike !== b.strike) {
      return b.strike - a.strike;
    }

    const spreadDiff = a.spread - b.spread;
    if (Math.abs(spreadDiff) > 1e-4) {
      return spreadDiff;
    }

    const openInterestA = a.openInterest ?? -Infinity;
    const openInterestB = b.openInterest ?? -Infinity;
    if (openInterestA !== openInterestB) {
      return openInterestB - openInterestA;
    }

    if (a.netCredit !== b.netCredit) {
      return b.netCredit - a.netCredit;
    }

    return 0;
  });

  const top = candidates[0];
  return {
    strike: top.strike,
    margin: top.margin,
    bid: top.bid,
    ask: top.ask,
    openInterest: top.openInterest,
    netCredit: top.netCredit,
    spread: top.spread,
  };
}
