-- Rename margin_price_per_share to margin_requirement_percentage and update values
-- This converts from price per share to a percentage (0-100)

-- First, check if the old column exists and new column doesn't
DO $$
BEGIN
    -- Check if we need to do the migration
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'margin_price_per_share'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'margin_requirement_percentage'
    ) THEN
        
        -- Add new column for margin requirement percentage
        ALTER TABLE overlord.manual_options_analysis 
        ADD COLUMN margin_requirement_percentage DECIMAL(5, 2) DEFAULT NULL;
        
        -- Convert existing margin_price_per_share values to percentages
        -- Formula: (margin_price_per_share / market_price) * 100
        UPDATE overlord.manual_options_analysis 
        SET margin_requirement_percentage = (margin_price_per_share / market_price) * 100
        WHERE margin_price_per_share IS NOT NULL 
        AND market_price IS NOT NULL 
        AND market_price > 0;
        
        -- Drop the old column
        ALTER TABLE overlord.manual_options_analysis 
        DROP COLUMN margin_price_per_share;
        
        RAISE NOTICE 'Successfully migrated margin_price_per_share to margin_requirement_percentage';
        
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'overlord' 
        AND table_name = 'manual_options_analysis' 
        AND column_name = 'margin_requirement_percentage'
    ) THEN
        RAISE NOTICE 'Migration already completed - margin_requirement_percentage column exists';
    ELSE
        RAISE NOTICE 'Original margin_price_per_share column not found - migration may have already been run';
    END IF;
END
$$;

-- Add comment to the new column
COMMENT ON COLUMN overlord.manual_options_analysis.margin_requirement_percentage IS 'Margin requirement as a percentage (0-100). For example, 30.0 means 30% margin requirement.';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'overlord' 
AND table_name = 'manual_options_analysis' 
AND column_name = 'margin_requirement_percentage';