# Business Features by Global Navigation

This application helps track and optimize ROI for options trading, with a focus on covered calls. Below are the key business features organized by the items in the global navigation.

## Dashboard
- Portfolio overview with high-level KPIs across equities and options
- Options exposure heatmap to visualize concentration and risk
- Capital-by-source trends (deposits, withdrawals, premium, equity changes)
- Recent positions snapshot for quick health checks
- Portfolio summary metrics and system status info

## Transactions
- Import transactions from CSV (with optional “delete first” to re-ingest cleanly)
- Manually add, edit, and delete individual transactions
- View recent transactions in a sortable table for quick reconciliation

## Transaction Analysis
- Filter transactions by symbol, date range, options-only, and margin-only
- Quick time filters (e.g., last week/month/quarter) for rapid period analysis
- Running totals for cash flow, commissions/fees, and estimated ROI
- Open-options count and indicators for position status
- Export the filtered view to CSV for reporting or audit

## Options
- Options portfolio analytics: exposure, lots, basis and strike price stats
- Max potential profit and annualized return insights
- Earnings-date awareness and news to manage event risk
- Recommended weekly premium targets and supporting charts
- Distribution and trend charts to spot performance patterns

## Performance
- Weekly and monthly performance combining premium + equity gains/losses
- Capital flow analysis to attribute sources of performance
- Premium as a percentage of at-risk equity to assess efficiency
- Projection views (trend-based) to anticipate near-term outcomes
- Click-through from charts to deeper transaction-level detail

## Cash Flow
- Premium Cash Flow Analysis focused on “unhindered” option roll income
- Weekly and monthly views of net credit from rolls (excludes initial covered-call opens)
- Summary cards: total net credit, average per month, total rolls, average per roll, unique symbols
- Net credit over time and roll count charts for trend tracking
- Recent rolls table to review latest cash-generating activity

## Margin Planning
- Margin Master settings: current outstanding margin, current margin rate, notes
- Options catalog with grouping by expiration date; mark positions as rollable/non-rollable
- One-click import of option positions from E*TRADE
- Weekly Planning Grid with:
  - Likely assignments (cash impact) by week
  - Proposed margin by week to manage borrowing levels
  - Margin impact and cumulative margin trajectory
  - Estimated weekly margin cost based on your rate
  - Notes for planning decisions
- Calendar View showing option expirations and earnings dates over upcoming months, with market holidays
- Monthly summaries for expirations and earnings to assist planning

## Options Analyzer
- Maintain a watchlist of manual opportunities with symbol, dates, prices, and notes
- Compute cash needed, net gain on strike, percent gain, and margin-adjusted return (Net When Margined %)
- Estimate strike-hit probability using Delta or volatility-based modeling
- Fetch current market price and enrich entries with earnings and ex-dividend dates
- Use E*TRADE data to auto-pick a minimal 1%+ ITM call strategy per symbol
- Bulk “Update All Strategies” to refresh recommended picks across your list
- Filter and sort to focus on the most actionable ideas; optional AI chat panel for research

## E*TRADE
- Secure broker connection with environment switch (Sandbox/Live) and authentication flow
- Quotes & Options: view quotes, analyze option chains, and highlight 1%+ gain ITM opportunities
- Positions: review current holdings to align covered-call strategies
- Transactions: browse historical activity for reconciliation
- Orders: review orders to ensure execution aligns with strategy
