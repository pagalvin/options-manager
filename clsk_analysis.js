// CLSK Option Contract Analysis
// Based on database transactions, let's trace the open positions

const transactions = [
  // Most recent first
  { date: "2025-07-26", symbol: "CLSK--250725C00009000", type: "Option Assigned", qty: 1 },
  { date: "2025-06-23", symbol: "CLSK Jul 25 '25 $9 Call", type: "Sold Short", qty: -1 },
  { date: "2025-06-23", symbol: "CLSK Jul 25 '25 $8.50 Call", type: "Sold Short", qty: -1 },
  { date: "2025-06-23", symbol: "CLSK Jul 18 '25 $8.50 Call", type: "Bought To Cover", qty: 1 },
  { date: "2025-06-23", symbol: "CLSK Jul 18 '25 $8.50 Call", type: "Sold Short", qty: -1 },
  { date: "2025-06-23", symbol: "CLSK Jul 18 '25 $9 Call", type: "Bought To Cover", qty: 1 },
  { date: "2025-06-23", symbol: "CLSK Jul 11 '25 $8.50 Call", type: "Bought To Cover", qty: 1 },
  { date: "2025-06-17", symbol: "CLSK Jul 18 '25 $9 Call", type: "Sold Short", qty: -1 },
  { date: "2025-06-17", symbol: "CLSK Jul 11 '25 $9.50 Call", type: "Bought To Cover", qty: 1 },
  // ... and more
  { date: "2025-04-25", symbol: "CLSK Sep 19 '25 $7 Call", type: "Sold Short", qty: -1 },
];

// Key contracts to track:
// 1. CLSK Jul 25 '25 $9 Call - Sold Short on 2025-06-23, then Option Assigned on 2025-07-26 (Net: 0)
// 2. CLSK Jul 25 '25 $8.50 Call - Sold Short on 2025-06-23 (Net: +1)
// 3. CLSK Sep 19 '25 $7 Call - Sold Short on 2025-04-25 (Net: +1)

console.log("Expected open contracts: 2");
console.log("1. CLSK Jul 25 '25 $8.50 Call");  
console.log("2. CLSK Sep 19 '25 $7 Call");
