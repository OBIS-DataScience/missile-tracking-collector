"""
Monte Carlo Simulation Engine for Missile Attack Prediction.

This module analyzes historical missile event data from Supabase and runs
thousands of random simulations to predict the most likely next attacks.

Think of it like weather forecasting: we look at past patterns (who attacks
whom, with what weapon, at what time) and run 10,000 "what if" scenarios.
The scenarios that come up most often become our top predictions.

How it works:
1. Load all historical events from Supabase
2. Build probability distributions:
   - Which countries attack? (weighted by frequency)
   - Who do they target? (per sender)
   - What weapons do they use? (per sender)
   - What time of day? (per sender)
   - What locations? (per sender->target pair)
3. Run 10,000 Monte Carlo iterations, each time randomly picking:
   - A sender (weighted by attack frequency)
   - A target (weighted by that sender's target history)
   - A weapon type (weighted by that sender's weapon history)
   - A time of day (weighted by that sender's timing patterns)
   - A location (sampled from historical coordinates)
4. Count how often each scenario appears -> probability %
5. Write top predictions to the predicted_attacks table

Usage:
    python -m src.simulation
"""

import random
import json
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

from dotenv import load_dotenv
load_dotenv()

from .supabase_client import get_supabase_client

TABLE_EVENTS = "missile_events"
TABLE_PREDICTIONS = "predicted_attacks"
NUM_SIMULATIONS = 10_000
TOP_N_PREDICTIONS = 10


def load_events():
    """Load all missile events from Supabase."""
    client = get_supabase_client()
    result = (
        client.table(TABLE_EVENTS)
        .select("*")
        .order("event_timestamp_utc", desc=True)
        .execute()
    )
    return result.data or []


def build_distributions(events):
    """
    Analyze historical events and build probability distributions.

    Returns a dict of distributions that the Monte Carlo sampler uses:
    - sender_weights: how often each country launches attacks
    - target_weights[sender]: who each sender targets
    - weapon_weights[sender]: what weapons each sender uses
    - hour_weights[sender]: what hour of day each sender attacks
    - locations[sender][target]: list of (launch_lat/lng, target_lat/lng) pairs
    """
    sender_counts = Counter()
    target_by_sender = defaultdict(Counter)
    weapon_by_sender = defaultdict(Counter)
    hour_by_sender = defaultdict(Counter)
    locations = defaultdict(lambda: defaultdict(list))

    for e in events:
        sender = e.get("sender_country")
        target = e.get("target_country")
        if not sender or not target:
            continue

        sender_counts[sender] += 1
        target_by_sender[sender][target] += 1
        weapon_by_sender[sender][e.get("missile_type") or "unknown"] += 1

        # Extract hour of day from timestamp
        ts = e.get("event_timestamp_utc")
        if ts:
            try:
                hour = datetime.fromisoformat(ts.replace("Z", "+00:00")).hour
                hour_by_sender[sender][hour] += 1
            except (ValueError, AttributeError):
                pass

        # Store location pairs for coordinate sampling
        if all([e.get("launch_latitude"), e.get("launch_longitude"),
                e.get("target_latitude"), e.get("target_longitude")]):
            locations[sender][target].append({
                "launch_lat": e["launch_latitude"],
                "launch_lng": e["launch_longitude"],
                "target_lat": e["target_latitude"],
                "target_lng": e["target_longitude"],
            })

    return {
        "sender_weights": sender_counts,
        "target_weights": dict(target_by_sender),
        "weapon_weights": dict(weapon_by_sender),
        "hour_weights": dict(hour_by_sender),
        "locations": locations,
    }


def weighted_choice(counter):
    """
    Pick a random item from a Counter, weighted by count.

    Like drawing from a bag of marbles — if Iran has 15 marbles and
    Russia has 10, Iran gets picked ~60% of the time.
    """
    items = list(counter.keys())
    weights = list(counter.values())
    return random.choices(items, weights=weights, k=1)[0]


def sample_location(locations, sender, target):
    """
    Pick a random historical location pair for a sender->target route.

    Adds slight randomness (jitter) so predictions aren't exact copies
    of past events — real attacks vary by a few km.
    """
    loc_list = locations.get(sender, {}).get(target, [])
    if not loc_list:
        return None, None, None, None

    loc = random.choice(loc_list)
    # Add small jitter (roughly +-10km) to avoid exact duplicates
    jitter = lambda v: v + random.uniform(-0.1, 0.1)
    return (
        jitter(loc["launch_lat"]),
        jitter(loc["launch_lng"]),
        jitter(loc["target_lat"]),
        jitter(loc["target_lng"]),
    )


def run_monte_carlo(distributions):
    """
    Run NUM_SIMULATIONS random attack scenarios and count outcomes.

    Each simulation picks a random sender, target, weapon, and time
    weighted by historical frequency. After all simulations, we count
    how often each unique scenario appeared.

    Returns:
        list of dicts with scenario details and probability
    """
    sender_weights = distributions["sender_weights"]
    target_weights = distributions["target_weights"]
    weapon_weights = distributions["weapon_weights"]
    hour_weights = distributions["hour_weights"]
    locations = distributions["locations"]

    if not sender_weights:
        print("  No historical data to simulate from.")
        return []

    # Run simulations — each one is like rolling weighted dice
    scenario_counts = Counter()
    scenario_details = {}

    for _ in range(NUM_SIMULATIONS):
        sender = weighted_choice(sender_weights)

        # Pick target based on this sender's history
        if sender in target_weights:
            target = weighted_choice(target_weights[sender])
        else:
            continue

        # Pick weapon based on this sender's history
        weapon = "unknown"
        if sender in weapon_weights:
            weapon = weighted_choice(weapon_weights[sender])

        # Pick hour based on this sender's timing
        peak_hour = 0
        if sender in hour_weights:
            peak_hour = weighted_choice(hour_weights[sender])

        # Create a scenario key (sender + target + weapon)
        key = (sender, target, weapon)
        scenario_counts[key] += 1

        # Store details on first occurrence
        if key not in scenario_details:
            launch_lat, launch_lng, target_lat, target_lng = sample_location(
                locations, sender, target
            )
            scenario_details[key] = {
                "sender": sender,
                "target": target,
                "weapon": weapon,
                "peak_hour": peak_hour,
                "launch_lat": launch_lat,
                "launch_lng": launch_lng,
                "target_lat": target_lat,
                "target_lng": target_lng,
            }

    # Convert counts to probabilities and rank
    results = []
    for key, count in scenario_counts.most_common(TOP_N_PREDICTIONS):
        details = scenario_details[key]
        probability = round((count / NUM_SIMULATIONS) * 100, 1)

        # Historical frequency = how many real events match this pattern
        hist_freq = 0
        if details["sender"] in target_weights:
            hist_freq = target_weights[details["sender"]].get(details["target"], 0)

        results.append({
            "sender": details["sender"],
            "target": details["target"],
            "weapon": details["weapon"],
            "probability": probability,
            "sample_count": count,
            "historical_frequency": hist_freq,
            "peak_hour": details["peak_hour"],
            "launch_lat": details["launch_lat"],
            "launch_lng": details["launch_lng"],
            "target_lat": details["target_lat"],
            "target_lng": details["target_lng"],
        })

    return results


def get_iso_code(country_name, events):
    """Look up the ISO code for a country from historical events."""
    for e in events:
        if e.get("sender_country") == country_name and e.get("sender_country_iso"):
            return e["sender_country_iso"]
        if e.get("target_country") == country_name and e.get("target_country_iso"):
            return e["target_country_iso"]
    return None


def save_predictions(predictions, events):
    """
    Clear old predictions and write new ones to Supabase.

    Unlike missile_events (append-only), predictions are replaced
    every cycle because they're recalculated from the full dataset.
    """
    client = get_supabase_client()
    now = datetime.now(timezone.utc)

    # Delete previous predictions — these are recalculated each run
    try:
        client.table(TABLE_PREDICTIONS).delete().neq("prediction_id", "").execute()
    except Exception as e:
        print(f"  Warning: could not clear old predictions: {e}")

    inserted = 0
    for i, pred in enumerate(predictions):
        prediction_id = f"PRED-{now.strftime('%Y%m%d-%H%M')}-{i+1:03d}"

        # Build a time window: next 6 hours around the peak hour
        predicted_start = now.replace(hour=pred["peak_hour"], minute=0, second=0, microsecond=0)
        if predicted_start < now:
            predicted_start += timedelta(days=1)
        predicted_end = predicted_start + timedelta(hours=6)

        reasoning = (
            f"Based on {pred['historical_frequency']} historical attacks from "
            f"{pred['sender']} against {pred['target']}, "
            f"{pred['weapon']} is the most likely weapon type. "
            f"Attacks typically occur around {pred['peak_hour']:02d}:00 UTC."
        )

        row = {
            "prediction_id": prediction_id,
            "generated_at": now.isoformat(),
            "simulation_runs": NUM_SIMULATIONS,
            "sender_country": pred["sender"],
            "sender_country_iso": get_iso_code(pred["sender"], events),
            "target_country": pred["target"],
            "target_country_iso": get_iso_code(pred["target"], events),
            "missile_type": pred["weapon"],
            "launch_latitude": pred["launch_lat"],
            "launch_longitude": pred["launch_lng"],
            "target_latitude": pred["target_lat"],
            "target_longitude": pred["target_lng"],
            "probability": pred["probability"],
            "sample_count": pred["sample_count"],
            "historical_frequency": pred["historical_frequency"],
            "predicted_window_start": predicted_start.isoformat(),
            "predicted_window_end": predicted_end.isoformat(),
            "peak_hour_utc": pred["peak_hour"],
            "reasoning": reasoning,
        }

        try:
            client.table(TABLE_PREDICTIONS).insert(row).execute()
            print(f"  PRED  {prediction_id} — {pred['sender']} -> {pred['target']} "
                  f"({pred['weapon']}) {pred['probability']}%")
            inserted += 1
        except Exception as e:
            print(f"  ERROR {prediction_id} — {e}")

    return inserted


def run_simulation():
    """Main entry point for the Monte Carlo simulation."""
    print()
    print("=" * 60)
    print("MONTE CARLO SIMULATION ENGINE")
    print(f"Time:  {datetime.now(timezone.utc).isoformat()}")
    print(f"Runs:  {NUM_SIMULATIONS:,} simulations")
    print("=" * 60)
    print()

    # Step 1: Load historical data
    events = load_events()
    print(f"Loaded {len(events)} historical events")

    if len(events) < 3:
        print("Not enough data for meaningful simulation (need at least 3 events).")
        return

    # Step 2: Build probability distributions
    print("Building probability distributions...")
    distributions = build_distributions(events)

    senders = len(distributions["sender_weights"])
    print(f"  {senders} unique attacking countries")
    print(f"  {sum(len(v) for v in distributions['target_weights'].values())} unique attack routes")

    # Step 3: Run Monte Carlo
    print(f"\nRunning {NUM_SIMULATIONS:,} simulations...")
    predictions = run_monte_carlo(distributions)
    print(f"Generated {len(predictions)} top predictions")
    print()

    # Step 4: Save to Supabase
    if predictions:
        inserted = save_predictions(predictions, events)
        print()
        print("=" * 60)
        print(f"SIMULATION COMPLETE")
        print(f"  Predictions saved: {inserted}")
        print("=" * 60)
    else:
        print("No predictions generated.")


if __name__ == "__main__":
    run_simulation()
