-- ============================================================
-- Supabase Table Setup for Monte Carlo Predicted Attacks
-- ============================================================
-- Run this SQL in the Supabase SQL Editor AFTER the missile_events
-- table already exists.
-- Go to: https://supabase.com/dashboard -> your project -> SQL Editor
-- Paste this entire file and click "Run"
-- ============================================================

CREATE TABLE IF NOT EXISTS predicted_attacks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Prediction metadata
    prediction_id TEXT UNIQUE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    simulation_runs INTEGER NOT NULL,

    -- Predicted attack details
    sender_country TEXT NOT NULL,
    sender_country_iso TEXT,
    target_country TEXT NOT NULL,
    target_country_iso TEXT,
    missile_type TEXT,

    -- Predicted locations (weighted average of historical data)
    launch_latitude DOUBLE PRECISION,
    launch_longitude DOUBLE PRECISION,
    target_latitude DOUBLE PRECISION,
    target_longitude DOUBLE PRECISION,

    -- Probability and confidence
    probability DOUBLE PRECISION NOT NULL,
    sample_count INTEGER NOT NULL,
    historical_frequency INTEGER NOT NULL,

    -- Time prediction
    predicted_window_start TIMESTAMPTZ,
    predicted_window_end TIMESTAMPTZ,
    peak_hour_utc INTEGER,

    -- Context
    reasoning TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast frontend reads (highest probability first)
CREATE INDEX IF NOT EXISTS idx_predicted_attacks_probability
    ON predicted_attacks (probability DESC);

-- Index for cleanup (delete old predictions before inserting new ones)
CREATE INDEX IF NOT EXISTS idx_predicted_attacks_generated
    ON predicted_attacks (generated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trigger_update_predicted_attacks_updated_at
    BEFORE UPDATE ON predicted_attacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies — same pattern as missile_events
ALTER TABLE predicted_attacks ENABLE ROW LEVEL SECURITY;

-- Public can read predictions (the globe needs this)
CREATE POLICY "Allow public read access"
    ON predicted_attacks FOR SELECT USING (true);

-- Only the service_role key (simulation engine in GitHub Actions) can write
CREATE POLICY "Allow service role insert predictions"
    ON predicted_attacks FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role delete predictions"
    ON predicted_attacks FOR DELETE TO service_role USING (true);

CREATE POLICY "Allow service role update predictions"
    ON predicted_attacks FOR UPDATE TO service_role USING (true) WITH CHECK (true);
