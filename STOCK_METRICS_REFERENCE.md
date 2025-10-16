# Quick Reference: Enhanced Stock Analysis Metrics

## New Metrics Available

### 💰 Core Financials
| Metric | Description | Units |
|--------|-------------|-------|
| Last Year Revenue | Total revenue from previous fiscal year | Millions USD |
| Current Year Est. Revenue | Anticipated revenue for current fiscal year | Millions USD |
| Total Employees | Total workforce size | Count |
| Revenue per Employee | Efficiency metric | Thousands USD |

### ⚡ Efficiency & Productivity
| Metric | Description | Interpretation |
|--------|-------------|----------------|
| Operating Margin | Operating profit as % of revenue | Higher is better |
| EBITDA per Employee | Earnings before interest, taxes, depreciation per employee | Higher indicates efficiency |
| Sales per Square Foot | Retail-specific productivity metric | Higher is better (retail) |

### 📈 Growth & Forecasting
| Metric | Description | Good Range |
|--------|-------------|------------|
| 3-Year Sales CAGR | Compound annual growth rate for sales | 5-15% healthy |
| 3-Year EPS CAGR | Compound annual growth rate for earnings per share | 10-20% strong |
| R&D % of Revenue | Research spending as percentage | Varies by industry |
| Backlog vs Sales | Order backlog as % of anticipated sales | >100% strong (industrial) |

### 💎 Profitability & Capital
| Metric | Description | Good Range |
|--------|-------------|------------|
| ROIC | Return on Invested Capital | >10% good, >15% excellent |
| FCF Margin | Free cash flow as % of revenue | >5% healthy |
| Cash Conversion Cycle | Days to convert investments to cash | Lower is better |

### 👥 Ownership Structure
| Metric | Description | Significance |
|--------|-------------|--------------|
| Insider Ownership | % owned by company insiders | 5-25% indicates alignment |
| Institutional Ownership | % owned by institutions | >60% indicates stability |
| Segment Breakdown | Revenue by business segment | Shows diversification |

### ⚠️ Risk & Volatility
| Metric | Description | Interpretation |
|--------|-------------|----------------|
| Altman Z-Score | Financial distress indicator | >2.99 safe, 1.8-2.99 grey, <1.8 distress |
| Interest Coverage | Ability to pay interest | >3x comfortable |
| Beta vs Index | Volatility vs S&P 500 | <1 less volatile, >1 more volatile |
| Beta vs Sector | Volatility vs sector | Relative performance indicator |

### 🎯 Sentiment Indicators
| Metric | Description | Good Range |
|--------|-------------|------------|
| Glassdoor Rating | Employee satisfaction | >3.5/5 good, >4.0/5 excellent |
| Patent Count | Intellectual property portfolio | Higher for tech/pharma |
| ESG Controversy Score | Environmental/social/governance issues | <3 low risk, 3-6 medium, >6 high |

## Usage Tips

### For Options Trading
- **High ROIC + Low Debt**: Good candidates for covered calls
- **Stable Operating Margin**: Indicates consistent business
- **Altman Z-Score > 2.99**: Lower risk of distress during contract period

### For Margin Planning
- **Interest Coverage > 5x**: Company can handle additional leverage
- **Cash Conversion Cycle < 60 days**: Strong liquidity
- **Institutional Ownership > 60%**: Price stability

### For Strategic Analysis
- **3-Year Sales CAGR > 10%**: Growth company
- **R&D > 10% of Revenue**: Innovation-focused (tech)
- **Segment Diversification**: Multiple revenue streams = lower risk

## Color Coding Guide

### Altman Z-Score
- 🟢 Green: > 2.99 (Safe Zone)
- 🟡 Yellow: 1.8 - 2.99 (Grey Zone)
- 🔴 Red: < 1.8 (Distress Zone)

### ESG Controversy
- 🟢 Green: < 3 (Low Risk)
- 🟡 Yellow: 3 - 6 (Medium Risk)
- 🔴 Red: > 6 (High Risk)

## Where to Find These Metrics

Access via: **Stock Snapshot Page** → Enter Ticker → Analyze

The metrics appear in these sections:
1. **Core Financials** (near top)
2. **Efficiency & Productivity** (left column)
3. **Profitability & Capital Efficiency** (right column)
4. **Growth & Forecasting** (full width)
5. **Ownership Structure** (left column)
6. **Risk & Volatility Indicators** (right column)
7. **Sentiment & Narrative Signals** (bottom)

## Data Availability

⚠️ **Important Notes:**
- Not all metrics are available for every stock
- Smaller companies may have limited data
- ETFs may not have employee or patent data
- Data is gathered via Google Search and may vary by source availability
- Snapshots are cached for 24 hours - click "Refresh" for latest data

## Integration with Other Features

These metrics complement:
- **Manual Options Analysis**: Use risk indicators for strike selection
- **Margin Opportunity Planner**: Reference debt metrics and cash cycle
- **Portfolio Overview**: Compare metrics across holdings
- **Financial Links**: Quick access to detailed sources

## Example Interpretation

**Example: AAPL Analysis**
```
Core Financials:
- FY2024 Revenue: $394,328M
- Employees: 164,000
- Revenue per Employee: $2,405K ✅ Very high

Efficiency:
- Operating Margin: 30.74% ✅ Excellent
- EBITDA per Employee: $850K ✅ Strong

Risk Indicators:
- Altman Z-Score: 4.2 ✅ Safe Zone
- Interest Coverage: 28x ✅ Very comfortable
- Beta vs Index: 1.24 ⚠️ Slightly more volatile

Sentiment:
- Glassdoor Rating: 4.1/5 ✅ Good
- Patent Count: 12,000+ ✅ Strong IP
- ESG Score: 2.1 ✅ Low risk

Conclusion: Strong candidate for covered calls - stable, profitable, low financial risk
```

## Refreshing Data

- Snapshots are stored for 24 hours
- Click **"Refresh"** button to force new analysis
- New data is fetched from Google Search via Gemini AI
- Database automatically stores the latest snapshot

## Questions?

See the full documentation: `STOCK_ANALYSIS_ENHANCEMENTS.md`
