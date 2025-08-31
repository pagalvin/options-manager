-- Fix column definitions for manual_options_analysis table
-- This script fixes the implied_volatility and delta column definitions to handle larger values

-- Set search path
SET search_path TO overlord, public;

-- Fix implied_volatility column to handle percentage values (0-999.99%)
DO $$
BEGIN
    -- Check if the column exists and needs to be modified
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'implied_volatility'
    ) THEN
        -- Alter the column to handle larger values (percentage format)
        ALTER TABLE overlord.manual_options_analysis 
        ALTER COLUMN implied_volatility TYPE DECIMAL(8, 2);
        RAISE NOTICE 'Updated implied_volatility column to DECIMAL(8,2) to handle percentage values';
    ELSE
        RAISE NOTICE 'implied_volatility column does not exist';
    END IF;
END $$;

-- Fix delta column to handle larger values (0-99.9999)
DO $$
BEGIN
    -- Check if the column exists and needs to be modified
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'delta'
    ) THEN
        -- Alter the column to handle larger values
        ALTER TABLE overlord.manual_options_analysis 
        ALTER COLUMN delta TYPE DECIMAL(8, 4);
        RAISE NOTICE 'Updated delta column to DECIMAL(8,4) to handle larger values';
    ELSE
        RAISE NOTICE 'delta column does not exist';
    END IF;
END $$;

-- Update comments
COMMENT ON COLUMN overlord.manual_options_analysis.implied_volatility IS 'Implied volatility as percentage (e.g., 25.50 for 25.5%)';
COMMENT ON COLUMN overlord.manual_options_analysis.delta IS 'Option delta value (e.g., 0.6500 for 65% price sensitivity)';

-- Verify the columns were updated
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
AND column_name IN ('implied_volatility', 'delta')
ORDER BY column_name;

SELECT 'Column definitions fixed successfully!' as message;
