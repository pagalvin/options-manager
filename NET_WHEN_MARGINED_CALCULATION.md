# NET WHEN MARGINED % - Calculation Logic

## Formula

When **Margin Price per Share** is entered:

```
NET WHEN MARGINED % = ((Net Profit - Margin Interest Cost) / Cash Invested) × 100
```

Where:
- **Net Profit** = (Strike Price - Market Price + Premium) × 100 shares
- **Cash Invested** = Margin Price per Share × 100 shares
- **Margin Interest Cost** = Cash Invested × (13.20% / 365) × Days to Expiration

## Key Points

1. **Uses Margin Price as basis**: The denominator is the full margin price × 100, representing the actual cash invested when buying on margin

2. **Net Profit calculated from Market Price**: The profit/loss is still calculated from the difference between the strike price and the **market price** (not margin price)

3. **Subtracts margin interest cost**: This shows the NET profit percentage after accounting for the cost of borrowing on margin at 13.20% annual rate

4. **Premium is part of profit**: The premium received is added to the profit calculation as it's income from selling the call option

5. **Time-based interest**: The margin interest is calculated based on the actual days until option expiration

## Examples

### Example 1: Ford (F) - Strike $12
- Market Price: $12.66
- Margin Price: $3.68
- Strike Price: $12.00
- Premium: $0.71
- Lots: 1
- Days to Expiration: 5

**Calculation:**
```
Cash Invested = 1 × 100 × $3.68 = $368
Net Profit = ($12.00 - $12.66 + $0.71) × 100 = $5
Margin Interest = $368 × (0.132 / 365) × 5 = $368 × 0.00180822 = $0.67
Net Profit After Interest = $5 - $0.67 = $4.33
NET WHEN MARGINED % = ($4.33 / $368) × 100 = 1.18%
```

### Example 2: Ford (F) - Strike $12.50
- Market Price: $12.66
- Margin Price: $3.68
- Strike Price: $12.50
- Premium: $0.33
- Lots: 1
- Days to Expiration: 5

**Calculation:**
```
Cash Invested = 1 × 100 × $3.68 = $368
Net Profit = ($12.50 - $12.66 + $0.33) × 100 = $17
Margin Interest = $368 × (0.132 / 365) × 5 = $368 × 0.00180822 = $0.67
Net Profit After Interest = $17 - $0.67 = $16.33
NET WHEN MARGINED % = ($16.33 / $368) × 100 = 4.44%
```

## When Margin Price is NOT entered

When there's no margin price entered (showing "N/E" in the grid), the calculation uses the standard formula:

```
NET WHEN MARGINED % = ((Net Profit - Margin Interest) / Cash Needed) × 100
```

Where:
- **Cash Needed** = (Market Price × 100) - (Premium × 100)
- **Net Profit** = (Strike - Market Price + Premium) × 100
- **Margin Interest** = Cash Needed × (13.20% / 365) × Days to Expiration

This maintains backward compatibility with the existing non-margin calculation.

## Comparison: With vs Without Margin Price

### Without Margin Price (Standard Calculation)
For Ford at market price $12.66, strike $12.50, premium $0.33:
```
Cash Needed = ($12.66 × 100) - ($0.33 × 100) = $1,233
Net Profit = ($12.50 - $12.66 + $0.33) × 100 = $17
Margin Interest = $1,233 × (0.132 / 365) × 5 = $2.23
Net After Interest = $17 - $2.23 = $14.77
Return % = ($14.77 / $1,233) × 100 = 1.20%
```

### With Margin Price (Margin Trading Calculation)
For the same position with margin price $3.68:
```
Cash Invested = $3.68 × 100 = $368
Net Profit = ($12.50 - $12.66 + $0.33) × 100 = $17
Margin Interest = $368 × (0.132 / 365) × 5 = $0.67
Net After Interest = $17 - $0.67 = $16.33
Return % = ($16.33 / $368) × 100 = 4.44%
```

**Result:** By trading on margin, you achieve 4.44% return vs 1.20% return - nearly **4× the return** on your actual cash invested!

## Implementation

The logic is in the `calculateNetGainWhenMargined()` function in `OptionsAnalyzer.tsx`:

```typescript
const calculateNetGainWhenMargined = (
  lots: number | null, 
  marketPrice: number | null, 
  marginPricePerShare: number | null, 
  strikePrice: number | null, 
  premium: number | null, 
  optionDate: string | null
): number | null => {
  if (!lots || !strikePrice || !premium || !optionDate) return null;
  
  if (marginPricePerShare && marketPrice) {
    // Calculate with margin price
    const cashInvested = lots * 100 * marginPricePerShare;
    const netOnStrike = calculateNetOnStrike(lots, marketPrice, strikePrice, premium);
    
    // Calculate margin interest
    const daysToExpiration = calculateDaysFromToday(optionDate);
    const dailyRate = MARGIN_RATE / 365; // 13.20% annual rate
    const marginInterest = cashInvested * dailyRate * daysToExpiration;
    
    // Return net percentage after margin cost
    const netGainAfterMargin = netOnStrike - marginInterest;
    return (netGainAfterMargin / cashInvested) * 100;
  }
  
  // Fallback to standard calculation
  // ...
}
```

## Why This Makes Sense

When trading on margin:
1. You're **borrowing money** to buy stock at the margin price (e.g., $3.68 instead of $12.66)
2. Your **actual investment** is the margin price × shares
3. Your **profit/loss** is still based on the stock's market performance
4. You pay **interest on the borrowed amount** at 13.20% annual rate
5. The **return percentage** shows your NET profit (after interest) relative to your actual cash invested

This gives a much more accurate picture of returns when trading on margin. In Example 2 above:
- Gross profit: $17
- Margin interest cost: $0.67 (for 5 days)
- Net profit: $16.33
- Return on $368 invested: **4.44%**

Compare this to the standard calculation without margin where you'd invest $1,233 for only a 1.20% return. The margin leverage multiplies your returns significantly, even after accounting for the cost of borrowing.

## Related Columns

The Options Analyzer grid shows several margin-related columns:

- **Margin Price/Share**: The effective price when buying on margin (entered manually)
- **Margin Interest to Exp**: Total interest cost until option expiration
- **Margin / Day**: Daily interest cost
- **Margin / Week**: Weekly interest cost  
- **Margin / Month**: Monthly interest cost (30 days)
- **NET WHEN MARGINED %**: The final net return percentage (this calculation)

All margin interest calculations use the same 13.20% annual rate.
