-- Add implied volatility field to manual_options_analysis table
-- This script adds the implied_volatility field for storing IV data from E*TRADE

-- Set search path
SET search_path TO overlord, public;

-- Add implied_volatility column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'implied_volatility'
    ) THEN
        ALTER TABLE manual_options_analysis 
        ADD COLUMN implied_volatility DECIMAL(8, 6) DEFAULT NULL;
        RAISE NOTICE 'Added implied_volatility column to manual_options_analysis table';
    ELSE
        RAISE NOTICE 'Column implied_volatility already exists';
    END IF;
END $$;

-- Add comment to the new column
COMMENT ON COLUMN manual_options_analysis.implied_volatility IS 'Implied volatility as decimal (e.g., 0.25 for 25%)';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'overlord' 
AND table_name = 'manual_options_analysis' 
AND column_name = 'implied_volatility';

SELECT 'Implied volatility field migration completed successfully!' as message;
