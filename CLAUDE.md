# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Missile Tracking Collector is a full-stack intelligence platform that collects global missile and weapons activity data every 2 hours and stores it in Supabase (a cloud PostgreSQL database). The data powers a near-real-time 3D visual globe ("World War III — Missile Tracking Collector — Global Intelligence Console") showing missile events, live air traffic, and live news coverage during 2026 conflicts. The project tracks multiple conflict zones: the Russia-Ukraine War, the 2026 Iran Conflict (US/Israel vs Iran), Houthi/Yemen attacks, and Hezbollah/Lebanon exchanges.

## Tech Stack

### Backend (Data Pipeline)
- **Language:** Python 3.12
- **Database:** Supabase (PostgreSQL) — project "Missile Tracking Collector"
- **Automation:** GitHub Actions cron job (every 2 hours)
- **AI Collection:** Anthropic API with web search (Claude Sonnet) for autonomous event discovery
- **Key libraries:** supabase-py, python-dotenv, anthropic

### Frontend (Globe Visualization)
- **Framework:** React 18 + Vite
- **Globe:** globe.gl (3D WebGL globe)
- **Styling:** Tailwind CSS
- **APIs:** Supabase (missile data), OpenSky Network OAuth2 (air traffic), YouTube Data API v3 (live news)
- **Server-side proxies:** Vite custom plugins for OpenSky and YouTube (credentials never reach browser)

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

2. **Automated (cron job):** `.github/workflows/collect.yml` runs every 2 hours via GitHub Actions. It calls `src/scheduled_collection.py`, which uses the Anthropic API with web search to autonomously find new missile events and insert them into Supabase.

**Data flow:** Web search → Claude structures events → duplicate check against Supabase → insert new rows (append-only, never delete/overwrite).

### Backend modules

- `src/supabase_client.py` — Creates and returns the Supabase client. Loads credentials from `.env` (or `.env.txt` on Windows).
- `src/models.py` — `MissileEvent` dataclass defining the schema. All numeric fields (`casualties_reported`, `missile_count`, `intercepted_count`) default to `0`.
- `src/database.py` — CRUD operations: `insert_event()`, `insert_events()`, `get_event_by_id()`, `update_event()`, `get_latest_events()`, `check_duplicate()`.
- `src/scheduled_collection.py` — Headless collection script for the cron job. Uses Anthropic API with `web_search_20250305` tool. Broad search terms cover missile strikes, rocket attacks, drone strikes, airstrikes, Shahed drones, Houthi attacks, Hezbollah rocket fire, and more. Includes retry logic with 60s backoff for rate limits.
- `src/initial_collection.py` — One-time seed script with 17 hardcoded events from Jan-Mar 2026.
- `setup_supabase_table.sql` — Database schema with indexes, RLS policies, and auto-updating `updated_at` trigger. Run once in Supabase SQL Editor.

### Frontend components

- `frontend/src/App.jsx` — Main app layout: StatusBar, ConflictPanel, Globe, EventPanel, Controls, TimeTravel, DataTable, LiveNewsPlayer. Background audio with mute toggle.
- `frontend/src/components/MissileGlobe.jsx` — 3D globe with missile arcs, launch/impact points, rings, and air traffic overlay (labelsData layer).
- `frontend/src/components/Controls.jsx` — Floating control panel: freeze, time travel, data explorer, globe style, air traffic toggle, live news toggle, confidence filters, missile type layers, AI disclaimer tooltip.
- `frontend/src/components/LiveNewsPlayer.jsx` — Draggable, resizable picture-in-picture YouTube player. Searches Fox News, CNN, CNBC Squawk, and Middle East broadcasters (Al Jazeera, Al Arabiya, Iran International, TRT World, Sky News Arabia, i24NEWS). Max 9 streams, channel-level dedup.
- `frontend/src/components/AirTrafficLayer.jsx` — `useAirTraffic()` hook for live aircraft positions. Data priority: authenticated OpenSky proxy → anonymous API → CORS proxies → sessionStorage cache → seed data (500 aircraft).
- `frontend/src/data/seedAircraft.json` — 500 realistic aircraft positions as fallback when API is unavailable.
- `frontend/vite.config.js` — Vite config with two custom server-side proxy plugins: `openSkyProxyPlugin()` (OAuth2 token exchange) and `youTubeProxyPlugin()` (API key proxy). Credentials read from `.env` without VITE_ prefix.

## Data Rules

- **Append-only** — never delete or overwrite existing records
- **2026 data only** — do not include events from other years
- **No null numerics** — `casualties_reported`, `missile_count`, `intercepted_count` must always be `0` when unknown, never `null`. This is critical for BI tool aggregation.
- **Event ID format:** `MSL-YYYYMMDD-HHMM-XXX` (e.g., `MSL-20260304-0800-001`)
- **All timestamps in UTC** (ISO 8601)
- **Confidence levels:** `confirmed`, `likely`, `unverified`
- **Duplicate prevention:** Always call `check_duplicate()` before inserting. The `event_id` column also has a `UNIQUE` database constraint as a safety net.

## Environment Variables

### GitHub Actions Secrets (for cron job)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ANTHROPIC_API_KEY`

### Frontend `.env` (for Vite dev server proxies — no VITE_ prefix)
- `OPENSKY_CLIENT_ID` — OpenSky Network OAuth2 client ID
- `OPENSKY_CLIENT_SECRET` — OpenSky Network OAuth2 client secret
- `YOUTUBE_API_KEY` — YouTube Data API v3 key

## Conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Git author: `OBIS-DataScience <jacqueline@omnibisolutions.com>`
- GitHub owner: `OBIS-DataScience`

## Supabase Access

- **Table Editor:** View all data at Supabase Dashboard → Table Editor → `missile_events`
- **REST API:** `https://gobbelymdcxrrobciquy.supabase.co/rest/v1/missile_events?select=*`
- **SQL Editor:** Run custom queries directly in the Supabase Dashboard
