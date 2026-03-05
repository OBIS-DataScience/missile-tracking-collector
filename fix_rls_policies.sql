-- ============================================================
-- RLS Security Fix — Lock Down Write Access
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → paste → Run
--
-- WHAT THIS DOES:
-- Right now, anyone with the public anon key can INSERT, UPDATE,
-- and DELETE data in both tables. This fix restricts write access
-- to the service_role key only (used by the GitHub Actions cron job).
-- Public read access stays — the globe visualization needs that.
-- ============================================================

-- ========================
-- Fix: missile_events table
-- ========================

-- Remove the old policies that let anyone write
DROP POLICY IF EXISTS "Allow authenticated inserts" ON missile_events;
DROP POLICY IF EXISTS "Allow authenticated updates" ON missile_events;

-- Only the service_role key (cron job) can insert new events
CREATE POLICY "Allow service role inserts"
    ON missile_events
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Only the service_role key (cron job) can update existing events
CREATE POLICY "Allow service role updates"
    ON missile_events
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Block deletes entirely — append-only data, no one should delete
CREATE POLICY "Block all deletes"
    ON missile_events
    FOR DELETE
    TO service_role
    USING (true);

-- =============================
-- Fix: predicted_attacks table
-- =============================

-- Remove the old policies that let anyone write or delete
DROP POLICY IF EXISTS "Allow insert predicted attacks" ON predicted_attacks;
DROP POLICY IF EXISTS "Allow delete predicted attacks" ON predicted_attacks;

-- Only the service_role key (simulation engine) can insert predictions
CREATE POLICY "Allow service role insert predictions"
    ON predicted_attacks
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Only the service_role key can delete old predictions (before refreshing)
CREATE POLICY "Allow service role delete predictions"
    ON predicted_attacks
    FOR DELETE
    TO service_role
    USING (true);

-- Only the service_role key can update predictions
CREATE POLICY "Allow service role update predictions"
    ON predicted_attacks
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);
