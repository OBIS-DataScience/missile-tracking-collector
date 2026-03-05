"""
Database operations for the Missile Tracking Collector.

This module handles all reads and writes to Supabase. Think of it as
the "librarian" — it knows how to store new missile events, look up
existing ones, and update records when new information comes in.
"""

from datetime import datetime, timezone
from .supabase_client import get_supabase_client
from .models import MissileEvent

TABLE_NAME = "missile_events"


def insert_event(event: MissileEvent) -> dict:
    """
    Insert a single missile event into the Supabase database.

    Args:
        event: A MissileEvent object with all the data filled in.

    Returns:
        dict: The response from Supabase confirming the insert.
    """
    client = get_supabase_client()
    result = client.table(TABLE_NAME).insert(event.to_dict()).execute()
    return result.data


def insert_events(events: list[MissileEvent]) -> dict:
    """
    Insert multiple missile events at once (batch insert).

    This is more efficient than inserting one at a time when you have
    several events from a single collection cycle.

    Args:
        events: A list of MissileEvent objects.

    Returns:
        dict: The response from Supabase confirming the inserts.
    """
    client = get_supabase_client()
    rows = [event.to_dict() for event in events]
    result = client.table(TABLE_NAME).insert(rows).execute()
    return result.data


def get_events_by_cycle(collection_cycle: str) -> list[dict]:
    """
    Retrieve all events from a specific collection cycle.

    Args:
        collection_cycle: The cycle identifier (e.g., "2026-03-04_00").

    Returns:
        list[dict]: All missile events from that cycle.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE_NAME)
        .select("*")
        .eq("collection_cycle", collection_cycle)
        .execute()
    )
    return result.data


def get_event_by_id(event_id: str) -> dict | None:
    """
    Look up a single missile event by its unique ID.

    Args:
        event_id: The event identifier (e.g., "MSL-20260304-0800-001").

    Returns:
        dict or None: The event data if found, None if not.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE_NAME)
        .select("*")
        .eq("event_id", event_id)
        .execute()
    )
    return result.data[0] if result.data else None


def update_event(event_id: str, updates: dict) -> dict:
    """
    Update an existing missile event with new information.

    Use this when new details emerge about a previously recorded event
    (e.g., casualty count updated, interception confirmed).

    Args:
        event_id: The event to update.
        updates: A dictionary of field names and their new values.

    Returns:
        dict: The updated event data from Supabase.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE_NAME)
        .update(updates)
        .eq("event_id", event_id)
        .execute()
    )
    return result.data


def get_latest_events(limit: int = 50) -> list[dict]:
    """
    Get the most recent missile events, ordered by event timestamp.

    Args:
        limit: How many events to return (default 50).

    Returns:
        list[dict]: The most recent events, newest first.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE_NAME)
        .select("*")
        .order("event_timestamp_utc", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


def check_duplicate(event_id: str) -> bool:
    """
    Check if an event with this ID already exists in the database.

    Args:
        event_id: The event identifier to check.

    Returns:
        bool: True if the event already exists, False if it's new.
    """
    return get_event_by_id(event_id) is not None
