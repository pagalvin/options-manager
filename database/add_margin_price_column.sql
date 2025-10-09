-- Add margin_price_per_share column to overlord.manual_options_analysis table
-- This column stores the effective price per share when buying on margin

-- Set search path
SET search_path TO overlord, public;

-- Add margin_price_per_share column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'overlord'
        AND table_name = 'manual_options_analysis'
        AND column_name = 'margin_price_per_share'
    ) THEN
        ALTER TABLE overlord.manual_options_analysis
        ADD COLUMN margin_price_per_share DECIMAL(12, 4) DEFAULT NULL;
        
        RAISE NOTICE 'Added margin_price_per_share column to overlord.manual_options_analysis table';
    ELSE
        RAISE NOTICE 'margin_price_per_share column already exists in overlord.manual_options_analysis table';
    END IF;
END $$;

-- Add comment to the new column
COMMENT ON COLUMN overlord.manual_options_analysis.margin_price_per_share IS 'Effective price per share when buying on margin (e.g., $3.68 for a stock trading at $12.66)';

-- Verify the column was added
SELECT
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'overlord'
AND table_name = 'manual_options_analysis'
AND column_name = 'margin_price_per_share';

SELECT 'Margin price per share column added successfully!' as message;
