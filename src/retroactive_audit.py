"""
Retroactive audit script for existing Supabase data.

Pulls all missile events from the database and runs them through the
same validation checks used during live collection. This helps find
bad data that was inserted before the validators existed.

Usage:
    python -m src.retroactive_audit

The script prints a full report and optionally flags events that should
be reviewed or removed.
"""

from .supabase_client import get_supabase_client
from .validators import (
    validate_event,
    validate_batch_dedup,
    print_validation_report,
)

TABLE_NAME = "missile_events"


def fetch_all_events() -> list[dict]:
    """
    Pull every missile event from Supabase.

    Supabase limits responses to 1000 rows by default, so we paginate
    through the data in chunks to make sure we get everything.

    Returns:
        list[dict]: All missile events in the database.
    """
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


def run_audit():
    """Main entry point for the retroactive audit."""
    print("=" * 60)
    print("RETROACTIVE DATA QUALITY AUDIT")
    print("Pulling all events from Supabase...")
    print("=" * 60)
    print()

    events = fetch_all_events()
    print(f"Total events in database: {len(events)}")
    print()

    if not events:
        print("No events found. Nothing to audit.")
        return

    # ── Per-event validation ──────────────────────────────────────
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

    # ── Batch-level dedup (across the ENTIRE database) ────────────
    # Group events by day to check for same-day duplicates
    from collections import defaultdict
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
    dedup_upgrades = []
    for event in events:
        eid = event.get("event_id", "unknown")
        if eid in all_dedup_issues:
            event.setdefault("_validation_issues", []).extend(all_dedup_issues[eid])
            # If this event was in "passed" but now has dedup FAILs, move it
            has_fail = any(i.startswith("FAIL") for i in all_dedup_issues[eid])
            if has_fail and event in passed:
                passed.remove(event)
                failed.append(event)
                dedup_upgrades.append(eid)
            elif not has_fail and event in passed:
                passed.remove(event)
                warned.append(event)

    # ── Print the report ──────────────────────────────────────────
    print_validation_report(passed, warned, failed)

    # ── Detailed duplicate groups ─────────────────────────────────
    if dedup_upgrades:
        print(f"\nDuplicate groups detected across database:")
        for eid in dedup_upgrades:
            for event in events:
                if event.get("event_id") == eid:
                    for issue in event.get("_validation_issues", []):
                        if "duplicate" in issue.lower():
                            print(f"  {eid}: {issue}")

    # ── Summary by issue type ─────────────────────────────────────
    issue_counts = {}
    for event in warned + failed:
        for issue in event.get("_validation_issues", []):
            # Extract the issue type (everything after FAIL/WARN prefix up to the first dash or colon)
            key = issue.split("—")[0].strip() if "—" in issue else issue[:60]
            issue_counts[key] = issue_counts.get(key, 0) + 1

    if issue_counts:
        print(f"\nIssue frequency breakdown:")
        for issue_type, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
            print(f"  {count:3d}x  {issue_type}")

    # ── List event IDs that need attention ────────────────────────
    if failed:
        print(f"\nEvent IDs to review/remove ({len(failed)} total):")
        for event in failed:
            eid = event.get("event_id", "unknown")
            sender = event.get("sender_country", "?")
            target = event.get("target_country", "?")
            casualties = event.get("casualties_reported", 0)
            print(f"  {eid}  {sender} -> {target}  (casualties: {casualties})")

    return passed, warned, failed


if __name__ == "__main__":
    run_audit()
