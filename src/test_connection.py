"""
Quick test to verify your Supabase connection is working.

Run this after:
1. Creating your .env file with the correct credentials
2. Running the SQL setup in the Supabase dashboard
3. Installing dependencies with: pip install -r requirements.txt

Usage:
    python -m src.test_connection
"""

from .supabase_client import get_supabase_client


def test_connection():
    """Test that we can connect to Supabase and access the missile_events table."""
    print("Testing Supabase connection...")

    try:
        client = get_supabase_client()
        print("  Connected to Supabase successfully!")

        # Try to read from the table (should return empty list if table exists)
        result = client.table("missile_events").select("*").limit(1).execute()
        print(f"  Table 'missile_events' is accessible. Rows found: {len(result.data)}")
        print("\nAll good! Your Supabase connection is working.")

    except Exception as e:
        print(f"\n  Connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check that your .env file has the correct SUPABASE_URL and SUPABASE_KEY")
        print("  2. Make sure you ran the setup_supabase_table.sql in the Supabase SQL Editor")
        print("  3. Check that your Supabase project is active (not paused)")


if __name__ == "__main__":
    test_connection()
