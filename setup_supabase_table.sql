-- ============================================================
-- Supabase Table Setup for Missile Tracking Collector
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to create the table.
-- Go to: https://supabase.com/dashboard → your project → SQL Editor
-- Paste this entire file and click "Run"
-- ============================================================

CREATE TABLE IF NOT EXISTS missile_events (
    -- Internal Supabase row ID (auto-generated)
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Event Information
    event_id TEXT UNIQUE NOT NULL,
    event_timestamp_utc TIMESTAMPTZ NOT NULL,
    collection_timestamp_utc TIMESTAMPTZ NOT NULL,
    collection_cycle TEXT NOT NULL,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('confirmed', 'likely', 'unverified')),
    source_references JSONB DEFAULT '[]'::jsonb,

    -- Sender (Launching Party)
    sender_country TEXT,
    sender_country_iso TEXT,
    sender_faction TEXT,
    launch_location_name TEXT,
    launch_latitude DOUBLE PRECISION,
    launch_longitude DOUBLE PRECISION,

    -- Receiver (Target)
    target_country TEXT,
    target_country_iso TEXT,
    target_location_name TEXT,
    target_latitude DOUBLE PRECISION,
    target_longitude DOUBLE PRECISION,
    target_type TEXT,

    -- Missile Information
    missile_name TEXT,
    missile_type TEXT,
    missile_origin_country TEXT,
    missile_count INTEGER,
    missile_range_km DOUBLE PRECISION,
    warhead_type TEXT,

    -- Outcome
    intercepted BOOLEAN,
    intercepted_count INTEGER,
    interception_system TEXT,
    impact_confirmed BOOLEAN,
    casualties_reported INTEGER,
    damage_description TEXT,

    -- Conflict Context
    conflict_name TEXT,
    conflict_parties JSONB DEFAULT '[]'::jsonb,
    escalation_note TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on event_timestamp for fast time-based queries (the globe visualization)
CREATE INDEX IF NOT EXISTS idx_missile_events_timestamp
    ON missile_events (event_timestamp_utc DESC);

-- Index on collection_cycle for grouping by collection run
CREATE INDEX IF NOT EXISTS idx_missile_events_cycle
    ON missile_events (collection_cycle);

-- Index on confidence_level for filtering
CREATE INDEX IF NOT EXISTS idx_missile_events_confidence
    ON missile_events (confidence_level);

-- Index on sender/target countries for geographic queries
CREATE INDEX IF NOT EXISTS idx_missile_events_sender
    ON missile_events (sender_country_iso);

CREATE INDEX IF NOT EXISTS idx_missile_events_target
    ON missile_events (target_country_iso);

-- Auto-update the updated_at timestamp whenever a row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_missile_events_updated_at
    BEFORE UPDATE ON missile_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - required by Supabase
ALTER TABLE missile_events ENABLE ROW LEVEL SECURITY;

-- Policy: allow public read access (for the visualization globe)
-- The anon key can only SELECT — this is safe because the data is public
CREATE POLICY "Allow public read access"
    ON missile_events
    FOR SELECT
    USING (true);

-- Only the service_role key (used by GitHub Actions cron job) can write
-- The anon key in the browser CANNOT insert, update, or delete
CREATE POLICY "Allow service role inserts"
    ON missile_events
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role updates"
    ON missile_events
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Block all deletes"
    ON missile_events
    FOR DELETE
    TO service_role
    USING (true);
