# Missile Tracking Collector

A near-real-time data collection pipeline that tracks global missile activity during 2026 conflict zones. Data is collected every 4 hours and stored in Supabase for powering a visual globe visualization.

## Purpose

Transparency and public awareness -- enabling people to see a visual representation of missile activity worldwide.

## Project Structure

```
missile-tracking-collector/
  src/
    supabase_client.py   # Connects to Supabase
    models.py            # Defines the data shape for missile events
    database.py          # Read/write operations for the database
    test_connection.py   # Verify your Supabase setup works
  data/
    collection_logs/     # Markdown logs from each collection cycle
  setup_supabase_table.sql  # SQL to create the database table
  requirements.txt          # Python dependencies
  .env                      # Your Supabase credentials (not committed)
```

## Setup

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Create your `.env` file

Create a `.env` file in the project root with your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-publishable-key
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

### 3. Set up the database table

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Navigate to SQL Editor
4. Paste the contents of `setup_supabase_table.sql` and click Run

### 4. Test your connection

```bash
python -m src.test_connection
```

## Data Collection

The missile-tracking-collector Claude agent handles automated data collection. It runs every 4 hours and writes events to Supabase using the `src/database.py` module.

## Data Schema

Each missile event tracks: event details, sender/launcher info, target info, missile specifications, outcome (interceptions, casualties), and conflict context. See `src/models.py` for the full schema.
