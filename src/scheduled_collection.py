"""
Scheduled collection script for the Missile Tracking Collector.

This script runs as a cron job (via GitHub Actions) every 4 hours.
It uses the Anthropic API with web search to find recent missile events,
then structures and inserts them into Supabase.

Think of this as the "autopilot" version of the missile-tracking-collector
agent — it does the same job, but without needing a human to trigger it.

Usage:
    python -m src.scheduled_collection
"""

import os
import json
import re
from datetime import datetime, timezone

import anthropic
from .supabase_client import get_supabase_client
from .models import MissileEvent

TABLE_NAME = "missile_events"


def get_current_cycle() -> str:
    """
    Determine the current 4-hour collection cycle based on UTC time.

    The cycles are: 00, 04, 08, 12, 16, 20
    For example, if it's 3:30 AM UTC, the cycle is "00".

    Returns:
        str: Cycle identifier like "2026-03-05_00"
    """
    now = datetime.now(timezone.utc)
    cycle_hour = (now.hour // 4) * 4
    return f"{now.strftime('%Y-%m-%d')}_{cycle_hour:02d}"


def get_last_event_timestamp() -> str:
    """
    Find the most recent event timestamp in the database.
    This tells us where to start looking for new events.

    Returns:
        str: ISO 8601 timestamp of the most recent event, or a default.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE_NAME)
        .select("event_timestamp_utc")
        .order("event_timestamp_utc", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        return result.data[0]["event_timestamp_utc"]

    return "2026-01-01T00:00:00Z"


def search_and_collect(cycle: str, since_timestamp: str) -> list[dict]:
    """
    Use the Anthropic API with web search to find missile events
    that occurred since the last collection.

    Args:
        cycle: Current collection cycle identifier.
        since_timestamp: Only look for events after this time.

    Returns:
        list[dict]: Structured missile event data ready for insertion.
    """
    client = anthropic.Anthropic()
    now = datetime.now(timezone.utc).isoformat()

    prompt = f"""You are a missile event data collector. Search for missile strikes,
missile attacks, and missile launches that occurred since {since_timestamp} in any
conflict zone worldwide during 2026.

Focus on:
1. Russia-Ukraine War missile exchanges
2. 2026 Iran Conflict (US/Israel vs Iran, Iranian retaliation on Gulf states, Hezbollah)
3. Any other missile events globally in 2026

For each event found, return a JSON array of objects with EXACTLY these fields:
- event_id: format MSL-YYYYMMDD-HHMM-XXX (use the event date/time)
- event_timestamp_utc: ISO 8601 when the missile was fired
- collection_timestamp_utc: "{now}"
- collection_cycle: "{cycle}"
- confidence_level: "confirmed", "likely", or "unverified"
- source_references: array of source URLs
- sender_country: country that launched
- sender_country_iso: ISO 3166-1 alpha-3
- sender_faction: military group/faction
- launch_location_name: named location
- launch_latitude: float
- launch_longitude: float
- target_country: country targeted
- target_country_iso: ISO 3166-1 alpha-3
- target_location_name: named target
- target_latitude: float
- target_longitude: float
- target_type: one of military_base, infrastructure, civilian_area, government, naval, airfield, unknown
- missile_name: name/designation
- missile_type: one of ballistic, cruise, hypersonic, drone_kamikaze, anti_ship, icbm, short_range, medium_range, long_range, unknown
- missile_origin_country: manufacturer country
- missile_count: integer (use 0 if unknown)
- missile_range_km: float or 0
- warhead_type: one of conventional, cluster, thermobaric, nuclear, unknown
- intercepted: boolean or false if unknown
- intercepted_count: integer (use 0 if unknown)
- interception_system: string or null
- impact_confirmed: boolean
- casualties_reported: integer (use 0 if unknown or none reported)
- damage_description: brief description
- conflict_name: name of conflict
- conflict_parties: array of countries/factions
- escalation_note: string or null

IMPORTANT RULES:
- Only include events from 2026
- All numeric fields (casualties_reported, missile_count, intercepted_count) must be integers, never null — use 0 if unknown
- Verify coordinates are geographically accurate
- Do not duplicate events — each unique strike/salvo should be one entry
- Return ONLY the JSON array, no other text. If no new events found, return []"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        server_tools=[{"type": "web_search"}],
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract the JSON from the response
    response_text = ""
    for block in response.content:
        if block.type == "text":
            response_text += block.text

    # Find JSON array in the response
    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
    if not json_match:
        print("  No JSON array found in response. Possibly no new events.")
        return []

    try:
        events = json.loads(json_match.group())
        return events
    except json.JSONDecodeError as e:
        print(f"  ERROR parsing JSON: {e}")
        return []


def insert_new_events(events: list[dict]) -> tuple[int, int, int]:
    """
    Insert new events into Supabase, skipping duplicates.

    Args:
        events: List of event dictionaries from the AI collection.

    Returns:
        tuple: (inserted_count, skipped_count, error_count)
    """
    client = get_supabase_client()
    inserted = 0
    skipped = 0
    errors = 0

    for event_data in events:
        try:
            event_id = event_data.get("event_id", "")

            # Check for duplicates
            existing = (
                client.table(TABLE_NAME)
                .select("event_id")
                .eq("event_id", event_id)
                .execute()
            )

            if existing.data:
                print(f"  SKIP  {event_id} — already exists")
                skipped += 1
                continue

            # Ensure numeric fields are not null
            for field in ["casualties_reported", "missile_count", "intercepted_count"]:
                if event_data.get(field) is None:
                    event_data[field] = 0

            client.table(TABLE_NAME).insert(event_data).execute()
            sender = event_data.get("sender_country", "?")
            target = event_data.get("target_country", "?")
            print(f"  INSERT {event_id} — {sender} -> {target}")
            inserted += 1

        except Exception as e:
            print(f"  ERROR {event_data.get('event_id', 'unknown')} — {e}")
            errors += 1

    return inserted, skipped, errors


def run_scheduled_collection():
    """Main entry point for the scheduled collection cron job."""
    cycle = get_current_cycle()
    print("=" * 60)
    print(f"MISSILE TRACKING COLLECTOR — Scheduled Collection")
    print(f"Cycle: {cycle}")
    print(f"Time:  {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    print()

    # Find where we left off
    last_timestamp = get_last_event_timestamp()
    print(f"Last recorded event: {last_timestamp}")
    print(f"Searching for events since then...")
    print()

    # Search for new events
    events = search_and_collect(cycle, last_timestamp)
    print(f"Found {len(events)} potential new events")
    print()

    if not events:
        print("No new events to insert. Collection complete.")
        return

    # Insert into Supabase
    inserted, skipped, errors = insert_new_events(events)

    print()
    print("=" * 60)
    print(f"COLLECTION COMPLETE — Cycle {cycle}")
    print(f"  Inserted: {inserted}")
    print(f"  Skipped:  {skipped}")
    print(f"  Errors:   {errors}")
    print("=" * 60)

    # Exit with error code if there were failures
    if errors > 0 and inserted == 0:
        exit(1)


if __name__ == "__main__":
    run_scheduled_collection()
