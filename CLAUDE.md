# CLAUDE.md - Missile Tracking Collector

## Project Overview

This is a Python data pipeline that collects global missile activity data and stores it in Supabase. It powers a near-real-time visual globe showing missile events during 2026 conflicts.

## Tech Stack

- **Language:** Python 3.11+
- **Database:** Supabase (PostgreSQL)
- **Key libraries:** supabase-py, python-dotenv

## Key Files

- `src/supabase_client.py` — Supabase connection setup
- `src/models.py` — MissileEvent dataclass (defines data shape)
- `src/database.py` — All database read/write operations
- `setup_supabase_table.sql` — Database schema (run once in Supabase SQL Editor)
- `.env` — Credentials (never commit this)

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Test Supabase connection
python -m src.test_connection
```

## Conventions

- Use Conventional Commits (feat:, fix:, docs:, etc.)
- All timestamps in UTC (ISO 8601)
- Event IDs follow format: MSL-YYYYMMDD-HHMM-XXX
- Append-only data — never delete previous records
- Confidence levels: confirmed, likely, unverified

## GitHub

- Owner: OBIS-DataScience
- Repo: missile-tracking-collector
