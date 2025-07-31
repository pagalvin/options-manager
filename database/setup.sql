-- Database setup script for Options Trading ROI Tracker
-- Run this script in your PostgreSQL database

-- First, connect to your PostgreSQL server and ensure you're in the right database
-- Example: psql -h localhost -U postgres -d postgres

-- Check if the overlord schema exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'overlord') THEN
        RAISE NOTICE 'Creating overlord schema...';
        CREATE SCHEMA overlord;
    ELSE
        RAISE NOTICE 'Schema overlord already exists.';
    END IF;
END $$;

-- Set search path
SET search_path TO overlord, public;

-- Create the complete schema
-- Securities table (stocks, ETFs, mutual funds)
CREATE TABLE IF NOT EXISTS securities (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    security_type VARCHAR(20) NOT NULL, -- 'STOCK', 'ETF', 'MUTUAL_FUND', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (all trading activity)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'Bought', 'Sold', 'Sold Short', 'Bought To Cover', 'Option Assigned', etc.
    security_type VARCHAR(20) NOT NULL, -- 'EQ', 'OPTN', etc.
    calculated_symbol VARCHAR(50) NOT NULL,
    symbol VARCHAR(255), -- Complex field from eTrade
    quantity INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- Money paid/received
    price DECIMAL(12, 4) NOT NULL, -- Price per share/contract
    commission DECIMAL(8, 2) DEFAULT 0,
    strike DECIMAL(12, 4) DEFAULT 0, -- Strike price for options
    description TEXT,
    etrade_unique_id VARCHAR(255), -- To prevent duplicates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for duplicate prevention
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_unique_constraint'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_unique_constraint 
        UNIQUE(transaction_date, calculated_symbol, quantity, amount, price, description);
    END IF;
END $$;

-- Positions table (current holdings)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    security_id INTEGER REFERENCES securities(id),
    symbol VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    average_cost DECIMAL(12, 4) DEFAULT 0,
    total_invested DECIMAL(12, 2) DEFAULT 0,
    current_value DECIMAL(12, 2) DEFAULT 0,
    unrealized_gain_loss DECIMAL(12, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for positions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'positions_symbol_unique'
    ) THEN
        ALTER TABLE positions 
        ADD CONSTRAINT positions_symbol_unique 
        UNIQUE(symbol);
    END IF;
END $$;

-- Options table (options positions linked to underlying securities)
CREATE TABLE IF NOT EXISTS options (
    id SERIAL PRIMARY KEY,
    underlying_security_id INTEGER REFERENCES securities(id),
    underlying_symbol VARCHAR(50) NOT NULL,
    option_symbol VARCHAR(255) NOT NULL,
    option_type VARCHAR(10) NOT NULL, -- 'CALL' or 'PUT'
    strike_price DECIMAL(12, 4) NOT NULL,
    expiration_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    premium_collected DECIMAL(12, 2) DEFAULT 0,
    premium_paid DECIMAL(12, 2) DEFAULT 0,
    net_premium DECIMAL(12, 2) DEFAULT 0,
    is_covered BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'ASSIGNED', 'EXPIRED'
    opened_date DATE,
    closed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly performance summary
CREATE TABLE IF NOT EXISTS monthly_performance (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_premium_collected DECIMAL(12, 2) DEFAULT 0,
    total_premium_paid DECIMAL(12, 2) DEFAULT 0,
    net_premium DECIMAL(12, 2) DEFAULT 0,
    realized_gains DECIMAL(12, 2) DEFAULT 0,
    total_roi DECIMAL(8, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for monthly performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'monthly_performance_year_month_unique'
    ) THEN
        ALTER TABLE monthly_performance 
        ADD CONSTRAINT monthly_performance_year_month_unique 
        UNIQUE(year, month);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(calculated_symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_options_underlying ON options(underlying_symbol);
CREATE INDEX IF NOT EXISTS idx_options_expiration ON options(expiration_date);
CREATE INDEX IF NOT EXISTS idx_options_status ON options(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_securities_updated_at ON securities;
CREATE TRIGGER update_securities_updated_at 
    BEFORE UPDATE ON securities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_options_updated_at ON options;
CREATE TRIGGER update_options_updated_at 
    BEFORE UPDATE ON options 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_performance_updated_at ON monthly_performance;
CREATE TRIGGER update_monthly_performance_updated_at 
    BEFORE UPDATE ON monthly_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Setup verification:' as status;
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'overlord'
ORDER BY tablename;

-- Show table counts
SELECT 'Table counts:' as info;
SELECT 
    'securities' as table_name, 
    COUNT(*) as count 
FROM securities
UNION ALL
SELECT 
    'transactions' as table_name, 
    COUNT(*) as count 
FROM transactions
UNION ALL
SELECT 
    'positions' as table_name, 
    COUNT(*) as count 
FROM positions
UNION ALL
SELECT 
    'options' as table_name, 
    COUNT(*) as count 
FROM options
UNION ALL
SELECT 
    'monthly_performance' as table_name, 
    COUNT(*) as count 
FROM monthly_performance;

-- Display setup completion message
SELECT 'Database setup completed successfully!' as message;
