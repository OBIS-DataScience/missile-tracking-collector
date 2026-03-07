import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchMissileEvents, fetchPredictions, fetchDataCenters } from '../lib/supabase'

/**
 * Shared data hook used by both desktop and mobile apps.
 * Handles all Supabase data fetching, filtering, and time travel logic
 * in one place so both platforms stay in sync.
 */
export default function useAppData() {
  // --- Raw data ---
  const [events, setEvents] = useState([])
  const [predictions, setPredictions] = useState([])
  const [dataCenters, setDataCenters] = useState([])
  const [loading, setLoading] = useState(true)

  // --- Filters ---
  const [confidenceFilter, setConfidenceFilter] = useState([
    'confirmed', 'likely', 'intercepted',
  ])
  const [missileTypeFilter, setMissileTypeFilter] = useState([])
  const [activeConflict, setActiveConflict] = useState('Global')
  const [dataCenterFilter, setDataCenterFilter] = useState([
    'Amazon AWS', 'Microsoft Azure', 'Oracle Cloud',
  ])

  // --- Time Travel ---
  const [timeTravelActive, setTimeTravelActive] = useState(false)
  const [timeTravelValue, setTimeTravelValue] = useState(Date.now())
  const [timeTravelPlaying, setTimeTravelPlaying] = useState(false)

  // --- Data loading ---
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [data, preds, dcs] = await Promise.all([
        fetchMissileEvents(),
        fetchPredictions(),
        fetchDataCenters(),
      ])
      setEvents(data)
      setPredictions(preds)
      setDataCenters(dcs)
      setLoading(false)

      const types = [...new Set(data.map((e) => e.missile_type).filter(Boolean))]
      setMissileTypeFilter(types)

      if (data.length) {
        const latest = Math.max(
          ...data.map((e) => new Date(e.event_timestamp_utc).getTime()).filter((t) => !isNaN(t))
        )
        setTimeTravelValue(latest)
      }
    }
    loadData()

    const interval = setInterval(loadData, 2 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // --- Time Travel playback ---
  useEffect(() => {
    if (!timeTravelPlaying || !timeTravelActive) return

    const interval = setInterval(() => {
      setTimeTravelValue((prev) => {
        const timestamps = events
          .map((e) => new Date(e.event_timestamp_utc).getTime())
          .filter((t) => !isNaN(t))
        const maxTime = Math.max(...timestamps)
        const next = prev + 3600000
        if (next >= maxTime) {
          setTimeTravelPlaying(false)
          return maxTime
        }
        return next
      })
    }, 200)

    return () => clearInterval(interval)
  }, [timeTravelPlaying, timeTravelActive, events])

  // --- Handlers ---
  const handleToggleConfidence = useCallback((level) => {
    setConfidenceFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }, [])

  const handleToggleMissileType = useCallback((type) => {
    setMissileTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }, [])

  const handleToggleDataCenter = useCallback((provider) => {
    setDataCenterFilter((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    )
  }, [])

  // --- Filtered events ---
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.intercepted) {
        if (!confidenceFilter.includes('intercepted')) return false
      } else {
        if (!confidenceFilter.includes(e.confidence_level)) return false
      }

      const type = e.missile_type || 'unknown'
      if (missileTypeFilter.length > 0 && !missileTypeFilter.includes(type)) return false

      if (activeConflict !== 'Global' && e.conflict_name !== activeConflict) return false

      if (timeTravelActive) {
        const eventTime = new Date(e.event_timestamp_utc).getTime()
        if (eventTime > timeTravelValue) return false
      }

      return true
    })
  }, [events, confidenceFilter, missileTypeFilter, activeConflict, timeTravelActive, timeTravelValue])

  const filteredDataCenters = useMemo(() => {
    return dataCenters.filter((dc) => dataCenterFilter.includes(dc.provider))
  }, [dataCenters, dataCenterFilter])

  return {
    // Raw data
    events,
    predictions,
    dataCenters,
    loading,

    // Filtered data
    filteredEvents,
    filteredDataCenters,

    // Filters
    confidenceFilter,
    missileTypeFilter,
    activeConflict,
    dataCenterFilter,

    // Filter handlers
    handleToggleConfidence,
    handleToggleMissileType,
    setActiveConflict,
    handleToggleDataCenter,

    // Time Travel
    timeTravelActive,
    setTimeTravelActive,
    timeTravelValue,
    setTimeTravelValue,
    timeTravelPlaying,
    setTimeTravelPlaying,
  }
}
