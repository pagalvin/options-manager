-- Margin Planning Feature Database Schema
-- This schema supports advanced margin planning, borrowing, and tracking

-- Set the search path to use the overlord schema
SET search_path TO overlord;

-- Margin accounts table - track different margin accounts/brokers
CREATE TABLE IF NOT EXISTS margin_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    broker VARCHAR(50) NOT NULL,
    account_number VARCHAR(50),
    interest_rate DECIMAL(6,4) NOT NULL DEFAULT 0.1320, -- 13.2% annual rate
    margin_maintenance_rate DECIMAL(6,4) NOT NULL DEFAULT 0.25, -- 25% maintenance requirement
    initial_margin_rate DECIMAL(6,4) NOT NULL DEFAULT 0.50, -- 50% initial margin requirement
    max_margin_limit DECIMAL(12,2), -- Maximum allowed margin debt
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Margin transactions table - all margin-related transactions
CREATE TABLE IF NOT EXISTS margin_transactions (
    id SERIAL PRIMARY KEY,
    margin_account_id INTEGER REFERENCES margin_accounts(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'DRAW', 'PAYMENT', 'INTEREST', 'FEE'
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    related_transaction_id INTEGER REFERENCES transactions(id), -- Link to main transaction table
    margin_balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
    cash_balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
    interest_rate_applied DECIMAL(6,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Margin daily balances table - daily snapshots for interest calculation
CREATE TABLE IF NOT EXISTS margin_daily_balances (
    id SERIAL PRIMARY KEY,
    margin_account_id INTEGER REFERENCES margin_accounts(id),
    balance_date DATE NOT NULL,
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_interest DECIMAL(12,2) NOT NULL DEFAULT 0,
    cash_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    portfolio_value DECIMAL(12,2), -- Total portfolio value for margin calculations
    margin_requirement DECIMAL(12,2), -- Minimum margin required
    excess_margin DECIMAL(12,2), -- Available margin above requirement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(margin_account_id, balance_date)
);

-- Margin planning scenarios table - for what-if analysis
CREATE TABLE IF NOT EXISTS margin_planning_scenarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    margin_account_id INTEGER REFERENCES margin_accounts(id),
    scenario_date DATE NOT NULL,
    planned_draw_amount DECIMAL(12,2),
    planned_payment_amount DECIMAL(12,2),
    projected_portfolio_value DECIMAL(12,2),
    projected_margin_balance DECIMAL(12,2),
    projected_daily_interest DECIMAL(12,2),
    projected_monthly_interest DECIMAL(12,2),
    projected_annual_interest DECIMAL(12,2),
    margin_utilization_percent DECIMAL(6,2), -- Percentage of available margin used
    risk_level VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Margin alerts table - automated alerts for margin management
CREATE TABLE IF NOT EXISTS margin_alerts (
    id SERIAL PRIMARY KEY,
    margin_account_id INTEGER REFERENCES margin_accounts(id),
    alert_type VARCHAR(50) NOT NULL, -- 'MARGIN_CALL', 'HIGH_UTILIZATION', 'INTEREST_THRESHOLD', 'PAYMENT_DUE'
    threshold_value DECIMAL(12,2),
    threshold_percentage DECIMAL(6,2),
    is_active BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(20) DEFAULT 'DAILY', -- 'DAILY', 'WEEKLY', 'IMMEDIATE'
    last_triggered TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Margin interest rates history table - track changing rates
CREATE TABLE IF NOT EXISTS margin_interest_rates_history (
    id SERIAL PRIMARY KEY,
    margin_account_id INTEGER REFERENCES margin_accounts(id),
    effective_date DATE NOT NULL,
    interest_rate DECIMAL(6,4) NOT NULL,
    rate_type VARCHAR(20) DEFAULT 'VARIABLE', -- 'FIXED', 'VARIABLE', 'PROMOTIONAL'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_margin_transactions_account_date ON margin_transactions(margin_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_margin_transactions_type ON margin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_margin_daily_balances_account_date ON margin_daily_balances(margin_account_id, balance_date);
CREATE INDEX IF NOT EXISTS idx_margin_scenarios_account ON margin_planning_scenarios(margin_account_id);
CREATE INDEX IF NOT EXISTS idx_margin_alerts_account ON margin_alerts(margin_account_id);
CREATE INDEX IF NOT EXISTS idx_margin_rates_account_date ON margin_interest_rates_history(margin_account_id, effective_date);

-- Create triggers for updated_at columns
CREATE TRIGGER update_margin_accounts_updated_at 
    BEFORE UPDATE ON margin_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_margin_planning_scenarios_updated_at 
    BEFORE UPDATE ON margin_planning_scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default margin account
INSERT INTO margin_accounts (name, broker, interest_rate, margin_maintenance_rate, initial_margin_rate)
VALUES ('Primary Trading Account', 'E*TRADE', 0.1320, 0.25, 0.50)
ON CONFLICT DO NOTHING;

-- Insert default alert configurations
INSERT INTO margin_alerts (margin_account_id, alert_type, threshold_percentage, is_active)
SELECT 
    1, -- Assuming first account
    unnest(ARRAY['HIGH_UTILIZATION', 'MARGIN_CALL']),
    unnest(ARRAY[80.0, 110.0]), -- Alert at 80% utilization, margin call at 110%
    true
WHERE EXISTS (SELECT 1 FROM margin_accounts WHERE id = 1)
ON CONFLICT DO NOTHING;

-- Create a view for current margin status
CREATE OR REPLACE VIEW v_current_margin_status AS
SELECT 
    ma.id as account_id,
    ma.name as account_name,
    ma.broker,
    COALESCE(mdb.closing_balance, 0) as current_margin_balance,
    COALESCE(mdb.cash_balance, 0) as current_cash_balance,
    COALESCE(mdb.portfolio_value, 0) as portfolio_value,
    COALESCE(mdb.margin_requirement, 0) as margin_requirement,
    COALESCE(mdb.excess_margin, 0) as excess_margin,
    COALESCE(mdb.daily_interest, 0) as daily_interest,
    (COALESCE(mdb.closing_balance, 0) * ma.interest_rate / 365) as projected_daily_interest,
    (COALESCE(mdb.closing_balance, 0) * ma.interest_rate / 12) as projected_monthly_interest,
    (COALESCE(mdb.closing_balance, 0) * ma.interest_rate) as projected_annual_interest,
    CASE 
        WHEN ma.max_margin_limit > 0 THEN 
            (COALESCE(mdb.closing_balance, 0) / ma.max_margin_limit * 100)
        ELSE 0 
    END as margin_utilization_percent,
    mdb.balance_date as last_updated
FROM margin_accounts ma
LEFT JOIN margin_daily_balances mdb ON ma.id = mdb.margin_account_id 
    AND mdb.balance_date = (
        SELECT MAX(balance_date) 
        FROM margin_daily_balances 
        WHERE margin_account_id = ma.id
    )
WHERE ma.is_active = true;

COMMENT ON TABLE margin_accounts IS 'Margin trading accounts with their configurations and limits';
COMMENT ON TABLE margin_transactions IS 'All margin-related transactions including draws, payments, and interest';
COMMENT ON TABLE margin_daily_balances IS 'Daily snapshots of margin balances for interest calculation and tracking';
COMMENT ON TABLE margin_planning_scenarios IS 'What-if scenarios for margin planning and analysis';
COMMENT ON TABLE margin_alerts IS 'Automated alert configurations for margin management';
COMMENT ON TABLE margin_interest_rates_history IS 'Historical interest rates for margin accounts';
COMMENT ON VIEW v_current_margin_status IS 'Current margin status summary for all active accounts';
