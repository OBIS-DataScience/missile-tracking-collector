-- ============================================================
-- Supabase Table Setup for Data Quality Log
-- ============================================================
-- This table records the result of every validation check run
-- against missile events — both during live collection and
-- retroactive audits. Think of it as a "report card" for your
-- data pipeline that you can query and dashboard over time.
--
-- Run this SQL in the Supabase SQL Editor to create the table.
-- Go to: https://supabase.com/dashboard → your project → SQL Editor
-- Paste this entire file and click "Run"
-- ============================================================

CREATE TABLE IF NOT EXISTS data_quality_log (
    -- Internal row ID (auto-generated)
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- When this validation was performed
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Where the check came from
    -- 'live_collection' = during a scheduled cron run
    -- 'retroactive_audit' = from running the audit script manually
    check_source TEXT NOT NULL CHECK (check_source IN ('live_collection', 'retroactive_audit')),

    -- Which collection cycle triggered this check (null for audits)
    collection_cycle TEXT,

    -- The event that was checked
    event_id TEXT NOT NULL,

    -- Did it pass or fail?
    -- 'passed' = no issues at all (clean data)
    -- 'warned' = inserted but had minor issues worth noting
    -- 'failed' = rejected and NOT inserted into missile_events
    result TEXT NOT NULL CHECK (result IN ('passed', 'warned', 'failed')),

    -- All validation issues found (stored as a JSON array of strings)
    -- e.g., ["WARN: missile_count is 0", "WARN: intercepted is True but intercepted_count is 0"]
    issues JSONB DEFAULT '[]'::jsonb,

    -- Quick-reference fields pulled from the event for easy querying
    sender_country TEXT,
    target_country TEXT,
    casualties_reported INTEGER DEFAULT 0,

    -- Auto-updated timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by event_id
CREATE INDEX IF NOT EXISTS idx_dql_event_id ON data_quality_log (event_id);

-- Index for filtering by result (e.g., "show me all failures")
CREATE INDEX IF NOT EXISTS idx_dql_result ON data_quality_log (result);

-- Index for filtering by check source
CREATE INDEX IF NOT EXISTS idx_dql_check_source ON data_quality_log (check_source);

-- Index for time-based queries (e.g., "quality trend this week")
CREATE INDEX IF NOT EXISTS idx_dql_checked_at ON data_quality_log (checked_at DESC);

-- Enable Row Level Security (RLS) — matches the pattern from other tables
ALTER TABLE data_quality_log ENABLE ROW LEVEL SECURITY;

-- Allow read access via the anon/service key
CREATE POLICY "Allow public read access on data_quality_log"
    ON data_quality_log
    FOR SELECT
    USING (true);

-- Allow insert access via the service key
CREATE POLICY "Allow service insert on data_quality_log"
    ON data_quality_log
    FOR INSERT
    WITH CHECK (true);
