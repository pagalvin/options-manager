# Stock Analysis Snapshot Feature

## Overview

The Stock Analysis Snapshot feature provides comprehensive, AI-powered analysis of publicly traded stocks. It combines fundamental analysis, technical analysis, industry insights, and risk assessment to give investors a complete picture of a company's investment potential.

## Features

### Comprehensive Analysis Includes:

1. **Key Company Information**
   - Founding year
   - Recent and upcoming earnings dates
   - Headquarters location

2. **Industry Classification**
   - Full GICS (Global Industry Classification Standard) breakdown
   - Sector, Industry Group, Industry, and Sub-Industry

3. **Market Position**
   - Market rank
   - Key competitors
   - Peer companies
   - Key suppliers (when applicable)

4. **Recent News**
   - 3-5 most recent relevant news articles
   - Article summaries and links

5. **Investment Cases**
   - **Bullish Case**: Reasons to invest
   - **Bearish Case**: Reasons to be cautious

6. **Trend Analysis**
   - Industry trends and outlook
   - Macroeconomic trends and impact

7. **Red Flags Analysis**
   - Going concern warnings
   - Legal/regulatory issues
   - Financial performance concerns
   - Balance sheet issues
   - Risk disclosures
   - Income statement anomalies

8. **Technical Analysis**
   - Support and resistance levels
   - 50-day and 200-day moving averages
   - RSI (Relative Strength Index)
   - Average trading volume

## Architecture

### Database

The feature uses a `stock_snapshots` table to store analysis data:

```sql
CREATE TABLE stock_snapshots (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    snapshot_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Backend Components

#### 1. Types (`backend/src/types.ts`)
- `StockAnalysis`: Comprehensive analysis data structure
- `StockSnapshot`: Database model with metadata

#### 2. Service (`backend/src/services/stockAnalysisService.ts`)
Key methods:
- `getMostRecentSnapshot(ticker)`: Retrieve latest cached analysis
- `generateSnapshot(ticker, forceRefresh)`: Get or generate analysis
- `saveSnapshot(ticker, analysis)`: Store analysis in database
- `getSnapshotsByTicker(ticker)`: Get historical snapshots

#### 3. Gemini AI Integration (`backend/src/services/geminiService.ts`)
- `generateStockAnalysis(ticker)`: Uses Google's Gemini AI with web search
- Comprehensive prompt covering all analysis aspects
- JSON response parsing

#### 4. API Routes (`backend/src/routes/stockAnalysis.ts`)
- `GET /api/stock-analysis/:ticker`: Get or generate analysis
- `GET /api/stock-analysis/:ticker?refresh=true`: Force refresh
- `POST /api/stock-analysis/:ticker/refresh`: Alternative refresh endpoint
- `GET /api/stock-analysis/:ticker/history`: Get all snapshots
- `DELETE /api/stock-analysis/:ticker`: Delete all snapshots

### Frontend Components

#### 1. Types (`frontend/src/types/stockAnalysis.ts`)
- Mirrors backend types for type safety

#### 2. Service (`frontend/src/services/stockAnalysisService.ts`)
- API client for stock analysis endpoints
- Error handling and response parsing

#### 3. Page Component (`frontend/src/pages/StockSnapshot.tsx`)
- Search form with ticker input
- Comprehensive display of all analysis data
- Refresh capability
- URL query string support (`?ticker=AAPL`)
- Loading and error states

#### 4. Navigation
- Added "Stock Snapshot" to main navigation menu
- Route: `/stock-snapshot`

## Usage

### User Interface

1. **Navigate to Stock Snapshot**
   - Click "Stock Snapshot" in the navigation menu
   - Or visit: `http://localhost:5173/stock-snapshot`

2. **Analyze a Stock**
   - Enter a ticker symbol (e.g., AAPL, MSFT, TSLA)
   - Click "Analyze" button
   - Wait for AI-generated analysis (first-time may take 10-30 seconds)

3. **Refresh Analysis**
   - Click "Refresh" button to force a new analysis
   - Useful for getting the latest information

4. **Share Analysis**
   - Copy URL with ticker parameter: `/stock-snapshot?ticker=AAPL`
   - Direct link will automatically load the analysis

### API Usage

#### Get Analysis (with caching)
```bash
GET http://localhost:3001/api/stock-analysis/AAPL
```

Returns cached snapshot if less than 24 hours old, otherwise generates new one.

#### Force Refresh
```bash
GET http://localhost:3001/api/stock-analysis/AAPL?refresh=true
# or
POST http://localhost:3001/api/stock-analysis/AAPL/refresh
```

#### Get Historical Snapshots
```bash
GET http://localhost:3001/api/stock-analysis/AAPL/history
```

#### Response Format
```json
{
  "success": true,
  "snapshot": {
    "id": 1,
    "ticker": "AAPL",
    "companyName": "Apple Inc.",
    "snapshotDate": "2025-10-04T12:00:00.000Z",
    "analysisData": {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "keyDates": { ... },
      "headquarters": { ... },
      "industry": { ... },
      "industryPosition": { ... },
      "recentNews": [ ... ],
      "investmentCases": { ... },
      "trends": { ... },
      "redFlags": { ... },
      "technicalAnalysis": { ... }
    }
  }
}
```

## Installation & Setup

### Prerequisites
- PostgreSQL database running
- Google Gemini API key configured in `.env`
- Backend and frontend running

### Database Migration

Run the migration script to create the `stock_snapshots` table:

```powershell
.\migrate_stock_snapshots.ps1
```

The script will:
1. Read database configuration from `backend/.env`
2. Execute `database/add_stock_snapshots_table.sql`
3. Create table with indexes and triggers

### Environment Configuration

Ensure your `backend/.env` file includes:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_SCHEMA=overlord

# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a Gemini API key from: https://ai.google.dev/

### Start the Application

```powershell
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## Caching Strategy

- **Automatic Caching**: Analysis is cached in the database for 24 hours
- **Smart Retrieval**: If a cached snapshot exists and is less than 24 hours old, it's returned immediately
- **Manual Refresh**: Users can force refresh to get the latest data
- **Historical Tracking**: All snapshots are preserved for historical comparison

## AI-Powered Analysis

The feature leverages Google's Gemini AI with web search capabilities to:
- Gather real-time information from the internet
- Analyze company financials and news
- Assess market sentiment
- Identify risks and opportunities
- Provide technical analysis data

## Performance Considerations

- **First Request**: 10-30 seconds (AI generation + web search)
- **Cached Requests**: <1 second (database retrieval)
- **Data Storage**: JSONB format for efficient querying
- **Indexes**: Optimized for fast ticker lookups

## Future Enhancements

Potential improvements:
- [ ] Historical snapshot comparison view
- [ ] Email alerts for red flags
- [ ] Automated weekly snapshot generation for watchlist
- [ ] Export to PDF
- [ ] Integration with existing portfolio positions
- [ ] Chart visualization of technical indicators
- [ ] Sentiment analysis from social media

## Troubleshooting

### Migration Issues

If the migration fails:
1. Ensure PostgreSQL is running
2. Verify database credentials in `backend/.env`
3. Check that `psql` is in your PATH
4. Manually run: `psql -U postgres -d postgres -f database/add_stock_snapshots_table.sql`

### API Errors

If analysis generation fails:
1. Verify Gemini API key is valid
2. Check backend logs for detailed error messages
3. Ensure internet connectivity for web search
4. Verify the ticker symbol is valid

### Frontend Issues

If the page doesn't load:
1. Clear browser cache
2. Check browser console for errors
3. Verify backend is running on port 3001
4. Check that the route is registered in `App.tsx`

## Technical Details

### Data Flow

```
User Input (Ticker)
    ↓
Frontend Service
    ↓
Backend API Route
    ↓
Stock Analysis Service
    ↓
Check Cache (< 24hr?)
    ↓ No
Gemini AI Service
    ↓
Web Search + Analysis
    ↓
Save to Database
    ↓
Return to Frontend
    ↓
Display Analysis
```

### Security Considerations

- API keys stored in `.env` (not committed)
- Input validation on ticker symbols
- Rate limiting on AI API calls (consider implementing)
- JSONB prevents SQL injection in stored data

## API Reference

### StockAnalysis Interface

```typescript
interface StockAnalysis {
  ticker: string;
  companyName: string;
  keyDates: {
    foundedYear: number;
    mostRecentEarnings: string;
    nextEarningsDate: string;
  };
  headquarters: {
    city: string;
    state: string;
    country: string;
    address?: string;
  };
  industry: {
    gicsSector: string;
    gicsIndustryGroup: string;
    gicsIndustry: string;
    gicsSubIndustry: string;
  };
  // ... (see types.ts for complete interface)
}
```

## Contributing

When adding new analysis features:
1. Update the `StockAnalysis` interface in both frontend and backend
2. Modify the Gemini prompt in `geminiService.ts`
3. Update the frontend display in `StockSnapshot.tsx`
4. Update this README with new features

## License

Part of the Options Trading ROI Tracker application.
