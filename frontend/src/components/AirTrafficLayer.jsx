import { useState, useEffect, useRef, useCallback } from 'react'
import seedAircraft from '../data/seedAircraft.json'

/**
 * Primary data source: our own Vite dev server proxy at /api/opensky.
 * The proxy handles OAuth2 authentication server-side so credentials
 * never reach the browser. Falls back to direct anonymous API and
 * CORS proxies if the local proxy isn't available.
 */
const LOCAL_PROXY = '/api/opensky'
const OPENSKY_URL = 'https://opensky-network.org/api/states/all'
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
]
const POLL_INTERVAL = 30_000  // 30 seconds — authenticated users have higher limits
const CACHE_KEY = 'airTrafficCache'

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw).aircraft || null
  } catch {
    return null
  }
}

function writeCache(aircraft) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      aircraft,
      timestamp: Date.now(),
    }))
  } catch {}
}

function parseStates(states) {
  const aircraft = []
  for (const state of states) {
    const lng = state[5]
    const lat = state[6]
    const onGround = state[8]
    if (lat == null || lng == null || onGround) continue
    aircraft.push({
      icao24: state[0],
      callsign: (state[1] || '').trim() || 'N/A',
      originCountry: state[2] || 'Unknown',
      lat,
      lng,
      altitude: state[7] != null ? Math.round(state[7]) : null,
      velocity: state[9] != null ? Math.round(state[9]) : null,
      heading: state[10],
    })
  }
  return aircraft
}

/**
 * Custom React hook that provides live aircraft positions on the globe.
 *
 * Data priority (highest to lowest):
 *   1. Authenticated API via local proxy (best — higher rate limits)
 *   2. Anonymous direct API / CORS proxies (fallback)
 *   3. sessionStorage cache (survives toggles and refreshes)
 *   4. Seed data (500 realistic positions baked into the build)
 */
export function useAirTraffic(enabled) {
  const [aircraft, setAircraft] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchAircraft = useCallback(async () => {
    // Try authenticated proxy first, then anonymous fallbacks
    const strategies = [
      { name: 'proxy (authenticated)', fn: () => fetch(LOCAL_PROXY) },
      { name: 'direct (anonymous)', fn: () => fetch(OPENSKY_URL) },
      ...CORS_PROXIES.map((proxy, i) => ({
        name: `CORS proxy ${i + 1}`,
        fn: () => fetch(`${proxy}${encodeURIComponent(OPENSKY_URL)}`),
      })),
    ]

    for (const strategy of strategies) {
      try {
        const response = await strategy.fn()
        if (response.status === 429) {
          console.log(`[AirTraffic] ${strategy.name} rate-limited, trying next...`)
          continue
        }
        if (!response.ok) continue

        const data = await response.json()
        if (!data.states) continue

        const allAircraft = parseStates(data.states)
        console.log(`[AirTraffic] Live: ${allAircraft.length} aircraft (${strategy.name})`)
        setAircraft(allAircraft)
        writeCache(allAircraft)
        setError(null)
        setLoading(false)
        return
      } catch {
        continue
      }
    }

    console.log('[AirTraffic] All strategies failed, showing cached/seed data')
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setAircraft([])
      setError(null)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Show data immediately: cache first, seed as fallback
    const cached = readCache()
    if (cached && cached.length > 0) {
      console.log(`[AirTraffic] Cache: ${cached.length} aircraft`)
      setAircraft(cached)
    } else {
      console.log(`[AirTraffic] Seed: ${seedAircraft.length} aircraft`)
      setAircraft(seedAircraft)
    }
    setLoading(false)

    // Fetch fresh data in background
    fetchAircraft()
    intervalRef.current = setInterval(fetchAircraft, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, fetchAircraft])

  return { aircraft, loading, error }
}
