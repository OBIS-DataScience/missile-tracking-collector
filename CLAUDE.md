# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Missile Tracking Collector is a Python data pipeline that collects global missile activity data every 4 hours and stores it in Supabase (a cloud PostgreSQL database). The data powers a near-real-time visual globe showing missile events during 2026 conflicts. The project tracks two active conflict zones: the Russia-Ukraine War and the 2026 Iran Conflict.

## Tech Stack

- **Language:** Python 3.12
- **Database:** Supabase (PostgreSQL) — project "Missile Tracking Collector"
- **Automation:** GitHub Actions cron job (every 4 hours)
- **AI Collection:** Anthropic API with web search (Claude Sonnet) for autonomous event discovery
- **Key libraries:** supabase-py, python-dotenv, anthropic

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Test Supabase connection
python -m src.test_connection

# Run a manual scheduled collection (requires ANTHROPIC_API_KEY env var)
python -m src.scheduled_collection

# Run the initial data seed (only needed once)
python -m src.initial_collection
```

## Architecture

The pipeline has two collection modes:

1. **Interactive (Claude agent):** The `missile-tracking-collector` agent in `~/.claude/agents/` is triggered manually. It uses web search to find events and calls `src/database.py` to write to Supabase.

2. **Automated (cron job):** `.github/workflows/collect.yml` runs every 4 hours via GitHub Actions. It calls `src/scheduled_collection.py`, which uses the Anthropic API with web search to autonomously find new missile events and insert them into Supabase.

**Data flow:** Web search → Claude structures events → duplicate check against Supabase → insert new rows (append-only, never delete/overwrite).

### Module responsibilities

- `src/supabase_client.py` — Creates and returns the Supabase client. Loads credentials from `.env` (or `.env.txt` on Windows).
- `src/models.py` — `MissileEvent` dataclass defining the schema. All numeric fields (`casualties_reported`, `missile_count`, `intercepted_count`) default to `0`.
- `src/database.py` — CRUD operations: `insert_event()`, `insert_events()`, `get_event_by_id()`, `update_event()`, `get_latest_events()`, `check_duplicate()`.
- `src/scheduled_collection.py` — Headless collection script for the cron job. Uses Anthropic API with `web_search_20250305` tool.
- `src/initial_collection.py` — One-time seed script with 17 hardcoded events from Jan-Mar 2026.
- `setup_supabase_table.sql` — Database schema with indexes, RLS policies, and auto-updating `updated_at` trigger. Run once in Supabase SQL Editor.

## Data Rules

- **Append-only** — never delete or overwrite existing records
- **2026 data only** — do not include events from other years
- **No null numerics** — `casualties_reported`, `missile_count`, `intercepted_count` must always be `0` when unknown, never `null`. This is critical for BI tool aggregation.
- **Event ID format:** `MSL-YYYYMMDD-HHMM-XXX` (e.g., `MSL-20260304-0800-001`)
- **All timestamps in UTC** (ISO 8601)
- **Confidence levels:** `confirmed`, `likely`, `unverified`
- **Duplicate prevention:** Always call `check_duplicate()` before inserting. The `event_id` column also has a `UNIQUE` database constraint as a safety net.

## GitHub Actions Secrets

The cron job requires three repository secrets:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ANTHROPIC_API_KEY`

## Conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Git author: `OBIS-DataScience <jacqueline@omnibisolutions.com>`
- GitHub owner: `OBIS-DataScience`

## Supabase Access

- **Table Editor:** View all data at Supabase Dashboard → Table Editor → `missile_events`
- **REST API:** `https://gobbelymdcxrrobciquy.supabase.co/rest/v1/missile_events?select=*`
- **SQL Editor:** Run custom queries directly in the Supabase Dashboard
