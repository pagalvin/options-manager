# Latest News - Quick Start Guide

## 🚀 Quick Start

### Access the Feature
1. Open your browser to http://localhost:3000/options
2. Click the **"Latest News"** tab
3. Click **"Generate News Snapshot"**

### What You'll See
- Real-time progress bar showing each stock being analyzed
- Grid of news cards, one per stock
- 3 recent articles per stock with sentiment indicators
- Links to original articles

## 📊 Understanding the Display

### Sentiment Colors
- 🟢 **Green** = Positive news (good for stock)
- 🔴 **Red** = Negative news (concerns/risks)
- ⚪ **Gray** = Neutral (informational)

### Time Estimates
- **1-10 stocks**: ~30 seconds
- **11-30 stocks**: ~1-2 minutes
- **31-50 stocks**: ~2-3 minutes

## 🔄 Navigation

- **← →** arrows: View previous snapshots
- **Refresh button**: Generate new snapshot for today
- **Date display**: Shows which snapshot you're viewing

## ⚠️ Troubleshooting

### "Rate Limited" Message
- **Normal behavior** - System will wait 10 seconds and retry
- Shows in progress updates
- Generation continues automatically

### No Articles Found
- **Normal for small-cap stocks** with limited news
- Not an error - just means no recent news available

### Generation Stuck?
- Check browser console (F12) for errors
- Verify backend is running
- Check that Gemini API key is valid

## 💡 Best Practices

1. **Generate once per day** - News doesn't change that frequently
2. **Review red flags first** - Check negative sentiment stocks
3. **Use historical view** - Compare news trends over time
4. **Combine with earnings data** - Check earnings dates in Options Grid tab

## 🎯 What to Look For

### Red Flags (Negative News)
- Bankruptcy/debt concerns
- Earnings misses
- Regulatory issues
- Management changes
- Lawsuits

### Green Flags (Positive News)
- Earnings beats
- New contracts/partnerships
- Product launches
- Analyst upgrades
- Positive guidance

## 📝 Tips

- **Before selling covered calls**: Check for negative news
- **After earnings**: Generate fresh snapshot to see reactions
- **Weekly routine**: Refresh news every Monday morning
- **Risk management**: Set alerts for stocks with negative trends

## 🔧 Technical Info

### API Endpoints (for developers)
```
GET  /api/news/snapshots/dates  - List available dates
GET  /api/news/snapshots/:date  - Get specific snapshot
POST /api/news/generate          - Generate new snapshot
```

### Database
- Table: `overlord.news_snapshots`
- Stores JSONB data for flexibility
- Indexed by date for fast queries

---

**Need Help?** Check the full documentation in `LATEST_NEWS_README.md`
