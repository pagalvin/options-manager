-- Margin Opportunity Planner Database Schema
-- Drop existing margin planning tables if they exist
DROP TABLE IF EXISTS overlord.margin_plan CASCADE;
DROP TABLE IF EXISTS overlord.margin_planning_options CASCADE;
DROP TABLE IF EXISTS overlord.margin_master CASCADE;

-- Drop the old margin planning tables we created earlier
DROP TABLE IF EXISTS overlord.margin_planning_scenarios CASCADE;
DROP TABLE IF EXISTS overlord.margin_alerts CASCADE;
DROP TABLE IF EXISTS overlord.margin_daily_balances CASCADE;
DROP TABLE IF EXISTS overlord.margin_transactions CASCADE;
DROP TABLE IF EXISTS overlord.margin_accounts CASCADE;
DROP TABLE IF EXISTS overlord.margin_interest_rates_history CASCADE;

-- Create margin master table for current margin status
CREATE TABLE overlord.margin_master (
    id SERIAL PRIMARY KEY,
    current_outstanding_margin DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_margin_rate DECIMAL(5,3) NOT NULL DEFAULT 10.200,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create margin planning options table
CREATE TABLE overlord.margin_planning_options (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    strike_date DATE NOT NULL,
    strike_price DECIMAL(10,2) NOT NULL,
    total_contracts INTEGER NOT NULL DEFAULT 1,
    rollable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create margin plan table for weekly planning
CREATE TABLE overlord.margin_plan (
    id SERIAL PRIMARY KEY,
    week_ending DATE NOT NULL,
    proposed_margin DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_ending)
);

-- Create indexes for better performance
CREATE INDEX idx_margin_planning_options_strike_date ON overlord.margin_planning_options(strike_date);
CREATE INDEX idx_margin_planning_options_symbol ON overlord.margin_planning_options(symbol);
CREATE INDEX idx_margin_planning_options_rollable ON overlord.margin_planning_options(rollable);
CREATE INDEX idx_margin_plan_week_ending ON overlord.margin_plan(week_ending);

-- Create a view for the planning grid that calculates assignments and costs
CREATE OR REPLACE VIEW overlord.margin_planning_grid AS
SELECT 
    mp.week_ending,
    COALESCE(assignments.likely_assignments, 0) AS likely_assignments,
    COALESCE(assignments.symbols_not_rollable, '') AS symbols_not_rollable,
    mp.proposed_margin,
    CASE 
        WHEN mp.proposed_margin IS NOT NULL AND mm.current_margin_rate IS NOT NULL 
        THEN ROUND((mp.proposed_margin * mm.current_margin_rate / 100) / 52, 2)
        ELSE NULL 
    END AS margin_cost_weekly,
    mp.notes,
    mp.id as plan_id
FROM overlord.margin_plan mp
CROSS JOIN (SELECT current_margin_rate FROM overlord.margin_master ORDER BY last_updated DESC LIMIT 1) mm
LEFT JOIN (
    SELECT 
        DATE_TRUNC('week', strike_date)::date + INTERVAL '6 days' as week_ending,
        SUM(strike_price * total_contracts * 100) as likely_assignments,
        STRING_AGG(DISTINCT symbol, ', ' ORDER BY symbol) as symbols_not_rollable
    FROM overlord.margin_planning_options 
    WHERE rollable = false
    GROUP BY DATE_TRUNC('week', strike_date)::date + INTERVAL '6 days'
) assignments ON mp.week_ending = assignments.week_ending
ORDER BY mp.week_ending;

-- Insert default margin master record
INSERT INTO overlord.margin_master (current_outstanding_margin, current_margin_rate, notes) 
VALUES (0, 10.200, 'Initial setup');

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION overlord.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_margin_planning_options_updated_at 
    BEFORE UPDATE ON overlord.margin_planning_options 
    FOR EACH ROW EXECUTE FUNCTION overlord.update_updated_at_column();

CREATE TRIGGER update_margin_plan_updated_at 
    BEFORE UPDATE ON overlord.margin_plan 
    FOR EACH ROW EXECUTE FUNCTION overlord.update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON overlord.margin_master TO postgres;
GRANT ALL PRIVILEGES ON overlord.margin_planning_options TO postgres;
GRANT ALL PRIVILEGES ON overlord.margin_plan TO postgres;
GRANT ALL PRIVILEGES ON overlord.margin_planning_grid TO postgres;
GRANT USAGE, SELECT ON SEQUENCE overlord.margin_master_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE overlord.margin_planning_options_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE overlord.margin_plan_id_seq TO postgres;
