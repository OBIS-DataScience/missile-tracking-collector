"""
One-time cleanup script: delete failed events and log the retroactive audit.

This script:
1. Runs the full retroactive audit against all existing Supabase data
2. Deletes events that failed validation (duplicates, bad IDs, etc.)
3. Logs all results to the data_quality_log table

IMPORTANT: You must create the data_quality_log table FIRST by running
the SQL in 'sql files/setup_data_quality_log.sql' in the Supabase SQL Editor.

Usage:
    python -m src.cleanup_and_log
"""

from .supabase_client import get_supabase_client
from .validators import (
    validate_event,
    validate_batch_dedup,
    print_validation_report,
    log_quality_results,
)
from collections import defaultdict

TABLE_NAME = "missile_events"


def fetch_all_events() -> list[dict]:
    """Pull every missile event from Supabase, paginating through all rows."""
    client = get_supabase_client()
    all_events = []
    page_size = 1000
    offset = 0

    while True:
        result = (
            client.table(TABLE_NAME)
            .select("*")
            .order("event_timestamp_utc", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if not result.data:
            break
        all_events.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size

    return all_events


def run_cleanup():
    """Main entry point for the cleanup + logging script."""
    print("=" * 60)
    print("CLEANUP & RETROACTIVE AUDIT LOG")
    print("=" * 60)
    print()

    # Pull all events
    events = fetch_all_events()
    print(f"Total events in database: {len(events)}")
    print()

    if not events:
        print("No events found. Nothing to do.")
        return

    # ── Per-event validation ──
    passed = []
    warned = []
    failed = []

    for event in events:
        event_passed, issues = validate_event(event)
        event["_validation_issues"] = issues

        if not event_passed:
            failed.append(event)
        elif issues:
            warned.append(event)
        else:
            passed.append(event)

    # ── Batch-level dedup (across entire database, grouped by day) ──
    events_by_day = defaultdict(list)
    for event in events:
        ts = event.get("event_timestamp_utc", "")
        day = ts[:10] if ts else "unknown"
        events_by_day[day].append(event)

    all_dedup_issues = {}
    for day, day_events in events_by_day.items():
        if len(day_events) > 1:
            batch_issues = validate_batch_dedup(day_events)
            all_dedup_issues.update(batch_issues)

    # Merge dedup issues into per-event results
    for event in events:
        eid = event.get("event_id", "unknown")
        if eid in all_dedup_issues:
            event.setdefault("_validation_issues", []).extend(all_dedup_issues[eid])
            has_fail = any(i.startswith("FAIL") for i in all_dedup_issues[eid])
            if has_fail and event in passed:
                passed.remove(event)
                failed.append(event)
            elif not has_fail and event in passed:
                passed.remove(event)
                warned.append(event)

    # Print the report
    print_validation_report(passed, warned, failed)

    # ── Log all results to data_quality_log ──
    print("\nLogging results to data_quality_log table...")
    log_quality_results(passed, warned, failed, "retroactive_audit")

    # ── Delete failed events from missile_events ──
    if not failed:
        print("\nNo events to delete. Database is clean!")
        return

    print(f"\nDeleting {len(failed)} failed events from missile_events...")
    client = get_supabase_client()
    deleted_count = 0
    error_count = 0

    for event in failed:
        eid = event.get("event_id", "unknown")
        try:
            client.table(TABLE_NAME).delete().eq("event_id", eid).execute()
            sender = event.get("sender_country", "?")
            target = event.get("target_country", "?")
            print(f"  DELETED {eid}  ({sender} -> {target})")
            deleted_count += 1
        except Exception as e:
            print(f"  ERROR deleting {eid}: {e}")
            error_count += 1

    print()
    print("=" * 60)
    print(f"CLEANUP COMPLETE")
    print(f"  Deleted:  {deleted_count}")
    print(f"  Errors:   {error_count}")
    print(f"  Remaining events: {len(events) - deleted_count}")
    print("=" * 60)


if __name__ == "__main__":
    run_cleanup()
