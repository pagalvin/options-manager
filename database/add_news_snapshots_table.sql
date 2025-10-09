-- Create news_snapshots table to store stock news analysis from Gemini
-- This table stores news snapshots for all stock positions

CREATE TABLE IF NOT EXISTS overlord.news_snapshots (
    id SERIAL PRIMARY KEY,
    date_generated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gemini_response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date_generated for faster queries
CREATE INDEX IF NOT EXISTS idx_news_snapshots_date_generated 
ON overlord.news_snapshots(date_generated);

-- Add a comment to the table
COMMENT ON TABLE overlord.news_snapshots IS 'Stores news snapshot data from Gemini AI for stock portfolio analysis';
COMMENT ON COLUMN overlord.news_snapshots.gemini_response IS 'JSON structure: { symbol: string, articles: [{ title, summary, link, sentiment }], analysisDate: timestamp }';
