"""
Data models for missile events.

These classes define the "shape" of our data — like a form template
that ensures every missile event has the same fields filled out
consistently before it goes into the database.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
from datetime import datetime


@dataclass
class MissileEvent:
    """Represents a single missile event with all tracked attributes."""

    # Event Information
    event_id: str  # Format: MSL-YYYYMMDD-HHMM-XXX
    event_timestamp_utc: str  # When the missile was fired (ISO 8601)
    collection_timestamp_utc: str  # When this data was collected
    collection_cycle: str  # Which 4-hour cycle (e.g., 2026-03-04_00)
    confidence_level: str  # confirmed, likely, or unverified
    source_references: list[str] = field(default_factory=list)

    # Sender (Launching Party)
    sender_country: Optional[str] = None
    sender_country_iso: Optional[str] = None
    sender_faction: Optional[str] = None
    launch_location_name: Optional[str] = None
    launch_latitude: Optional[float] = None
    launch_longitude: Optional[float] = None

    # Receiver (Target)
    target_country: Optional[str] = None
    target_country_iso: Optional[str] = None
    target_location_name: Optional[str] = None
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_type: Optional[str] = None  # military_base, infrastructure, etc.

    # Missile Information
    missile_name: Optional[str] = None
    missile_type: Optional[str] = None  # ballistic, cruise, hypersonic, etc.
    missile_origin_country: Optional[str] = None
    missile_count: int = 0
    missile_range_km: Optional[float] = None
    warhead_type: Optional[str] = None  # conventional, cluster, etc.

    # Outcome
    intercepted: Optional[bool] = None
    intercepted_count: int = 0
    interception_system: Optional[str] = None
    impact_confirmed: Optional[bool] = None
    casualties_reported: int = 0
    damage_description: Optional[str] = None

    # Conflict Context
    conflict_name: Optional[str] = None
    conflict_parties: list[str] = field(default_factory=list)
    escalation_note: Optional[str] = None

    def to_dict(self) -> dict:
        """
        Convert this event to a dictionary for inserting into Supabase.

        Returns:
            dict: All fields as key-value pairs, ready for database insertion.
        """
        return asdict(self)
