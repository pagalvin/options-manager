-- Create notes table for the Notes Feature
CREATE TABLE IF NOT EXISTS overlord.notes (
    id SERIAL PRIMARY KEY,
    date_created TIMESTAMP NOT NULL DEFAULT NOW(),
    date_modified TIMESTAMP NOT NULL DEFAULT NOW(),
    key_date DATE,
    symbol VARCHAR(16),
    note_type VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    body TEXT NOT NULL
    -- user_id INT, -- Uncomment if multi-user support is needed
    -- CONSTRAINT fk_symbol FOREIGN KEY (symbol) REFERENCES overlord.transactions(calculated_symbol) ON DELETE SET NULL
);

-- Create note_types table for dropdown (optional, for type management)
CREATE TABLE IF NOT EXISTS overlord.note_types (
    id SERIAL PRIMARY KEY,
    note_type VARCHAR(64) UNIQUE NOT NULL
    -- user_id INT -- Uncomment if multi-user support is needed
);

-- Indexes for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_notes_key_date ON overlord.notes(key_date);
CREATE INDEX IF NOT EXISTS idx_notes_symbol ON overlord.notes(symbol);
CREATE INDEX IF NOT EXISTS idx_notes_note_type ON overlord.notes(note_type);
