-- Options Trading Database Schema
CREATE SCHEMA IF NOT EXISTS overlord;

-- Set the search path to use the overlord schema
SET search_path TO overlord;

-- Securities table (stocks, ETFs, mutual funds)
CREATE TABLE securities (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    security_type VARCHAR(20) NOT NULL, -- 'STOCK', 'ETF', 'MUTUAL_FUND', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (all trading activity)
CREATE TABLE transactions (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_date, calculated_symbol, quantity, amount, price, description)
);

-- Positions table (current holdings)
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    security_id INTEGER REFERENCES securities(id),
    symbol VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    average_cost DECIMAL(12, 4) DEFAULT 0,
    total_invested DECIMAL(12, 2) DEFAULT 0,
    current_value DECIMAL(12, 2) DEFAULT 0,
    unrealized_gain_loss DECIMAL(12, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol)
);

-- Options table (options positions linked to underlying securities)
CREATE TABLE options (
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
CREATE TABLE monthly_performance (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_premium_collected DECIMAL(12, 2) DEFAULT 0,
    total_premium_paid DECIMAL(12, 2) DEFAULT 0,
    net_premium DECIMAL(12, 2) DEFAULT 0,
    realized_gains DECIMAL(12, 2) DEFAULT 0,
    total_roi DECIMAL(8, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- Indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_symbol ON transactions(calculated_symbol);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_options_underlying ON options(underlying_symbol);
CREATE INDEX idx_options_expiration ON options(expiration_date);
CREATE INDEX idx_options_status ON options(status);
CREATE INDEX idx_positions_symbol ON positions(symbol);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_securities_updated_at BEFORE UPDATE ON securities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_performance_updated_at BEFORE UPDATE ON monthly_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
