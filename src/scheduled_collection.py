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

    # System prompt defines the role and output format upfront so the model
    # knows exactly what JSON structure to produce after searching.
    system_prompt = f"""You are a military intelligence analyst collecting data on missile and weapons attacks worldwide. Your job: search the web for recent attacks, then return structured JSON data.

OUTPUT FORMAT: Return a JSON array where each element has these fields:
- event_id: string (format MSL-YYYYMMDD-HHMM-XXX)
- event_timestamp_utc: string (ISO 8601)
- collection_timestamp_utc: "{now}"
- collection_cycle: "{cycle}"
- confidence_level: "confirmed" | "likely" | "unverified"
- source_references: string[] (URLs)
- sender_country: string
- sender_country_iso: string (alpha-3)
- sender_faction: string
- launch_location_name: string
- launch_latitude: float
- launch_longitude: float
- target_country: string
- target_country_iso: string (alpha-3)
- target_location_name: string
- target_latitude: float
- target_longitude: float
- target_type: "military_base"|"infrastructure"|"civilian_area"|"government"|"naval"|"airfield"|"unknown"
- missile_name: string
- missile_type: "ballistic"|"cruise"|"hypersonic"|"drone_kamikaze"|"anti_ship"|"icbm"|"short_range"|"medium_range"|"long_range"|"unknown"
- missile_origin_country: string
- missile_count: int (0 if unknown, NEVER null)
- missile_range_km: float (0 if unknown)
- warhead_type: "conventional"|"cluster"|"thermobaric"|"nuclear"|"unknown"
- intercepted: bool
- intercepted_count: int (0 if unknown, NEVER null)
- interception_system: string or null
- impact_confirmed: bool
- casualties_reported: int (0 if unknown, NEVER null)
- damage_description: string
- conflict_name: string
- conflict_parties: string[]
- escalation_note: string or null

RULES:
- Only events from 2026, on or after Feb 27
- All numeric fields must be integers, NEVER null (use 0)
- Use accurate real-world coordinates
- No duplicate strikes
- Your final message MUST contain ONLY the JSON array, nothing else
- If no events found, return []"""

    # User prompt is kept short and focused — the heavy schema is in the system prompt
    user_prompt = f"""Search for ALL missile strikes, rocket attacks, drone strikes, airstrikes, and military attacks that occurred since {since_timestamp}.

Search these conflict zones separately:
1. Iran vs Israel/US (missile strikes, airstrikes, ballistic missiles)
2. Iran vs UAE/Gulf states (drone and missile attacks)
3. Houthi/Yemen attacks (Red Sea, shipping, Saudi Arabia)
4. Hezbollah/Lebanon vs Israel (rockets, airstrikes)
5. Russia vs Ukraine (cruise missiles, drones, Shahed, ballistic)
6. Ukraine vs Russia (drones, strikes on Russian territory)
7. US/NATO military strikes in Middle East
8. Any other global missile or weapons attacks

Check major sources: BBC, Reuters, AP, CNN, Fox News, Al Jazeera, Times of Israel, NYT, The Guardian, CNBC, CBS News, Middle East Eye, Haaretz, Iran International, Al Arabiya, ISW.

After searching, compile ALL attacks found into the JSON array format specified in your instructions. You MUST return the JSON array as your final output."""

    # Retry up to 3 times if rate-limited, waiting 60 seconds between attempts.
    # Uses streaming because 25 web searches + large output can exceed the
    # SDK's 10-minute non-streaming timeout.
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Use the streaming helper to collect the full response
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=25000,
                system=system_prompt,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 25}],
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                response = stream.get_final_message()
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
    print(f"  Stop reason: {response.stop_reason}")
    print(f"  Input tokens: {response.usage.input_tokens}, Output tokens: {response.usage.output_tokens}")
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
