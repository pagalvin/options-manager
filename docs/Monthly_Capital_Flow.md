# Monthly Capital Flow — Implementation Instructions for an LLM

## Purpose
This document specifies how to compute the Monthly Capital Flow data and graph. It is written so an LLM or developer agent can implement the logic in a backend service, ETL, or analytics pipeline. The goal is to produce a per-month (and per-day, optional) breakdown of cash inflows and outflows, cumulative cash balance movement, and categorized contributions (premiums, fees, margin transfers, dividends, realized P&L, interest, etc.) suitable for plotting a "Monthly Capital Flow" graph.

---

## Contract (brief)
- Inputs:
  - trades: list of executed transactions (buys, sells, opens, closes, assignments, exercises, fees, dividends) with timestamps, amounts, fees.
  - cash_ledger (optional): ledger of cash movements, deposits/withdrawals, margin transfers, interest postings, and fee entries. If not present, cash movements inferred from trades.
  - positions (optional): positions snapshots for validating settlement adjustments.
  - fx_rates (optional): for multi-currency accounts to convert to base currency.
  - date_range: month (start_date, end_date) or full series to compute multiple months.
- Outputs:
  - monthly_capital_flow: object containing per-month aggregates and per-day timeseries (optional) used to render graph.
  - categories: mapping of capital categories to amounts for each month.
  - cumulative_balance: month-by-month ending cash balance (or daily series if requested).
  - diagnostics: warnings and errors detected.
- Success criteria:
  - Cash inflows and outflows for the month reconcile to ledger/trades.
  - Graphable timeseries produced with clear category breakdown.

---

## Data shapes (JSON)
- Trade record (minimal):
  - id: string
  - timestamp: ISO datetime
  - symbol: string
  - instrument_type: "stock" | "option" | "cash"
  - action: "buy" | "sell" | "fee" | "dividend" | "deposit" | "withdrawal" | "interest" | "assignment" | "exercise" | "transfer"
  - quantity: integer
  - price: number
  - proceeds: number  // price * quantity * multiplier (positive for inflow to account, negative for outflow)
  - fee: number
  - settled_at?: ISO date // the date cash actually settled
  - currency?: string

- Cash ledger entry:
  - id: string
  - timestamp: ISO datetime
  - amount: number (positive inflow, negative outflow)
  - category: string (one of categories below or custom)
  - reference_id?: string (trade id or external tx id)

- MonthlyCapitalFlow output:
  - month: "YYYY-MM"
  - categories: { premiums_received, premiums_paid, realized_pnl, unrealized_pnl_delta, commissions_fees, deposits, withdrawals, margin_transfers_in, margin_transfers_out, dividends, interest, other }
  - total_inflow: number
  - total_outflow: number
  - net_flow: number (inflow - outflow)
  - starting_cash_balance: number (optional)
  - ending_cash_balance: number
  - cumulative_balance_series: optional array of { date, balance }
  - notes: diagnostics array

---

## Categories and definitions
- Premiums received: cash credits from option sells (open credits or closed positions that produce net inflow). Include option sell proceeds (not including fees), posted on settlement.
- Premiums paid: cash debits for option buys (open buys or closed buys that cost cash). Include option buy proceeds (not including fees).
- Realized P&L: net cash realized from closing positions (sell - cost basis) recognized when closed and cash settled.
- Unrealized P&L delta: optional category representing change in mark-to-market unrealized P&L between month start and end. Note: unrealized changes are not cash movements but useful for analysis; include separately and mark as non-cash.
- Commissions & fees: cash debits for commissions and transaction fees.
- Deposits: customer cash deposits (increasing cash balance).
- Withdrawals: customer cash withdrawals (decreasing cash balance).
- Margin transfers in/out: internal transfers that affect margin account cash but are not trade proceeds (e.g., moving cash between accounts).
- Dividends: cash credits for dividends paid into the account.
- Interest: both earned interest and margin interest debits (separate sub-categories recommended).
- Other: any cash movements that do not match categories above.

---

## High-level algorithm
1. Normalize timestamps and currencies.
2. Choose source of truth for cash movements: prefer explicit `cash_ledger` if available; otherwise infer cash movements from `trades`.
3. For the specified month, collect all cash events that settled in the month (use `settled_at` when available; otherwise use trade timestamp if settlement not modeled).
4. Map each cash event to one of the categories using deterministic rules (see mapping rules below).
5. Sum inflows and outflows per category for the month.
6. Produce timeseries for per-day balances and cumulative ending balance.
7. Run reconciliation checks vs opening/closing cash balances and produce diagnostics.

---

## Mapping rules (deterministic)
- If a `cash_ledger` entry exists, use its `category` explicitly when present.
- If inferring from `trades`:
  - Trade.action == 'deposit' -> Deposits
  - Trade.action == 'withdrawal' -> Withdrawals
  - Trade.action == 'fee' or trade.fee > 0 -> Commissions & fees (associate fee amount)
  - instrument_type == 'option' and action == 'sell' and trade.is_open == true -> Premiums received (proceeds = price*quantity*multiplier)
  - instrument_type == 'option' and action == 'buy' and trade.is_open == true -> Premiums paid
  - instrument_type in ('stock','option') and action == 'sell' and is_close -> Realized P&L (proceeds - matched cost basis)
  - action == 'dividend' -> Dividends
  - action == 'interest' -> Interest
  - assignment/exercise -> treat option component's cash (option premium or assignment cash) and resulting stock transactions separately; any cash changes on settlement go to realized or other categories
  - transfer -> Margin transfers in/out depending on sign
- Settlement: if a trade has `settled_at`, attribute cash to that date; otherwise use timestamp.

---

## Detailed steps and pseudocode

1. normalize_inputs(trades, cash_ledger, fx_rates):
   - convert all timestamps to UTC
   - convert amounts to base currency using fx_rates if needed
   - ensure `proceeds` present on trades (compute from price * quantity * multiplier - fee)

2. determine_cash_events(month_start, month_end):
   - if cash_ledger exists: select ledger entries where timestamp (or settled_at) between month_start and month_end
   - else: for each trade with settlement in the month produce one or more cash events:
       - main proceeds (price * quantity * multiplier)
       - trade fees as separate ledger entry
       - exercise/assignment settlements

3. categorize_events(events):
   - for each event e:
       - if e.category present -> use it
       - else apply mapping rules based on e.action/instrument_type/reference
       - ensure category is one of allowed set, else mark as 'other'

4. aggregate_by_category(events):
   - for each category sum positive amounts as inflow, negative as outflow (or normalize sign rules: inflow positive)

5. compute_balance_series(starting_cash_balance, month_range, daily_events):
   - sort daily events by date
   - running_balance = starting_cash_balance
   - for each day: apply day's total events to running_balance; record daily balance
   - ending_cash_balance = running_balance

6. produce_monthly_output(month, aggregates, balances, diagnostics)

Pseudocode snippet:

function build_monthly_flow(month_start, month_end, trades, cash_ledger, starting_balance=null) {
  events = determine_cash_events(trades, cash_ledger, month_start, month_end)
  events = categorize_events(events)
  by_category = aggregate_by_category(events)
  daily_events = group_by_date(events)
  balance_series = compute_balance_series(starting_balance || infer_from_ledger_before(month_start), daily_events)
  return { month, categories: by_category, total_inflow, total_outflow, net_flow, starting_cash_balance, ending_cash_balance, cumulative_balance_series: balance_series }
}

---

## Treatment of special cases
- Settlement timing vs trade timestamp:
  - Prefer `settled_at` for cash attribution. If missing, use timestamp. Allow configuration to treat cash settled T+N for certain instruments.
- Margin interest and financing:
  - Margin interest postings should be explicit ledger entries. If not available, compute interest on average daily borrowed balance using the account's interest rate and record as 'interest' (debit).
- Margin transfers:
  - External transfers or internal transfers should be categorized as transfer in/out and labeled as non-trade cash movement.
- Realized vs unrealized P&L:
  - Realized P&L is cash-based and included in flow. Unrealized changes are non-cash; include optionally for analytic layering but do not treat as cash flow.
- Options assignment/exercise:
  - When an exercise/assignment produces cash movement (e.g., assignment of short put results in stock sale/purchase), record any cash settled separately and map to realized P&L or other as appropriate.
- Corporate actions and corporate dividends:
  - Dividends paid to account should appear as cash ledger events; map to Dividends. For corporate actions that change positions but not cash, record an informational diagnostic.

---

## Graphing data and UI considerations
- Primary chart types:
  - Stacked bar chart per month showing categories (premiums, fees, deposits, withdrawals, realized P&L, dividends, interest).
  - Line chart overlay for cumulative ending cash balance across months.
  - Optional daily series for intra-month zoom.
- Data format for charting (example JSON for a monthly stacked bar + line):
  {
    months: ["2025-01", "2025-02", ...],
    series: {
      premiums_received: [1000, 2000, ...],
      premiums_paid: [-200, -100, ...],
      realized_pnl: [150, -50, ...],
      fees: [-120, -80, ...],
      deposits: [5000, 0, ...],
      withdrawals: [-0, -2000, ...],
      dividends: [0, 10, ...],
      interest: [-5, -7, ...]
    },
    cumulative_balance: [12000, 13730, ...]
  }

- Labels and positive/negative conventions:
  - Use positive numbers for inflows and negative for outflows in the series values. For stacked bar visualization, convert to absolute values and show direction with color coding (green for inflows, red for outflows) where appropriate.

---

## Validation and diagnostics
- Reconciliation checks:
  - Sum of cash ledger entries for month == total_inflow - total_outflow (within tolerance) -> PASS/FAIL
  - Ending cash balance computed == starting_cash_balance + net_flow
- Diagnostics to emit:
  - Missing `settled_at` timestamps for trades (informational)
  - Unclassified cash events (mapped to 'other')
  - FX conversion missing for multi-currency amounts
  - Large single-day balance swings relative to prior months (warn)
  - Negative ending balance (error/warn depending on policy)

Each diagnostic should include severity, message, related_ids, and suggested resolution.

---

## Edge cases and recommended rules
- Partial settlement windows: support a configurable settlement window (e.g., use trade timestamp, or treat options/stock T+2/T+1 differently).
- Duplicate records: deduplicate cash ledger/trade-derived events by reference_id and nearest timestamp.
- Missing starting balance: infer starting balance from the ledger prior to month_start; if not available, present ending balance-only report and mark diagnostic.
- Multi-currency: require currency normalization step or produce per-currency breakdowns if conversion not available.

---

## SQL snippets (conceptual)
- Sum deposits/withdrawals from ledger:

SELECT
  DATE_TRUNC('month', timestamp) as month,
  SUM(CASE WHEN category = 'deposit' THEN amount ELSE 0 END) as deposits,
  SUM(CASE WHEN category = 'withdrawal' THEN amount ELSE 0 END) as withdrawals
FROM cash_ledger
WHERE timestamp BETWEEN @start AND @end
GROUP BY month;

- Infer premiums_received from trades (conceptual):

SELECT
  DATE_TRUNC('month', COALESCE(t.settled_at, t.timestamp)) as month,
  SUM(CASE WHEN i.type='option' AND t.action='sell' AND t.is_open = TRUE THEN t.price * ABS(t.quantity) * 100 ELSE 0 END) as premiums_received
FROM trades t
JOIN instruments i ON t.instrument_id = i.id
WHERE COALESCE(t.settled_at, t.timestamp) BETWEEN @start AND @end
GROUP BY month;

---

## Tests and examples
- Happy path: single month with one deposit, one short option sold (premium received), one option assigned (realized P&L reflected), and one withdrawal. Verify categories and ending balance calculation.
- Settlement-lag case: trades executed at month end but settled next month -> verify settlement attribution when `settled_at` present.
- Missing ledger: when no cash_ledger, ensure inferred cash events from trades match expected numbers and diagnostics show missing ledger.
- Multi-currency: feed FX rates and ensure conversion to base currency.

Write unit tests that build small trade and ledger fixtures and assert category totals and ending balances.

---

## Implementation notes for an LLM/developer agent
- Prefer a pipeline approach:
  1. Load and normalize data
  2. Build cash events (either from ledger or derived from trades)
  3. Categorize deterministically
  4. Aggregate and compute balances
  5. Validate and produce diagnostics
- Write small, testable primitives: `build_cash_events`, `categorize_event`, `aggregate_monthly`, `compute_balance_series`, `reconcile_checks`.
- Preserve auditability: keep original event references and produce a mapping from each output category back to contributing event ids.
- Configurable parameters: settlement preference (settled_at vs timestamp), contract_multiplier, timeframe granularity (month vs day), currency base.
- Use integer cents or a fixed decimal library for money to avoid FP rounding errors.

---

## Next steps for the implementer
1. Decide source-of-truth: `cash_ledger` preferred; if not present, implement trade -> cash event derivation.
2. Implement the primitives and unit tests.
3. Implement a small CLI or endpoint returning the monthly JSON and chart-ready payload.
4. Add visualization using a stacked bar + line chart in the frontend and connect the API.

---

## Placement
Save this file as `docs/Monthly_Capital_Flow.md` in the repository. Add unit tests under `backend/tests` that use synthetic fixtures mirroring the JSON shapes above.

---

## Contact
Refer to `MONTHLY_NET_PREMIUM_CALCULATION.md` and `MONTHLY_NET_PREMIUM_CALCULATION.md` in the repo for related logic and to align category definitions and naming conventions.
