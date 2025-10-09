# Latest News Feature

## Overview

The Latest News feature provides automated news analysis for your stock portfolio using Google's Gemini AI with search grounding. This feature helps you stay informed about events that may impact your options positions in the next 1-2 weeks.

## Features

- **AI-Powered News Analysis**: Uses Gemini AI with Google Search grounding to fetch the latest news
- **Sentiment Analysis**: Automatically categorizes each news article as positive, negative, or neutral
- **Historical Snapshots**: View and navigate through previous news snapshots
- **Progress Tracking**: Real-time progress updates during news generation
- **Rate Limit Handling**: Automatically handles API rate limits with retries and delays
- **Sequential Processing**: Processes stocks one at a time to avoid overwhelming the API

## How to Use

### Accessing Latest News

1. Navigate to the Options Positions page: `http://localhost:3000/options`
2. Click on the **"Latest News"** tab

### Generating a News Snapshot

1. If no snapshot exists for today, you'll see a "Generate News Snapshot" button
2. Click the button to start generating news for all stocks in your portfolio
3. Watch the progress bar as each stock is analyzed (this may take several minutes)
4. Once complete, the news will be displayed in a grid format

### Viewing News

Each stock ticker shows:
- **Articles**: Up to 3 most recent and relevant news articles
- **Title**: Clickable link to the source article
- **Summary**: Brief 2-3 sentence summary of the article
- **Sentiment**: Visual indicator (positive ↑, negative ↓, or neutral -)
- **Publication Date**: When the article was published

### Navigating Snapshots

- Use the **left/right arrows** next to the date to view previous snapshots
- The **Refresh** button generates a new snapshot for today's date
- You can only refresh on the current date

## Technical Details

### Database Schema

News snapshots are stored in the `overlord.news_snapshots` table:

```sql
CREATE TABLE overlord.news_snapshots (
    id SERIAL PRIMARY KEY,
    date_generated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gemini_response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

**Backend API Routes** (`/api/news`):

- `GET /snapshots/dates` - Get all available snapshot dates
- `GET /snapshots` - Get all news snapshots
- `GET /snapshots/:date` - Get snapshot for specific date (YYYY-MM-DD)
- `POST /generate` - Generate new snapshot
  - Body: `{ tickers: string[], clientId: string }`
- `GET /progress/:clientId` - SSE endpoint for progress updates
- `DELETE /snapshots/:id` - Delete a snapshot

### Data Structure

**News Snapshot Response**:
```typescript
{
  ticker: string;
  analysisDate: string;
  articles: [
    {
      title: string;
      summary: string;
      link: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      publicationDate?: string;
    }
  ];
  error?: string;
}
```

## Rate Limiting

The system handles Gemini API rate limits by:
- Processing stocks sequentially (not in parallel)
- Adding a 2-second delay between requests
- Automatically retrying after a 10-second wait if rate limited (429 error)
- Displaying rate limit status on the UI

## Files Created/Modified

### Backend
- `database/add_news_snapshots_table.sql` - Database schema
- `backend/src/services/geminiService.ts` - Added `generateNewsAnalysis()` method
- `backend/src/services/newsService.ts` - New service for news operations
- `backend/src/routes/news.ts` - New API routes
- `backend/src/server.ts` - Registered news routes

### Frontend
- `frontend/src/services/newsService.ts` - Frontend service for API calls
- `frontend/src/components/LatestNews.tsx` - Main news component
- `frontend/src/pages/Options.tsx` - Added "Latest News" tab

## Future Enhancements

Potential improvements:
- Add filtering by sentiment (show only positive/negative news)
- Export news snapshots to PDF or email
- Schedule automatic daily news generation
- Add alerts for critical news (e.g., bankruptcy, major lawsuits)
- Add search/filter functionality within snapshots
- Track which news articles you've read

## Troubleshooting

### News Generation Fails
- Check that `GEMINI_API_KEY` is set in `backend/.env`
- Verify database connection is working
- Check backend logs for specific errors

### Rate Limit Errors (429)
- The system will automatically retry after 10 seconds
- If persistent, wait a few minutes before trying again
- Consider reducing the number of stocks in your portfolio for testing

### No News Found
- Some stocks may have limited recent news coverage
- The AI searches for news from the last 1-2 weeks
- Check the article link to verify the source is accessible

## Performance Considerations

- Generating a snapshot for 20 stocks takes approximately 1-2 minutes
- Snapshots are cached in the database to avoid regeneration
- Use the refresh button sparingly to avoid hitting rate limits
- Historical snapshots load instantly from the database
