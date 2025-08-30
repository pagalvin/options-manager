-- Add delta column to overlord.manual_options_analysis table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manual_options_analysis' 
        AND column_name = 'delta'
        AND table_schema = 'overlord'
    ) THEN
        ALTER TABLE overlord.manual_options_analysis 
        ADD COLUMN delta DECIMAL(6,4) NULL;
        
        RAISE NOTICE 'Added delta column to overlord.manual_options_analysis table';
    ELSE
        RAISE NOTICE 'Delta column already exists in overlord.manual_options_analysis table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'manual_options_analysis' 
AND table_schema = 'overlord'
AND column_name IN ('delta', 'implied_volatility')
ORDER BY column_name;
