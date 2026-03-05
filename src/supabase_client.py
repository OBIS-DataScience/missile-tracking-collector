"""
Supabase client module for the Missile Tracking Collector.

This module handles the connection to Supabase (our cloud database).
Think of it as the "phone line" between our code and the database —
we set it up once here, and every other file can use it to talk to Supabase.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from the .env file (or .env.txt on Windows)
# This reads the SUPABASE_URL and SUPABASE_KEY values we stored there
load_dotenv()
# Windows sometimes saves .env as .env.txt — check that too
if not os.getenv("SUPABASE_URL"):
    load_dotenv(".env.txt")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing Supabase credentials. "
        "Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env file."
    )


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.

    Returns:
        Client: A connected Supabase client ready to read/write data.
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)
