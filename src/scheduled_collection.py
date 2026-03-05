"""
Scheduled collection script for the Missile Tracking Collector.

This script runs as a cron job (via GitHub Actions) every 2 hours.
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
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

import anthropic
from .supabase_client import get_supabase_client
from .models import MissileEvent

TABLE_NAME = "missile_events"


def get_current_cycle() -> str:
    """
    Determine the current 2-hour collection cycle based on UTC time.

    The cycles are: 00, 02, 04, 06, ..., 22
    For example, if it's 3:30 AM UTC, the cycle is "02".

    Returns:
        str: Cycle identifier like "2026-03-05_02"
    """
    now = datetime.now(timezone.utc)
    cycle_hour = (now.hour // 2) * 2
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

    prompt = f"""Search for ALL military attacks worldwide since {since_timestamp} — this is World War III (started Feb 27, 2026). Include missile strikes, rocket attacks, drone strikes, airstrikes, ballistic attacks, cruise missiles, Shahed drones, naval attacks, artillery barrages, Houthi attacks, Hezbollah rockets, and ANY weapons launches by ANY country. Do not filter by region — search globally. Return a JSON array with these fields per event:
event_id (MSL-YYYYMMDD-HHMM-XXX), event_timestamp_utc (ISO 8601), collection_timestamp_utc ("{now}"), collection_cycle ("{cycle}"), confidence_level (confirmed/likely/unverified), source_references (URL array), sender_country, sender_country_iso (alpha-3), sender_faction, launch_location_name, launch_latitude, launch_longitude, target_country, target_country_iso, target_location_name, target_latitude, target_longitude, target_type (military_base/infrastructure/civilian_area/government/naval/airfield/unknown), missile_name, missile_type (ballistic/cruise/hypersonic/drone_kamikaze/anti_ship/icbm/short_range/medium_range/long_range/unknown), missile_origin_country, missile_count (int, 0 if unknown), missile_range_km (float or 0), warhead_type (conventional/cluster/thermobaric/nuclear/unknown), intercepted (bool), intercepted_count (int, 0 if unknown), interception_system (string or null), impact_confirmed (bool), casualties_reported (int, 0 if unknown), damage_description, conflict_name, conflict_parties (array), escalation_note (string or null).
Rules: only events from 2026 on or after Feb 27, numeric fields must be integers never null (use 0), accurate coordinates, no duplicate strikes. Return ONLY the JSON array. If none found, return []."""

    # Retry up to 3 times if rate-limited, waiting 60 seconds between attempts
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 10}],
                messages=[{"role": "user", "content": prompt}],
            )
            break
        except anthropic.RateLimitError as e:
            if attempt < max_retries - 1:
                wait = 60 * (attempt + 1)
                print(f"  Rate limited, waiting {wait}s before retry {attempt + 2}/{max_retries}...")
                time.sleep(wait)
            else:
                raise

    # Extract the JSON from the response — log everything so we can debug
    response_text = ""
    search_count = 0
    for block in response.content:
        if block.type == "text":
            response_text += block.text
        elif block.type == "web_search_tool_result":
            search_count += 1

    print(f"  API response: {search_count} web searches performed")
    print(f"  Response text length: {len(response_text)} chars")
    if response_text:
        # Show first 500 chars so we can see what the AI said
        print(f"  Response preview: {response_text[:500]}")

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

    # Run Monte Carlo simulation after collection to update predictions
    try:
        from .simulation import run_simulation
        run_simulation()
    except Exception as e:
        print(f"\nSimulation error (non-fatal): {e}")

    # Exit with error code if there were failures
    if errors > 0 and inserted == 0:
        exit(1)


if __name__ == "__main__":
    run_scheduled_collection()
