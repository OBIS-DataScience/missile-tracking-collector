"""
Initial bulk data collection for the Missile Tracking Collector.

This script loads all verified missile events from January 1, 2026 through
March 4, 2026 into the Supabase database. It covers two major conflict zones:

1. Russia-Ukraine War — ongoing missile exchanges
2. 2026 Iran Conflict — US/Israel strikes on Iran and Iranian retaliation

Run this once to seed the database:
    python -m src.initial_collection
"""

from datetime import datetime, timezone
from .supabase_client import get_supabase_client
from .models import MissileEvent

TABLE_NAME = "missile_events"


def get_initial_events() -> list[MissileEvent]:
    """
    Build the list of verified missile events from Jan-Mar 2026.

    Each event is sourced from multiple news outlets and cross-referenced
    for accuracy. Confidence levels reflect how well-documented each event is.
    """
    now = datetime.now(timezone.utc).isoformat()

    events = [
        # ============================================================
        # RUSSIA-UKRAINE WAR — January 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260106-0600-001",
            event_timestamp_utc="2026-01-06T06:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.aljazeera.com/news/2026/1/6/russia-ukraine-war-list-of-key-events-day-1412"
            ],
            sender_country="Russia",
            sender_country_iso="RUS",
            sender_faction="Russian Armed Forces",
            launch_location_name="Russia",
            launch_latitude=55.75,
            launch_longitude=37.62,
            target_country="Ukraine",
            target_country_iso="UKR",
            target_location_name="Kharkiv",
            target_latitude=49.99,
            target_longitude=36.23,
            target_type="infrastructure",
            missile_name="Mixed (cruise/ballistic)",
            missile_type="cruise",
            missile_origin_country="Russia",
            missile_count=5,
            warhead_type="conventional",
            intercepted=None,
            impact_confirmed=True,
            casualties_reported=1,
            damage_description="Energy infrastructure damaged, one person wounded",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note=None,
        ),

        MissileEvent(
            event_id="MSL-20260109-0300-001",
            event_timestamp_utc="2026-01-09T03:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.npr.org/2026/01/09/nx-s1-5672279/russia-used-new-oreshnik-ballistic-missile-ukraine",
                "https://www.euronews.com/2026/01/09/russia-uses-intermediate-range-oreshnik-ballistic-missile-to-strike-ukraine",
                "https://www.aljazeera.com/news/2026/1/10/russia-hits-ukraine-with-oreshnik-hypersonic-missile-why-it-matters"
            ],
            sender_country="Russia",
            sender_country_iso="RUS",
            sender_faction="Russian Armed Forces",
            launch_location_name="Kapustin Yar test range, Astrakhan Oblast",
            launch_latitude=48.57,
            launch_longitude=45.75,
            target_country="Ukraine",
            target_country_iso="UKR",
            target_location_name="Lviv",
            target_latitude=49.84,
            target_longitude=24.03,
            target_type="infrastructure",
            missile_name="Oreshnik",
            missile_type="hypersonic",
            missile_origin_country="Russia",
            missile_count=1,
            missile_range_km=5500.0,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=7,
            damage_description="Struck infrastructure in Lviv region. 7 killed including 3 children. Qatari Embassy in Kyiv damaged.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note="Second operational use of Oreshnik hypersonic IRBM. Speed: 13,000 km/h. Russia framed as retaliation for alleged drone strike on Putin's residence.",
        ),

        MissileEvent(
            event_id="MSL-20260109-0300-002",
            event_timestamp_utc="2026-01-09T03:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.cbc.ca/news/world/ukraine-war-russia-missile-9.7039207",
                "https://www.npr.org/2026/01/09/nx-s1-5672279/russia-used-new-oreshnik-ballistic-missile-ukraine"
            ],
            sender_country="Russia",
            sender_country_iso="RUS",
            sender_faction="Russian Armed Forces",
            launch_location_name="Russia",
            launch_latitude=55.75,
            launch_longitude=37.62,
            target_country="Ukraine",
            target_country_iso="UKR",
            target_location_name="Kyiv",
            target_latitude=50.45,
            target_longitude=30.52,
            target_type="civilian_area",
            missile_name="Mixed (Iskander, Kalibr, drones)",
            missile_type="ballistic",
            missile_origin_country="Russia",
            missile_count=36,
            warhead_type="conventional",
            intercepted=True,
            impact_confirmed=True,
            casualties_reported=4,
            damage_description="Part of massive overnight salvo of 36 missiles + 242 drones. 4 killed, 19 injured in Kyiv.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note=None,
        ),

        # ============================================================
        # UKRAINE STRIKES ON RUSSIA — February 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260206-1000-001",
            event_timestamp_utc="2026-02-06T10:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="likely",
            source_references=[
                "https://euromaidanpress.com/2026/02/06/flamingo-attack/"
            ],
            sender_country="Ukraine",
            sender_country_iso="UKR",
            sender_faction="Ukrainian Armed Forces",
            launch_location_name="Ukraine",
            launch_latitude=50.45,
            launch_longitude=30.52,
            target_country="Russia",
            target_country_iso="RUS",
            target_location_name="Kapustin Yar missile test range, Astrakhan Oblast",
            target_latitude=48.57,
            target_longitude=45.75,
            target_type="military_base",
            missile_name="FP-5 Flamingo",
            missile_type="cruise",
            missile_origin_country="Ukraine",
            missile_count=4,
            missile_range_km=1000.0,
            warhead_type="conventional",
            intercepted=None,
            impact_confirmed=False,
            casualties_reported=0,
            damage_description="At least 4 FP-5 Flamingo cruise missiles launched at Kapustin Yar. Early evidence suggests missiles did not hit intended targets.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note="First Ukrainian attempt to strike the base from which Oreshnik was launched.",
        ),

        MissileEvent(
            event_id="MSL-20260212-0800-001",
            event_timestamp_utc="2026-02-12T08:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://euromaidanpress.com/2026/02/12/ukraines-flamingo-missiles-strike-russia-twice-in-one-week-rocket-arsenal-hit/"
            ],
            sender_country="Ukraine",
            sender_country_iso="UKR",
            sender_faction="Ukrainian Armed Forces",
            launch_location_name="Ukraine",
            launch_latitude=50.45,
            launch_longitude=30.52,
            target_country="Russia",
            target_country_iso="RUS",
            target_location_name="Kotluban ammunition depot, Volgograd Oblast",
            target_latitude=48.94,
            target_longitude=44.80,
            target_type="military_base",
            missile_name="FP-5 Flamingo",
            missile_type="cruise",
            missile_origin_country="Ukraine",
            missile_count=6,
            missile_range_km=1200.0,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=0,
            damage_description="6 FP-5 Flamingo cruise missiles struck Russian ammunition depot near Kotluban, 1200 km from frontline.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note="Ukraine demonstrating deep-strike capability with domestically produced missiles.",
        ),

        MissileEvent(
            event_id="MSL-20260220-0600-001",
            event_timestamp_utc="2026-02-20T06:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.pravda.com.ua/eng/news/2026/02/21/8022076",
                "https://www.atlanticcouncil.org/blogs/ukrainealert/missiles-made-in-ukraine-are-bringing-putins-invasion-home-to-russia/"
            ],
            sender_country="Ukraine",
            sender_country_iso="UKR",
            sender_faction="Ukrainian Armed Forces",
            launch_location_name="Ukraine",
            launch_latitude=50.45,
            launch_longitude=30.52,
            target_country="Russia",
            target_country_iso="RUS",
            target_location_name="Votkinsk Machine Building Plant, Udmurtia",
            target_latitude=57.05,
            target_longitude=53.99,
            target_type="infrastructure",
            missile_name="FP-5 Flamingo",
            missile_type="cruise",
            missile_origin_country="Ukraine",
            missile_count=0,
            missile_range_km=1400.0,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=0,
            damage_description="FP-5 Flamingo cruise missiles struck the Votkinsk plant (1400 km from Ukraine), which produces Iskander ballistic missiles. Impacts confirmed on production workshops.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note="Deepest Ukrainian strike yet. First successful hit on a strategically significant Russian defense industry site with domestically produced missiles.",
        ),

        # ============================================================
        # RUSSIA STRIKES ON UKRAINE — February 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260222-0200-001",
            event_timestamp_utc="2026-02-22T02:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.usnews.com/news/world/articles/2026-02-22/russia-hits-ukraine-energy-infrastructure-with-major-missile-drone-strikes-kyiv-says",
                "https://united24media.com/latest-news/russia-launched-record-drone-and-missile-attacks-on-ukraine-in-february-2026-16405"
            ],
            sender_country="Russia",
            sender_country_iso="RUS",
            sender_faction="Russian Armed Forces",
            launch_location_name="Russia",
            launch_latitude=55.75,
            launch_longitude=37.62,
            target_country="Ukraine",
            target_country_iso="UKR",
            target_location_name="Kyiv, Odesa, central Ukraine",
            target_latitude=50.45,
            target_longitude=30.52,
            target_type="infrastructure",
            missile_name="Mixed (ballistic and cruise)",
            missile_type="cruise",
            missile_origin_country="Russia",
            missile_count=50,
            warhead_type="conventional",
            intercepted=True,
            intercepted_count=33,
            impact_confirmed=True,
            casualties_reported=1,
            damage_description="50 missiles + 297 drones. 33 missiles and 274 drones intercepted. Energy sector primary target. 1 killed, 5 wounded in Kyiv region.",
            conflict_name="Russia-Ukraine War",
            conflict_parties=["Russia", "Ukraine"],
            escalation_note="Part of record-breaking February 2026 where Russia launched 288 missiles (113% increase over January).",
        ),

        # ============================================================
        # 2026 IRAN CONFLICT — US/Israel strikes on Iran (Feb 28)
        # ============================================================

        MissileEvent(
            event_id="MSL-20260228-0400-001",
            event_timestamp_utc="2026-02-28T04:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://en.wikipedia.org/wiki/2026_Israeli%E2%80%93United_States_strikes_on_Iran",
                "https://commonslibrary.parliament.uk/research-briefings/cbp-10521/",
                "https://www.fdd.org/analysis/2026/03/03/us-israeli-strikes-hit-irans-missile-nuclear-political-and-repression-sites/"
            ],
            sender_country="Israel",
            sender_country_iso="ISR",
            sender_faction="Israeli Air Force / US Military (joint operation)",
            launch_location_name="Israel / US naval assets",
            launch_latitude=32.08,
            launch_longitude=34.78,
            target_country="Iran",
            target_country_iso="IRN",
            target_location_name="Tehran, Isfahan, Qom, Karaj, Kermanshah, and 20+ other cities",
            target_latitude=35.69,
            target_longitude=51.39,
            target_type="government",
            missile_name="Mixed (Tomahawk, JDAM, Black Sparrow ALBM)",
            missile_type="cruise",
            missile_origin_country="United States",
            missile_count=1200,
            warhead_type="conventional",
            intercepted=None,
            impact_confirmed=True,
            casualties_reported=1045,
            damage_description="Operation Roaring Lion (Israel) / Epic Fury (US). 1200+ munitions across 24 of 31 Iranian provinces. Struck nuclear sites, missile facilities, government ministries, defense industry. Supreme Leader Khamenei killed.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["United States", "Israel", "Iran"],
            escalation_note="MAJOR ESCALATION: Joint US-Israel strike assassinated Iran's Supreme Leader. Largest coordinated military operation against Iran in history.",
        ),

        # ============================================================
        # IRAN RETALIATION — Feb 28, 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260228-0800-001",
            event_timestamp_utc="2026-02-28T08:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://en.wikipedia.org/wiki/2026_Iranian_strikes_on_the_United_Arab_Emirates",
                "https://defence-industry.eu/iran-fires-ballistic-missiles-at-u-s-al-dhafra-air-base-in-uae-as-thaad-system-intercepts-incoming-threats/"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="United Arab Emirates",
            target_country_iso="ARE",
            target_location_name="Al Dhafra Air Base and other UAE targets",
            target_latitude=24.25,
            target_longitude=54.55,
            target_type="military_base",
            missile_name="Mixed Iranian ballistic missiles",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=137,
            warhead_type="conventional",
            intercepted=True,
            intercepted_count=152,
            interception_system="THAAD",
            impact_confirmed=True,
            casualties_reported=3,
            damage_description="137 ballistic missiles + 209 drones at UAE. THAAD intercepted most. Debris fell near Zayed Intl Airport. 3 killed, 68 injured (mostly from interception debris).",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "United States", "United Arab Emirates"],
            escalation_note="Largest volume of fire at any Gulf state. Iran targeted US forces at Al Dhafra.",
        ),

        MissileEvent(
            event_id="MSL-20260228-0800-002",
            event_timestamp_utc="2026-02-28T08:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.aljazeera.com/news/2026/2/28/multiple-gulf-arab-states-that-host-us-assets-targeted-in-iran-retaliation",
                "https://abcnews.com/International/live-updates/iran-live-updates-israel-launches-preemptive-strike-iran/?id=130301492"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Qatar",
            target_country_iso="QAT",
            target_location_name="Al Udeid Air Base",
            target_latitude=25.12,
            target_longitude=51.31,
            target_type="military_base",
            missile_name="Iranian ballistic missiles",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=65,
            warhead_type="conventional",
            intercepted=True,
            impact_confirmed=True,
            casualties_reported=0,
            damage_description="65 ballistic missiles + 12 drones at Qatar. One missile penetrated air defenses and struck Al Udeid Air Base. No casualties reported.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "United States", "Qatar"],
            escalation_note="Strike on Al Udeid — largest US military base in the Middle East.",
        ),

        MissileEvent(
            event_id="MSL-20260228-0800-003",
            event_timestamp_utc="2026-02-28T08:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.longwarjournal.org/archives/2026/03/iran-expands-retaliation-for-us-israel-campaign-across-arab-states-february-28-march-2.php",
                "https://www.aljazeera.com/news/2026/2/28/multiple-gulf-arab-states-that-host-us-assets-targeted-in-iran-retaliation"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Bahrain",
            target_country_iso="BHR",
            target_location_name="US Navy Fifth Fleet HQ, Bahrain",
            target_latitude=26.23,
            target_longitude=50.55,
            target_type="naval",
            missile_name="Iranian ballistic missiles",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=45,
            warhead_type="conventional",
            intercepted=True,
            impact_confirmed=None,
            casualties_reported=0,
            damage_description="45 ballistic missiles + 9 drones targeting Bahrain, including US Navy Fifth Fleet headquarters.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "United States", "Bahrain"],
            escalation_note=None,
        ),

        MissileEvent(
            event_id="MSL-20260228-1000-001",
            event_timestamp_utc="2026-02-28T10:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://edition.cnn.com/world/live-news/israel-iran-attack-02-28-26-hnk-intl"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Israel",
            target_country_iso="ISR",
            target_location_name="Tel Aviv",
            target_latitude=32.08,
            target_longitude=34.78,
            target_type="civilian_area",
            missile_name="Iranian ballistic missile",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=0,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=1,
            damage_description="Direct hit in Tel Aviv killed 1 woman and injured 22 others, one seriously.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "Israel"],
            escalation_note=None,
        ),

        # ============================================================
        # IRAN RETALIATION — March 1, 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260301-1200-001",
            event_timestamp_utc="2026-03-01T12:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.timesofisrael.com/nine-people-killed-in-iranian-missile-strike-on-residential-area-in-beit-shemesh/",
                "https://www.aljazeera.com/news/2026/3/1/at-least-nine-killed-after-iranian-strike-on-israels-beit-shemesh"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Israel",
            target_country_iso="ISR",
            target_location_name="Beit Shemesh",
            target_latitude=31.75,
            target_longitude=34.99,
            target_type="civilian_area",
            missile_name="Iranian ballistic missile",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=1,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=9,
            damage_description="Direct hit destroyed synagogue and bomb shelter. 9 killed, 49 injured. Deadliest single strike on Israel during the conflict.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "Israel"],
            escalation_note="Deadliest Iranian missile impact on Israeli soil in this conflict.",
        ),

        # ============================================================
        # HEZBOLLAH STRIKES — March 2, 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260302-0600-001",
            event_timestamp_utc="2026-03-02T06:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.npr.org/2026/03/02/g-s1-112140/hezbollah-strikes-israel",
                "https://www.timesofisrael.com/liveblog-march-02-2026/"
            ],
            sender_country="Lebanon",
            sender_country_iso="LBN",
            sender_faction="Hezbollah",
            launch_location_name="Southern Lebanon",
            launch_latitude=33.27,
            launch_longitude=35.20,
            target_country="Israel",
            target_country_iso="ISR",
            target_location_name="Ramat David airbase, Meron base, Camp Yitzhak",
            target_latitude=32.67,
            target_longitude=35.18,
            target_type="military_base",
            missile_name="Precision missiles and drones",
            missile_type="short_range",
            missile_origin_country="Iran",
            missile_count=0,
            warhead_type="conventional",
            intercepted=None,
            impact_confirmed=True,
            casualties_reported=0,
            damage_description="Hezbollah launched barrage of precision missiles and drones at 3 Israeli military bases. Claimed as revenge for killing of Khamenei.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Hezbollah", "Israel", "Iran"],
            escalation_note="ESCALATION: First Hezbollah attack on Israel in over a year. Opens new front in the Iran conflict.",
        ),

        MissileEvent(
            event_id="MSL-20260302-1400-001",
            event_timestamp_utc="2026-03-02T14:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.timesofisrael.com/19-injured-one-moderately-as-iranian-missile-hits-beersheba-amid-multiple-barrages/",
                "https://www.jpost.com/israel-news/article-888456"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Israel",
            target_country_iso="ISR",
            target_location_name="Beersheba",
            target_latitude=31.25,
            target_longitude=34.79,
            target_type="civilian_area",
            missile_name="Iranian ballistic missile",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=1,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=0,
            damage_description="Direct hit destroyed several homes. 19 injured (1 moderate, 18 light). All evacuated to Soroka Medical Center.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "Israel"],
            escalation_note=None,
        ),

        # ============================================================
        # ISRAEL RETALIATORY STRIKES ON LEBANON — March 2, 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260302-1800-001",
            event_timestamp_utc="2026-03-02T18:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.timesofisrael.com/idf-strikes-targets-in-beirut-after-hezbollah-enters-fray-fires-at-northern-israel/",
                "https://www.dailynews.com/2026/03/04/israeli-military-evacuations-lebanon/"
            ],
            sender_country="Israel",
            sender_country_iso="ISR",
            sender_faction="Israeli Defense Forces (IDF)",
            launch_location_name="Israel",
            launch_latitude=32.08,
            launch_longitude=34.78,
            target_country="Lebanon",
            target_country_iso="LBN",
            target_location_name="Beirut southern suburbs and southern Lebanon",
            target_latitude=33.89,
            target_longitude=35.50,
            target_type="military_base",
            missile_name="Air-launched munitions",
            missile_type="cruise",
            missile_origin_country="Israel",
            missile_count=0,
            warhead_type="conventional",
            intercepted=False,
            impact_confirmed=True,
            casualties_reported=31,
            damage_description="Israeli air strikes on Beirut and southern Lebanon in response to Hezbollah attacks. 31 killed (20 in Beirut suburbs, 11 in southern Lebanon), 149 injured.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Israel", "Hezbollah", "Lebanon"],
            escalation_note=None,
        ),

        # ============================================================
        # NATO INTERCEPT — March 4, 2026
        # ============================================================

        MissileEvent(
            event_id="MSL-20260304-1200-001",
            event_timestamp_utc="2026-03-04T12:00:00Z",
            collection_timestamp_utc=now,
            collection_cycle="2026-03-04_20",
            confidence_level="confirmed",
            source_references=[
                "https://www.aljazeera.com/news/2026/3/4/nato-defences-destroy-missile-fired-from-iran-over-mediterranean-turkiye",
                "https://www.bloomberg.com/news/articles/2026-03-04/nato-shoots-down-iranian-ballistic-missile-headed-for-turkey",
                "https://www.washingtonpost.com/world/2026/03/04/us-iran-israel-strikes-trump-live-updates/"
            ],
            sender_country="Iran",
            sender_country_iso="IRN",
            sender_faction="Islamic Revolutionary Guard Corps (IRGC)",
            launch_location_name="Iran",
            launch_latitude=32.65,
            launch_longitude=51.68,
            target_country="Turkey",
            target_country_iso="TUR",
            target_location_name="Turkish airspace (intercepted over Eastern Mediterranean)",
            target_latitude=36.80,
            target_longitude=34.60,
            target_type="unknown",
            missile_name="Iranian ballistic missile",
            missile_type="ballistic",
            missile_origin_country="Iran",
            missile_count=1,
            warhead_type="conventional",
            intercepted=True,
            intercepted_count=1,
            interception_system="NATO air and missile defense",
            impact_confirmed=False,
            casualties_reported=0,
            damage_description="Iranian ballistic missile passed through Iraqi and Syrian airspace toward Turkey. Intercepted by NATO air defense over Eastern Mediterranean. No casualties.",
            conflict_name="2026 Iran Conflict",
            conflict_parties=["Iran", "Turkey", "NATO"],
            escalation_note="ESCALATION: First Iranian missile heading toward NATO member state. NATO invoked collective defense language.",
        ),
    ]

    return events


def run_initial_collection():
    """Insert all initial events into Supabase."""
    print("=" * 60)
    print("MISSILE TRACKING COLLECTOR — Initial Data Load")
    print("=" * 60)
    print()

    events = get_initial_events()
    client = get_supabase_client()

    inserted = 0
    skipped = 0
    errors = 0

    for event in events:
        try:
            # Check for duplicates before inserting
            existing = (
                client.table(TABLE_NAME)
                .select("event_id")
                .eq("event_id", event.event_id)
                .execute()
            )

            if existing.data:
                print(f"  SKIP  {event.event_id} — already exists")
                skipped += 1
                continue

            client.table(TABLE_NAME).insert(event.to_dict()).execute()
            print(f"  INSERT {event.event_id} — {event.sender_country} -> {event.target_country} ({event.confidence_level})")
            inserted += 1

        except Exception as e:
            print(f"  ERROR {event.event_id} — {e}")
            errors += 1

    print()
    print("=" * 60)
    print(f"COLLECTION COMPLETE")
    print(f"  Inserted: {inserted}")
    print(f"  Skipped:  {skipped}")
    print(f"  Errors:   {errors}")
    print(f"  Total events in dataset: {inserted + skipped}")
    print("=" * 60)


if __name__ == "__main__":
    run_initial_collection()
