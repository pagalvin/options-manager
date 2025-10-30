# Combined Monthly Performance — Implementation Instructions for an LLM

## Purpose
Provide a clear, unambiguous specification an LLM (or developer agent) can implement to compute the "Combined Monthly Performance" report used by this repository. The specification describes inputs, outputs, data sources, step-by-step formulas, SQL/pseudocode, validation checks, edge cases, and suggested tests.

Use this document as the single source-of-truth for implementing the report logic in code (backend service, SQL ETL, or data pipeline).

---

## Contract (brief)
- Inputs:
  - positions: array of option/stock position records for the target month and prior state when needed.
  - price_snapshots: time-series of stock prices and option mid/mark prices for relevant dates (opening/closing/mid-month etc.).
  - trades: transactions that modify positions (buys, sells, opens, closes, rolling events) with timestamps, sizes, and fees.
  - account-level metadata: margin settings, interest rates, commission model, currency, timezone.
  - month_range: start_date (inclusive) and end_date (inclusive) for the report month.
- Outputs:
  - combined_monthly_performance: top-level object containing monthly aggregates and per-symbol/per-strategy breakdowns.
  - diagnostics: array of warnings/errors detected during computation (missing prices, negative premiums, inconsistent trades).
- Success criteria:
  - All positions and trades within the month are accounted for.
  - Neutral, well-defined behavior for missing data (see Edge Cases).

---

## Data shapes (JSON schemas)
- Position record (minimal):
  - id: string
  - symbol: string
  - type: "stock" | "option"
  - option_root (when type=="option"): string
  - strike (number)
  - expiry (ISO date)
  - side: "long" | "short"
  - contracts: integer (positive for long, negative for short positions) — normalize sign consistently
  - avg_cost: number (per-share or per-contract unit)
  - opened_at: ISO datetime
  - closed_at?: ISO datetime

- Trade record (minimal):
  - id: string
  - timestamp: ISO datetime
  - symbol: string
  - type: "buy" | "sell" | "exercise" | "assignment" | "fee" | "dividend"
  - quantity: integer (positive means increase in holdings for buys/receives)
  - price: number
  - fee: number

- Price snapshot:
  - timestamp: ISO datetime
  - symbol: string
  - mid: number
  - bid?: number
  - ask?: number
  - open?: number
  - close?: number

- Output: CombinedMonthlyPerformance
  - month: "YYYY-MM"
  - total_premiums_collected: number
  - total_premiums_paid: number
  - net_premiums: number
  - realized_pnl: number
  - unrealized_pnl: number
  - commissions_and_fees: number
  - margin_interest: number
  - net_performance: number
  - per_symbol: { [symbol]: { premiums_collected, premiums_paid, realized_pnl, unrealized_pnl, net } }
  - notes: diagnostics

---

## High-level steps
1. Normalize input data: normalize quantities signs, unify timezone to UTC, ensure prices available for relevant timestamps.
2. Determine monthly window: monthly_start (00:00:00 local or UTC as defined) and monthly_end.
3. Filter trades/positions that intersect the month window.
4. Compute premiums:
   - Premiums collected: sum of proceeds from option sells opened during the month (credit inflows), minus commissions and fees associated with those trades.
   - Premiums paid: sum of cost for option buys opened during the month (debits), including commissions.
5. Compute realized P&L:
   - For any position closed during the month (closed_at within month), compute realized pnl = proceeds - cost basis - fees.
   - Include assignment/exercise as realized events with stock adjustments.
6. Compute unrealized P&L:
   - For positions still open at month end, compute mark-to-market unrealized pnl = (mark_price_end - avg_cost) * quantity * contract_multiplier (100 for options).
7. Compute commissions and fees: aggregate fees on trades in the month.
8. Compute margin interest: if applicable, calculate interest on negative cash or borrowed margin as per account policy.
9. Aggregate per-symbol and overall totals.
10. Validate totals and produce diagnostics.

---

## Detailed calculations and rules
- Unit conventions:
  - Option contracts refer to 1 contract = 100 underlying shares unless otherwise specified.
  - All monetary values in account currency. If multi-currency, convert to base currency with provided FX rates (not covered here; add conversion step if needed).

- Premiums collected and premiums paid:
  - For each trade where type is "sell" and the instrument is an option OPEN (i.e., increases short position or opens new short contract): add trade.price * abs(quantity) * contract_multiplier to premiums_collected; subtract trade.fee.
  - For each trade where type is "buy" and the instrument is an option OPEN (i.e., increases long position): add trade.price * abs(quantity) * contract_multiplier to premiums_paid; add trade.fee.
  - Distinguish open vs close by comparing trade quantity sign vs position change and trade context (if trade reduces position it's a close; if it increases position it's an open). Implementation detail: maintain running position per instrument across the month to detect open/close semantics.

- Realized P&L:
  - Use FIFO cost basis (default) for matching opens and closes unless repository uses another method. Matching algorithm:
    - Maintain a queue of lots (quantity, cost basis per unit, opened_at) per symbol.
    - When a close trade occurs, pop from queue proportionally and compute realized = (proceeds - cost_basis_of_matched) - fees.
  - For options assigned/exercised, treat resulting stock positions accordingly and compute realized on the assigned option and subsequent stock position as needed.

- Unrealized P&L at month-end:
  - For each open lot remaining at month end, unrealized = (mark_price_at_month_end - avg_cost) * open_quantity * contract_multiplier.
  - Use the best available mark: prefer an explicit close/mid snapshot at month_end. If only intraday snapshots exist, pick last snapshot <= month_end. If none, mark as null and include diagnostic.

- Net performance:
  - net_performance = net_premiums + realized_pnl + unrealized_pnl - commissions_and_fees - margin_interest
  - net_premiums = total_premiums_collected - total_premiums_paid

---

## Pseudocode / algorithm (imperative)

1. normalize_inputs(data):
   - convert timestamps to UTC
   - normalize sign conventions (shorts negative quantity, longs positive) or agree on a single model
   - ensure price snapshots are indexed by (symbol, date)

2. compute_monthly_report(month_start, month_end, trades, positions, prices, account):
   - init aggregates to zero
   - build per-symbol structures: lot queues, open_positions
   - sort trades by timestamp asc
   - for each trade t in trades where t.timestamp between month_start and month_end:
     - determine symbol, instrument type
     - if t.type in ("buy", "sell"):
         - is_open = determines if trade increased absolute position vs prior position
         - if instrument is option and is_open and t.type=="sell": premiums_collected += t.price * abs(t.quantity) * 100 - t.fee
         - if instrument is option and is_open and t.type=="buy": premiums_paid += t.price * abs(t.quantity) * 100 + t.fee
         - if trade closes existing lots: compute realized pnl by matching cost basis from lot queue
     - fees += t.fee

   - after applying all trades, compute unrealized for remaining lots using price at month_end
   - compute margin interest if applicable
   - compute totals and per-symbol breakdowns
   - run validation checks
   - return report

---

## SQL snippets (conceptual)
Note: these are conceptual queries — adapt to your schema. Replace table/column names as needed.

- premiums collected (concept):

SELECT
  SUM(t.price * ABS(t.quantity) * 100) AS premiums_collected,
  SUM(t.fee) AS fees
FROM trades t
JOIN instruments i ON t.instrument_id = i.id
WHERE i.type = 'option'
  AND t.side = 'sell'
  AND t.is_open = true
  AND t.timestamp BETWEEN @month_start AND @month_end;

- realized pnl (concept): requires lot matching — better implemented in procedural code or a windowed SQL with running sums.

---

## Edge cases and rules-of-thumb (explicit)
- Missing price at month-end: report null for unrealized pnl for that instrument; include diagnostic and optionally use last available price within N days as fallback (configurable).
- Partial fills: treat as separate lots with their own cost basis.
- Commissions/fees allocation: attach fee to the trade that generated it; when matching for realized pnl subtract fees proportionally to matched quantities.
- Exercises/assignments: treat option exercise as a trade that removes option lots and creates/adjusts stock lots; compute realized on option and adjust cost basis for resulting stock.
- Multiple currency: require FX conversion step before aggregation.
- Corporate actions (splits/dividends): apply corporate action adjustments to positions and historic lots before computing P&L.

---

## Validation checks and diagnostics (what to detect)
- Negative premiums_collected or premiums_paid that look incorrect (e.g., due to wrong sign conventions).
- Missing month-end price snapshots for open positions.
- Trade timestamps out of order relative to position history.
- Mismatched totals: total change in cash should equal realized_pnl + premiums_collected - premiums_paid - fees +/- margin changes (accounting verification row).
- Very large single trade relative to prior position (possible data error).

Each diagnostic must include: severity (info/warn/error), message, related entity (symbol/trade id), and suggested resolution.

---

## Tests and examples (recommended automated checks)
- Happy path: one short call sold at start of month, expired worthless at month end -> premiums_collected increases, realized_pnl = premiums_collected, unrealized_pnl = 0.
- Partial close: open 10 contracts, close 4 mid-month — verify realized equals close proceeds - matched cost basis.
- Missing price: open position and no month-end snapshot -> test the diagnostic is produced and unrealized is null.
- Fees handling: include a fee on an open and close trade and verify they are subtracted correctly from realized/unrealized totals.

Write unit tests that construct synthetic trades/positions and assert on each output field.

---

## Implementation notes for an LLM/developer agent
- Build small helper primitives and test them independently:
  - lot matching / FIFO queue logic
  - trade processing pipeline (applies one trade to current lots and aggregates)
  - price selection function (closest <= month_end or configurable fallback window)
  - aggregation/roll-up functions
- Prefer implementing realized-PnL matching in procedural code (JavaScript/TypeScript/Python) rather than pure SQL unless you have a robust windowed-lot matching SQL approach.
- Keep monetary rounding consistent: use fixed decimal (2 or account-specific precision) and avoid floating point surprises.
- Expose configuration options: contract_multiplier (default 100), cost_basis_method (fifo|lifo|avg), price_fallback_days (0 by default), timezone.

---

## Example minimal pseudocode for lot matching (FIFO)

function match_lots_on_close(lot_queue, close_quantity, close_price, fee) {
  let remaining = close_quantity;
  let realized = 0;
  while (remaining > 0 && lot_queue not empty) {
    let lot = lot_queue.peek();
    let matched = min(remaining, lot.quantity);
    let proceeds = close_price * matched * multiplier;
    let cost = lot.cost_per_unit * matched * multiplier;
    realized += proceeds - cost;
    lot.quantity -= matched;
    remaining -= matched;
    if (lot.quantity == 0) lot_queue.pop();
  }
  realized -= fee; // allocate fee wholly or proportionally
  if (remaining > 0) produce diagnostic: closing more than exists
  return realized;
}

---

## Suggested output file and placement
- Save this document as `docs/Combined_Monthly_Performance.md` in the repository root.
- When implementing, add a `spec` or `tests` folder with synthetic fixtures that mirror the JSON shapes here.

---

## Next steps for the implementer
1. Implement helper primitives (lot matching, price selector).
2. Implement trade processor and incremental aggregator (unit tested).
3. Implement monthly orchestration that: loads trades, loads positions at month start, processes events in time order, computes month-end marks, then aggregates.
4. Add validation checks and diagnostics.
5. Add unit/integration tests using the test cases above.

---

## Notes / Rationale
This specification favors clarity and conservative defaults (FIFO, strict month-end mark requirement). For production, expose the variant options (cost-basis method, fallback pricing) as configuration.

---

## Contact
If anything in this specification is unclear, look at the repository docs that cover premiums and margin logic such as `MONTHLY_NET_PREMIUM_CALCULATION.md`, `MONTHLY_NET_PREMIUM_CALCULATION.md` (if present), and the `backend` service code handling trades and snapshots.


