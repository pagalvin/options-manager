# State Machine Logic for Premium Cash Flow Analysis

## Overview
You need to implement a state machine that identifies "unhindered" option premium income (rolls and standalone sales) while excluding "hindered" premiums (initial covered calls sold when buying stock).

## Core Concept
The algorithm pairs stock purchases with option sales to identify which options were sold as part of establishing a position (should be excluded) versus which options represent ongoing premium generation (should be included).

## Processing Rules

### 1. Data Preparation
```typescript
// Fetch transactions from March 1, 2025 onwards
// Group by date AND symbol
// Sort by REVERSE import order (most recent import first)
// Within each date+symbol group, process from BOTTOM to TOP
```

### 2. State Machine Variables
For each symbol on each date, maintain:
- `potentialExclusions`: Queue of sold options awaiting pairing with stock purchases
- `openEquities`: Queue of stock purchases awaiting pairing with option sales  
- `excludedOptionIds`: Set of option transaction IDs to exclude from premium calculation

### 3. Processing Algorithm

**Process transactions from BOTTOM to TOP** (reverse chronological by import order):

#### When encountering a **Stock Purchase** (Bought):
```typescript
if (potentialExclusions.length > 0) {
    // Pair this stock purchase with the first unpaired option sale
    const optionToExclude = potentialExclusions.shift();
    excludedOptionIds.add(optionToExclude.id);
} else {
    // No option to pair with - add to open equities queue
    openEquities.push(stockPurchase);
}
```

#### When encountering an **Option Sale** (Sold/Sold Short):
```typescript
if (openEquities.length > 0) {
    // Pair this option with the first unpaired stock purchase
    openEquities.shift();
    excludedOptionIds.add(optionSale.id);
} else {
    // No stock to pair with - add to potential exclusions queue
    potentialExclusions.push(optionSale);
}
```

#### When encountering an **Option Buy** (Bought/Bought To Cover):
```typescript
// Option buys are always included in premium calculation
// (they reduce net premium but are not excluded)
// No state changes needed
```

### 4. Premium Calculation

After processing all transactions for a symbol/date:

```typescript
// Calculate net premium from ALL option transactions
// EXCEPT those in excludedOptionIds
netPremium = 0;
for (transaction of optionTransactions) {
    if (!excludedOptionIds.has(transaction.id)) {
        netPremium += transaction.amount; // Positive for sales, negative for buys
    }
}
```

### 5. Result Filtering

Include a symbol/date in results **ONLY IF**:
- There are option transactions
- Net premium ≠ 0  
- At least one sold option remains unpaired (if there are any sold options)

```typescript
const allSoldOptions = optionTransactions.filter(t => t.type === 'Sold');
const unpairedSoldOptions = allSoldOptions.filter(t => !excludedOptionIds.has(t.id));

// Exclude if ALL sold options are paired with stock purchases
if (allSoldOptions.length > 0 && unpairedSoldOptions.length === 0) {
    continue; // Skip this symbol/date
}
```

## Example Walkthrough

**March 15, 2025 - Symbol AAPL** (processed bottom-to-top):

```
Transaction 4: Sold AAPL Call $350      (bottom/oldest)
Transaction 3: Bought AAPL Call -$200
Transaction 2: Bought 100 AAPL shares
Transaction 1: Sold AAPL Call $300      (top/newest)
```

**Processing:**

1. **Start at Transaction 4** (Sold $350):
   - `openEquities` is empty
   - Add to `potentialExclusions`: [$350]

2. **Transaction 3** (Bought Call -$200):
   - Option buys don't affect state
   - Include in premium calculation

3. **Transaction 2** (Bought Stock):
   - `potentialExclusions` has $350 option
   - Pair them: exclude option $350
   - `excludedOptionIds`: [Transaction 4]
   - `potentialExclusions`: []

4. **Transaction 1** (Sold $300):
   - `openEquities` is empty
   - Add to `potentialExclusions`: [$300]
   - But this remains unpaired (no more stock purchases)

**Result:**
- Excluded: Transaction 4 ($350)
- Included: Transaction 1 ($300), Transaction 3 (-$200)
- **Net Premium: $300 - $200 = $100**
- **Include in results** (has unpaired sold option)

## Key Insights

1. **Bottom-to-Top Processing**: Ensures newest stock purchases pair with most recent option sales first
2. **FIFO Pairing**: First option in queue pairs with first stock in queue
3. **Option Buys Never Excluded**: They reduce net premium but aren't paired/excluded
4. **All-or-Nothing Rule**: If ALL sold options are paired, exclude the entire symbol/date

## Summary Aggregation

Group results by period (weekly/monthly):
```typescript
{
    period: "2025-W10",
    totalNetCredit: sum of all net premiums in period,
    transactionCount: number of symbol/date combinations,
    symbols: unique symbols traded in period
}
```

## Implementation Reference

This logic is implemented in:
- Backend: `backend/src/services/premiumCashFlowService.ts` (method: `getSimpleOptionRolls`)
- Frontend: `frontend/src/pages/PremiumCashFlow.tsx`

This approach cleanly separates **position establishment costs** (excluded) from **ongoing premium generation** (included) for accurate cash flow analysis.
