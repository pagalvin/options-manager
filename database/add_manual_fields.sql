-- Add manual fields to positions table
-- This script adds the missing manual fields that are being used in the application

-- Set search path
SET search_path TO overlord, public;

-- Add manual_avg_strike_price column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'positions' 
        AND column_name = 'manual_avg_strike_price'
    ) THEN
        ALTER TABLE positions 
        ADD COLUMN manual_avg_strike_price DECIMAL(12, 4) DEFAULT NULL;
        RAISE NOTICE 'Added manual_avg_strike_price column to positions table';
    ELSE
        RAISE NOTICE 'Column manual_avg_strike_price already exists';
    END IF;
END $$;

-- Add manual_option_contracts column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'positions' 
        AND column_name = 'manual_option_contracts'
    ) THEN
        ALTER TABLE positions 
        ADD COLUMN manual_option_contracts INTEGER DEFAULT NULL;
        RAISE NOTICE 'Added manual_option_contracts column to positions table';
    ELSE
        RAISE NOTICE 'Column manual_option_contracts already exists';
    END IF;
END $$;

-- Add recommended_weekly_premium column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'positions' 
        AND column_name = 'recommended_weekly_premium'
    ) THEN
        ALTER TABLE positions 
        ADD COLUMN recommended_weekly_premium DECIMAL(12, 4) DEFAULT NULL;
        RAISE NOTICE 'Added recommended_weekly_premium column to positions table';
    ELSE
        RAISE NOTICE 'Column recommended_weekly_premium already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'overlord' 
AND table_name = 'positions' 
AND column_name IN ('manual_avg_strike_price', 'manual_option_contracts', 'recommended_weekly_premium')
ORDER BY column_name;

SELECT 'Manual fields migration completed successfully!' as message;
