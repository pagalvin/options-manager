-- Projection planning tables
CREATE SCHEMA IF NOT EXISTS overlord;

-- Ensure timestamp trigger helper exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS overlord.projection (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    assumed_roc_percent NUMERIC(9,4) NOT NULL DEFAULT 0,
    projection_start_date DATE NOT NULL,
    starting_capital NUMERIC(18,2) NOT NULL DEFAULT 0,
    monthly_infusion NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS overlord.projection_period (
    id SERIAL PRIMARY KEY,
    projection_id INTEGER NOT NULL REFERENCES overlord.projection(id) ON DELETE CASCADE,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('MONTH','YEAR')),
    period_index INTEGER NOT NULL,
    period_start DATE,
    period_end DATE,
    expected_balance NUMERIC(18,2),
    actual_balance NUMERIC(18,2),
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (projection_id, period_type, period_index)
);

CREATE INDEX IF NOT EXISTS idx_projection_period_projection_type
    ON overlord.projection_period (projection_id, period_type);

DROP TRIGGER IF EXISTS update_projection_updated_at ON overlord.projection;
CREATE TRIGGER update_projection_updated_at
BEFORE UPDATE ON overlord.projection
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projection_period_updated_at ON overlord.projection_period;
CREATE TRIGGER update_projection_period_updated_at
BEFORE UPDATE ON overlord.projection_period
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
