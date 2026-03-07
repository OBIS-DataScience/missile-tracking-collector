"""
Data quality validators for missile events.

This module acts like a "bouncer" — every event must pass through validation
before it gets inserted into Supabase. Events that fail critical checks are
rejected entirely; events with minor issues get flagged with warnings but
still pass through.

Each validator function returns a tuple: (is_valid, list_of_issues)
- is_valid: True if the event can be inserted, False if it should be rejected
- list_of_issues: Human-readable strings describing what's wrong

The main entry point is validate_event(), which runs all checks.
"""

import json
import re
from datetime import datetime, timezone
from collections import Counter


# ── Valid enum values (the AI must pick from these lists) ──────────────

VALID_CONFIDENCE_LEVELS = {"confirmed", "likely", "unverified"}

VALID_MISSILE_TYPES = {
    "ballistic", "cruise", "hypersonic", "drone_kamikaze",
    "anti_ship", "icbm", "short_range", "medium_range",
    "long_range", "unknown",
}

VALID_TARGET_TYPES = {
    "military_base", "infrastructure", "civilian_area",
    "government", "naval", "airfield", "unknown",
}

VALID_WARHEAD_TYPES = {
    "conventional", "cluster", "thermobaric", "nuclear", "unknown",
}

# ISO 3166-1 alpha-3 codes for countries relevant to the conflicts we track.
# Not an exhaustive list — just the ones the AI should be using.
VALID_ISO3_CODES = {
    "AFG", "ARE", "AUS", "AUT", "AZE", "BEL", "BGR", "BHR", "BLR", "CAN",
    "CHN", "CYP", "CZE", "DEU", "DNK", "EGY", "ESP", "EST", "FIN", "FRA",
    "GBR", "GEO", "GRC", "HRV", "HUN", "IND", "IRN", "IRQ", "ISR", "ITA",
    "JOR", "JPN", "KAZ", "KGZ", "KOR", "KWT", "LBN", "LBY", "LTU", "LVA",
    "MDA", "MKD", "MNE", "NLD", "NOR", "OMN", "PAK", "POL", "PRT", "PSE",
    "QAT", "ROU", "RUS", "SAU", "SDN", "SRB", "SVK", "SVN", "SWE", "SYR",
    "TJK", "TKM", "TUR", "UKR", "USA", "UZB", "YEM",
}

# Approximate bounding boxes for key countries (lat_min, lat_max, lon_min, lon_max).
# Used for a rough "does this coordinate actually fall in this country?" check.
# These are generous bounds — they won't catch everything, but they'll catch
# obvious errors like "Ukraine" with coordinates in South America.
COUNTRY_BOUNDS = {
    "UKR": (44.0, 53.0, 22.0, 41.0),
    "RUS": (41.0, 82.0, 19.0, 180.0),
    "ISR": (29.0, 34.0, 34.0, 36.0),
    "IRN": (25.0, 40.0, 44.0, 64.0),
    "YEM": (12.0, 19.0, 42.0, 55.0),
    "LBN": (33.0, 35.0, 35.0, 37.0),
    "SYR": (32.0, 38.0, 35.0, 43.0),
    "IRQ": (29.0, 38.0, 38.0, 49.0),
    "SAU": (16.0, 33.0, 34.0, 56.0),
    "ARE": (22.0, 27.0, 51.0, 57.0),
    "PSE": (31.0, 33.0, 34.0, 36.0),
}

# ── Event ID format ───────────────────────────────────────────────────

EVENT_ID_PATTERN = re.compile(r"^MSL-\d{8}-\d{4}-\d{3}$")


# ── Individual validators ─────────────────────────────────────────────

def validate_event_id(event: dict) -> list[str]:
    """Check that event_id matches our MSL-YYYYMMDD-HHMM-XXX format."""
    issues = []
    eid = event.get("event_id", "")
    if not eid:
        issues.append("FAIL: event_id is missing")
    elif not EVENT_ID_PATTERN.match(eid):
        issues.append(f"FAIL: event_id '{eid}' does not match MSL-YYYYMMDD-HHMM-XXX format")
    return issues


def validate_timestamp(event: dict) -> list[str]:
    """Check that the event timestamp is valid, in 2026, and not in the future."""
    issues = []
    ts = event.get("event_timestamp_utc", "")
    if not ts:
        issues.append("FAIL: event_timestamp_utc is missing")
        return issues

    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        issues.append(f"FAIL: event_timestamp_utc '{ts}' is not valid ISO 8601")
        return issues

    if dt.year != 2026:
        issues.append(f"FAIL: event is from {dt.year}, not 2026")

    if dt > datetime.now(timezone.utc):
        issues.append(f"FAIL: event_timestamp_utc is in the future ({ts})")

    if dt < datetime(2026, 2, 27, tzinfo=timezone.utc):
        issues.append(f"WARN: event is before Feb 27, 2026 ({ts})")

    return issues


def validate_enums(event: dict) -> list[str]:
    """Check that categorical fields use values from our allowed lists."""
    issues = []

    cl = event.get("confidence_level", "")
    if cl not in VALID_CONFIDENCE_LEVELS:
        issues.append(f"FAIL: confidence_level '{cl}' not in {VALID_CONFIDENCE_LEVELS}")

    mt = event.get("missile_type")
    if mt and mt not in VALID_MISSILE_TYPES:
        issues.append(f"WARN: missile_type '{mt}' not in allowed list")

    tt = event.get("target_type")
    if tt and tt not in VALID_TARGET_TYPES:
        issues.append(f"WARN: target_type '{tt}' not in allowed list")

    wt = event.get("warhead_type")
    if wt and wt not in VALID_WARHEAD_TYPES:
        issues.append(f"WARN: warhead_type '{wt}' not in allowed list")

    return issues


def validate_coordinates(event: dict) -> list[str]:
    """
    Check that coordinates are within valid ranges and roughly match
    the claimed countries.
    """
    issues = []

    launch_lat = event.get("launch_latitude")
    launch_lon = event.get("launch_longitude")
    target_lat = event.get("target_latitude")
    target_lon = event.get("target_longitude")

    # Check valid ranges
    for name, lat, lon in [
        ("launch", launch_lat, launch_lon),
        ("target", target_lat, target_lon),
    ]:
        if lat is not None and (lat < -90 or lat > 90):
            issues.append(f"FAIL: {name}_latitude {lat} is out of range [-90, 90]")
        if lon is not None and (lon < -180 or lon > 180):
            issues.append(f"FAIL: {name}_longitude {lon} is out of range [-180, 180]")

    # Check that launch and target aren't the exact same point
    if (launch_lat is not None and target_lat is not None
            and launch_lat == target_lat and launch_lon == target_lon):
        issues.append("WARN: launch and target coordinates are identical — likely copy-paste error")

    # Check coordinates roughly match claimed country (bounding box check)
    for prefix, iso_field in [("launch", "sender_country_iso"), ("target", "target_country_iso")]:
        lat = event.get(f"{prefix}_latitude")
        lon = event.get(f"{prefix}_longitude")
        iso = event.get(iso_field)
        if lat is not None and lon is not None and iso in COUNTRY_BOUNDS:
            lat_min, lat_max, lon_min, lon_max = COUNTRY_BOUNDS[iso]
            if not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
                issues.append(
                    f"WARN: {prefix} coords ({lat}, {lon}) are outside "
                    f"expected bounds for {iso}"
                )

    return issues


def validate_iso_codes(event: dict) -> list[str]:
    """Check that ISO country codes are real 3-letter codes."""
    issues = []
    for field_name in ["sender_country_iso", "target_country_iso"]:
        code = event.get(field_name)
        if code and code not in VALID_ISO3_CODES:
            issues.append(f"WARN: {field_name} '{code}' is not a recognized ISO 3166-1 alpha-3 code")
    return issues


def validate_numeric_logic(event: dict) -> list[str]:
    """Check that numeric fields make logical sense together."""
    issues = []

    missile_count = event.get("missile_count", 0) or 0
    intercepted_count = event.get("intercepted_count", 0) or 0
    intercepted = event.get("intercepted")

    if intercepted_count > missile_count and missile_count > 0:
        issues.append(
            f"FAIL: intercepted_count ({intercepted_count}) > missile_count ({missile_count}) — "
            f"can't intercept more than were fired"
        )

    if intercepted_count > 0 and intercepted is False:
        issues.append(
            "WARN: intercepted_count > 0 but intercepted is False — contradictory"
        )

    if intercepted is True and intercepted_count == 0 and missile_count > 0:
        issues.append(
            "WARN: intercepted is True but intercepted_count is 0 — should specify how many"
        )

    if missile_count == 0:
        issues.append("WARN: missile_count is 0 — every strike should have at least 1")

    return issues


def validate_sources(event: dict) -> list[str]:
    """Check that the event has real source URLs for traceability."""
    issues = []
    sources = event.get("source_references", [])

    if not sources:
        issues.append("FAIL: no source_references — events need provenance")
        return issues

    valid_urls = [s for s in sources if isinstance(s, str) and s.startswith(("http://", "https://"))]
    if len(valid_urls) == 0:
        issues.append("FAIL: source_references has no valid URLs (must start with http/https)")
    elif len(valid_urls) < len(sources):
        issues.append("WARN: some source_references are not valid URLs")

    # Wikipedia is a reference encyclopedia, not a real-time news source.
    # Events sourced only from Wikipedia likely came from background reading,
    # not breaking news coverage.
    BLOCKED_DOMAINS = ["wikipedia.org", "wiki"]
    news_urls = [
        u for u in valid_urls
        if not any(blocked in u.lower() for blocked in BLOCKED_DOMAINS)
    ]
    if len(news_urls) == 0 and len(valid_urls) > 0:
        issues.append("FAIL: all sources are from Wikipedia — not a real-time news source")
    elif len(news_urls) < len(valid_urls):
        issues.append("WARN: some sources are from Wikipedia — not a real-time news source")

    return issues


# ── Batch-level validators (run across all events in a collection) ────

def validate_batch_dedup(events: list[dict]) -> dict[str, list[str]]:
    """
    Detect likely duplicates within a single batch of events.

    Two events are "semantically similar" if they share:
    - Same sender + target country pair
    - Same day (from event_timestamp_utc)
    - Same casualty count (when > 0)

    Also flags when multiple events share the exact same source URL,
    which usually means the AI split one article into multiple events.

    Returns:
        dict mapping event_id -> list of warning strings
    """
    issues_by_event = {}

    # ── Check for same-source splitting ──
    # A shared URL is only suspicious when the events sharing it ALSO
    # look like the same incident (same sender/target country pair AND
    # same target location). A comprehensive war report covering strikes
    # in Kyiv AND Odesa is legitimately two events from one article.
    url_to_events = {}
    events_by_id = {}
    for event in events:
        eid = event.get("event_id", "unknown")
        events_by_id[eid] = event
        for url in event.get("source_references", []):
            if isinstance(url, str) and url.startswith("http"):
                url_to_events.setdefault(url, []).append(eid)

    for url, eids in url_to_events.items():
        if len(eids) <= 1:
            continue

        # Group the URL-sharing events by their country pair + target location
        # If multiple events share a URL AND have the same country pair AND
        # the same target location, that's suspicious — likely the same strike
        location_groups = {}
        for eid in eids:
            ev = events_by_id[eid]
            key = (
                ev.get("sender_country", ""),
                ev.get("target_country", ""),
                ev.get("target_location_name", ""),
            )
            location_groups.setdefault(key, []).append(eid)

        for key, group_eids in location_groups.items():
            if len(group_eids) > 1:
                # Same URL + same country pair + same target location = suspicious
                for eid in group_eids:
                    others = [e for e in group_eids if e != eid]
                    issues_by_event.setdefault(eid, []).append(
                        f"WARN: shares source URL AND same country pair/target location "
                        f"with {others} — likely same incident split into multiple events "
                        f"(URL: {url[:80]}...)"
                    )

    # ── Check for semantic duplicates ──
    # Group events by (sender_country, target_country, date, casualties)
    def event_signature(ev):
        ts = ev.get("event_timestamp_utc", "")
        try:
            day = ts[:10]  # Just the YYYY-MM-DD part
        except (TypeError, IndexError):
            day = "unknown"
        return (
            ev.get("sender_country", ""),
            ev.get("target_country", ""),
            day,
            ev.get("casualties_reported", 0),
        )

    sig_groups = {}
    for event in events:
        sig = event_signature(event)
        eid = event.get("event_id", "unknown")
        sig_groups.setdefault(sig, []).append(eid)

    for sig, eids in sig_groups.items():
        if len(eids) > 1 and sig[3] > 0:
            # Same country pair, same day, same non-zero casualties — very suspicious
            for eid in eids:
                others = [e for e in eids if e != eid]
                issues_by_event.setdefault(eid, []).append(
                    f"FAIL: likely duplicate — same sender/target/day/casualties as {others}"
                )

    return issues_by_event


# ── Main entry point ──────────────────────────────────────────────────

def validate_event(event: dict) -> tuple[bool, list[str]]:
    """
    Run all validation checks on a single event.

    Args:
        event: A dictionary of event data from the AI.

    Returns:
        tuple of (passed, issues):
        - passed (bool): True if no FAIL-level issues were found.
          The event can be inserted but may still have WARNings.
        - issues (list[str]): All issues found, prefixed with FAIL or WARN.
    """
    all_issues = []
    all_issues.extend(validate_event_id(event))
    all_issues.extend(validate_timestamp(event))
    all_issues.extend(validate_enums(event))
    all_issues.extend(validate_coordinates(event))
    all_issues.extend(validate_iso_codes(event))
    all_issues.extend(validate_numeric_logic(event))
    all_issues.extend(validate_sources(event))

    # An event passes if it has NO "FAIL" issues (WARNs are okay)
    has_fail = any(issue.startswith("FAIL") for issue in all_issues)
    return (not has_fail, all_issues)


def validate_batch(events: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    """
    Validate a full batch of events from a single collection run.

    Runs per-event validation AND cross-event duplicate detection.
    Returns events sorted into three buckets:

    Args:
        events: List of event dictionaries from the AI.

    Returns:
        tuple of (passed, warned, failed):
        - passed: Events with zero issues — clean data.
        - warned: Events that passed but have warnings worth reviewing.
        - failed: Events rejected due to FAIL-level issues.

        Each event dict gets an extra "_validation_issues" key listing
        all issues found.
    """
    passed = []
    warned = []
    failed = []

    # Run batch-level dedup checks first
    batch_issues = validate_batch_dedup(events)

    for event in events:
        eid = event.get("event_id", "unknown")

        # Per-event validation
        event_passed, issues = validate_event(event)

        # Add any batch-level issues (like duplicates)
        if eid in batch_issues:
            issues.extend(batch_issues[eid])
            # If batch issues include FAILs, mark as failed
            if any(i.startswith("FAIL") for i in batch_issues[eid]):
                event_passed = False

        event["_validation_issues"] = issues

        if not event_passed:
            failed.append(event)
        elif issues:
            warned.append(event)
        else:
            passed.append(event)

    return passed, warned, failed


def print_validation_report(passed: list[dict], warned: list[dict], failed: list[dict]):
    """Print a human-readable summary of validation results."""
    total = len(passed) + len(warned) + len(failed)
    print(f"\n{'=' * 60}")
    print(f"DATA QUALITY REPORT")
    print(f"{'=' * 60}")
    print(f"  Total events checked: {total}")
    print(f"  PASSED (clean):       {len(passed)}")
    print(f"  WARNED (inserted):    {len(warned)}")
    print(f"  FAILED (rejected):    {len(failed)}")

    if warned:
        print(f"\n--- WARNINGS (inserted with issues) ---")
        for event in warned:
            eid = event.get("event_id", "unknown")
            print(f"\n  {eid}:")
            for issue in event.get("_validation_issues", []):
                print(f"    - {issue}")

    if failed:
        print(f"\n--- FAILURES (rejected) ---")
        for event in failed:
            eid = event.get("event_id", "unknown")
            print(f"\n  {eid}:")
            for issue in event.get("_validation_issues", []):
                print(f"    - {issue}")

    print(f"\n{'=' * 60}")


def log_quality_results(
    passed: list[dict],
    warned: list[dict],
    failed: list[dict],
    check_source: str,
    collection_cycle: str = None,
):
    """
    Write validation results to the data_quality_log table in Supabase.

    This creates a permanent record of every quality check — both from
    live collection runs and retroactive audits. Over time, this builds
    a history you can dashboard to track data quality trends.

    Args:
        passed: Events that passed with no issues.
        warned: Events that passed but had warnings.
        failed: Events that failed validation.
        check_source: Either 'live_collection' or 'retroactive_audit'.
        collection_cycle: The cycle ID (only for live collections).
    """
    from .supabase_client import get_supabase_client

    client = get_supabase_client()
    rows = []

    for result_label, event_list in [("passed", passed), ("warned", warned), ("failed", failed)]:
        for event in event_list:
            rows.append({
                "check_source": check_source,
                "collection_cycle": collection_cycle,
                "event_id": event.get("event_id", "unknown"),
                "result": result_label,
                "issues": json.dumps(event.get("_validation_issues", [])),
                "sender_country": event.get("sender_country"),
                "target_country": event.get("target_country"),
                "casualties_reported": event.get("casualties_reported", 0) or 0,
            })

    if not rows:
        return

    # Insert in batches of 50 to avoid hitting request size limits
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            client.table("data_quality_log").insert(batch).execute()
        except Exception as e:
            print(f"  WARNING: Failed to log quality results to Supabase: {e}")

    print(f"  Logged {len(rows)} quality check results to data_quality_log")
