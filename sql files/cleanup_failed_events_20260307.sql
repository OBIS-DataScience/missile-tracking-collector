-- ============================================================
-- One-time cleanup: delete 35 failed events from the data quality audit
-- ============================================================
-- Run: 2026-03-07
-- Reason: These events were flagged by the retroactive data quality audit as:
--   - Duplicates (same sender/target/day/casualties as another event)
--   - Malformed event IDs (e.g., MSL-20260305-190000-001 has too many digits)
--   - Logically impossible data (intercepted_count > missile_count)
--
-- The full audit results are logged in the data_quality_log table.
-- Run this in the Supabase SQL Editor.
-- ============================================================

DELETE FROM missile_events
WHERE event_id IN (
    'MSL-20260228-0800-001',
    'MSL-20260305-190000-001',
    'MSL-20260305-200000-002',
    'MSL-20260305-210000-003',
    'MSL-20260306-020000-004',
    'MSL-20260306-050000-005',
    'MSL-20260301-0600-003',
    'MSL-20260302-0240-011',
    'MSL-20260305-1800-004',
    'MSL-20260305-1900-005',
    'MSL-20260305-2200-002',
    'MSL-20260306-0800-001',
    'MSL-20260306-0900-002',
    'MSL-20260307-0100-003',
    'MSL-20260307-0120-002',
    'MSL-20260307-0130-004',
    'MSL-20260307-0130-003',
    'MSL-20260307-0130-001',
    'MSL-20260307-0200-001',
    'MSL-20260307-0300-005',
    'MSL-20260307-0400-001',
    'MSL-20260307-0200-003',
    'MSL-20260307-0600-001',
    'MSL-20260307-0600-002',
    'MSL-20260307-0600-003',
    'MSL-20260307-0700-001',
    'MSL-20260307-0500-002',
    'MSL-20260307-0120-003',
    'MSL-20260307-0930-005',
    'MSL-20260307-1130-003',
    'MSL-20260307-1130-002',
    'MSL-20260307-1033-001',
    'MSL-20260307-1600-005',
    'MSL-20260307-1030-002',
    'MSL-20260307-1500-003'
);

-- Expected: 35 rows deleted
