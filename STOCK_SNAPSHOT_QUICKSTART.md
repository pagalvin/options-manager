# Stock Analysis Snapshot - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Verify Prerequisites ✅
- [x] PostgreSQL running on localhost:5432
- [x] Database migration completed (`stock_snapshots` table created)
- [x] Gemini API key configured in `backend/.env`

### Step 2: Start the Application

Open two PowerShell terminals:

**Terminal 1 - Backend:**
```powershell
cd d:\options3\backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd d:\options3\frontend
npm run dev
```

### Step 3: Use the Feature

1. Open browser: http://localhost:5173
2. Click **"Stock Snapshot"** in navigation menu
3. Enter a ticker symbol (e.g., `AAPL`)
4. Click **"Analyze"**
5. Wait 10-30 seconds for comprehensive analysis

## 📝 Example Usage

### Try These Tickers:
- **AAPL** - Apple Inc. (Large Cap Tech)
- **MSFT** - Microsoft (Enterprise Software)
- **TSLA** - Tesla (Electric Vehicles)
- **NVDA** - NVIDIA (AI/Semiconductors)
- **SPY** - S&P 500 ETF
- **SOUN** - SoundHound AI (Small Cap Tech)

### Features to Explore:

1. **First Analysis** - Takes 10-30 seconds (AI generation)
2. **Cached Results** - Instant for 24 hours
3. **Refresh Button** - Force new analysis anytime
4. **URL Sharing** - Share with `?ticker=AAPL` parameter
5. **Comprehensive Data** - Scroll through all sections

## 📊 What You'll See

### Analysis Sections:
1. ✅ **Company Overview** - Basic info and headquarters
2. ✅ **Key Dates** - Founded, earnings dates
3. ✅ **Industry Classification** - Full GICS breakdown
4. ✅ **Market Position** - Competitors and peers
5. ✅ **Recent News** - Latest articles with links
6. ✅ **Investment Cases** - Bullish and bearish arguments
7. ✅ **Trends** - Industry and macro analysis
8. ✅ **Red Flags** - Risk assessment
9. ✅ **Technical Analysis** - Support, resistance, RSI, moving averages

## 🎯 Quick Test

Run this to verify everything works:

```powershell
# In a new PowerShell terminal
curl http://localhost:3001/api/stock-analysis/AAPL
```

Expected: JSON response with comprehensive stock analysis

## ⚡ Pro Tips

1. **Bookmark Direct Links**: `/stock-snapshot?ticker=AAPL`
2. **Use Refresh Wisely**: Only refresh when you need latest data (costs AI API calls)
3. **Compare Analyses**: Open multiple tabs with different tickers
4. **Check Red Flags First**: Scroll to red flags for quick risk assessment

## 🔧 Troubleshooting

### Backend won't start?
```powershell
cd d:\options3\backend
npm install
npm run dev
```

### Frontend won't start?
```powershell
cd d:\options3\frontend
npm install
npm run dev
```

### "Failed to generate analysis" error?
- Check that `GEMINI_API_KEY` is set in `backend/.env`
- Verify internet connection (needed for web search)
- Check backend console for detailed error

### Analysis takes too long?
- First analysis: 10-30 seconds is normal
- Check Gemini API status
- Verify API key is valid

### Empty sections in analysis?
- Some data may not be available for all stocks
- Try a well-known large-cap stock (AAPL, MSFT, GOOGL)
- Refresh analysis if data seems stale

## 📖 Full Documentation

For complete details, see:
- **STOCK_SNAPSHOT_README.md** - Full feature documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical implementation details

## 🎉 You're Ready!

The Stock Analysis Snapshot feature is fully operational and ready to provide comprehensive stock analysis powered by AI.

**Enjoy analyzing stocks!** 📈
