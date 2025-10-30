# Monthly Net Premium as % of At-Risk Equity Calculation

## Overview
This metric calculates the efficiency of option premium generation by comparing monthly option premium income against the total equity capital at risk during that month.

## Key Concepts

### At-Risk Equity Definition
**At-Risk Equity** = The cumulative net invested amount in stocks (equity positions) for all symbols with positive net investment at the end of each period.

**Net Invested Amount** = Total stock purchases - Total stock sales (calculated from transaction amounts)

### Premium Definition
**Monthly Premium** = Sum of ALL option transaction amounts (sales and purchases) during the month, regardless of coverage status.

### Calculation Start Date
All calculations begin from **February 20, 2025** (specifically, the Sunday of the week containing this date).

## Step-by-Step Algorithm

### 1. Identify All Relevant Months

```typescript
// Get all months from threshold date (Feb 20, 2025) onwards
const thresholdDate = new Date('2025-02-20');
const thresholdWeekStart = startOfWeekSunday(thresholdDate); // Sunday of that week

// Collect all months that have equity transactions after threshold
for each equity transaction (Bought or Sold) {
    if (transaction.date >= thresholdWeekStart) {
        add month to processing list (format: YYYY-MM)
    }
}
```

### 2. Calculate At-Risk Equity Per Month

For each month:

```typescript
// Get last day of month
monthEnd = lastDayOfMonth(year, month)
monthEnd.setHours(23, 59, 59, 999)

// Initialize tracking
symbolNetInvested = Map<symbol, netAmount>()

// Process ALL equity transactions up to end of month
for each transaction in EQ transactions (chronological order) {
    if (transaction.date > monthEnd) continue
    
    // Filter criteria:
    // 1. Only include transactions with multiples of 100 shares
    quantity = abs(transaction.quantity)
    if (quantity % 100 !== 0) continue
    
    // 2. Apply symbol filter if selected
    if (selectedSymbol !== 'ALL' && symbol !== selectedSymbol) continue
    
    // Update net invested for this symbol
    // Note: transaction.amount is negative for buys, positive for sales
    currentNet = symbolNetInvested.get(symbol) || 0
    symbolNetInvested.set(symbol, currentNet - transaction.amount)
}

// Calculate total at-risk
totalAtRisk = 0
for each (symbol, netInvested) in symbolNetInvested {
    if (netInvested > 0) {  // Only count positive net investments
        totalAtRisk += netInvested
    }
}
```

### 3. Calculate Monthly Premium

```typescript
// Get first and last day of month
monthStart = firstDayOfMonth(year, month)
monthEnd = lastDayOfMonth(year, month)
monthEnd.setHours(23, 59, 59, 999)

// Sum ALL option transaction amounts during this month
monthlyPremium = 0
for each transaction in OPTN transactions {
    transactionDate = transaction.date
    
    // Check if transaction is within month
    if (transactionDate >= monthStart && transactionDate <= monthEnd) {
        // Apply symbol filter if selected
        if (selectedSymbol === 'ALL' || transaction.symbol === selectedSymbol) {
            monthlyPremium += transaction.amount
        }
    }
}
```

### 4. Calculate Percentage

```typescript
// Calculate percentage
if (totalAtRisk > 0) {
    percentage = (monthlyPremium / totalAtRisk) * 100
} else {
    percentage = 0
}

// Result object
return {
    month: "YYYY-MM",
    monthName: "Jan 2025" // formatted for display,
    pct: percentage,
    premium: monthlyPremium,
    atRisk: totalAtRisk
}
```

## Important Implementation Details

### Transaction Amount Signs
- **Stock Purchases (Bought)**: Negative amount (e.g., -$10,000)
- **Stock Sales (Sold)**: Positive amount (e.g., +$9,500)
- **Option Sales (Sold/Sold Short)**: Positive amount (e.g., +$300)
- **Option Purchases (Bought/Bought To Cover)**: Negative amount (e.g., -$200)

### Net Invested Calculation
```typescript
// Why we subtract the amount:
// Starting from 0:
// Buy 100 shares at $100/share = amount of -$10,000
//   netInvested = 0 - (-10,000) = $10,000 ✓
// Sell 50 shares at $110/share = amount of +$5,500
//   netInvested = 10,000 - (+5,500) = $4,500 ✓
```

### Filtering Rules

1. **Equity Transactions**:
   - Only `security_type = 'EQ'`
   - Only `transaction_type IN ('Bought', 'Sold')`
   - Only multiples of 100 shares (covered call requirement)
   - Must be after threshold date (Feb 20, 2025)

2. **Option Transactions**:
   - Only `security_type = 'OPTN'`
   - ALL transaction types included (Bought, Sold, Bought To Cover, Sold Short)
   - Must be within the month being calculated

3. **Symbol Filter**:
   - If `selectedSymbol = 'ALL'`: include all symbols
   - Otherwise: only include transactions for the selected symbol

### At-Risk Calculation Logic

**Only count positive net investments**:
- Symbol A: Net invested = $10,000 → Include in at-risk
- Symbol B: Net invested = -$2,000 (sold more than bought) → Exclude from at-risk
- Symbol C: Net invested = $0 (closed position) → Exclude from at-risk

This represents actual capital currently deployed and at risk in the market.

## Example Calculation

**March 2025:**

**Equity Transactions (up to March 31):**
- Feb 15: Bought 200 AAPL @ $150 = -$30,000
- Feb 28: Bought 100 TSLA @ $200 = -$20,000
- Mar 10: Sold 100 AAPL @ $160 = +$16,000
- Mar 15: Sold 100 TSLA @ $180 = -$18,000 (loss, but still reduces exposure)

**Net Invested by Symbol (end of March):**
- AAPL: -(-$30,000) + -(+$16,000) = $30,000 - $16,000 = **$14,000** ✓
- TSLA: -(-$20,000) + -(-$18,000) = $20,000 - $18,000 = **$2,000** ✓
- **Total At-Risk = $16,000**

**Option Transactions (March 1-31):**
- Mar 5: Sold AAPL Call = +$300
- Mar 12: Bought AAPL Call = -$150
- Mar 18: Sold TSLA Call = +$250
- **Total Premium = $400**

**Result:**
```
Percentage = ($400 / $16,000) * 100 = 2.5%
```

This means the portfolio generated 2.5% of its at-risk equity value in option premium during March 2025.

## Interpretation

- **Higher percentage** = More efficient premium generation relative to capital deployed
- **Lower percentage** = Less premium income relative to capital at risk
- **Typical range**: 1-5% per month is common for covered call strategies
- **Annualized estimate**: Multiply by 12 for rough annual rate (e.g., 2.5% × 12 = 30% annual)

## Weekly vs Monthly

The **Weekly** calculation uses identical logic but:
- Uses week boundaries (Sunday-Saturday) instead of month boundaries
- Week key format: `YYYY-MM-DD` (Sunday's date)
- Net invested calculated up to Saturday end-of-day
- Premium calculated for Sunday-Saturday period

## Implementation Reference

This logic is implemented in:
- Frontend: `frontend/src/pages/Performance.tsx`
  - Monthly calculation: Lines ~1085-1166
  - Weekly calculation: Lines ~962-1083
