import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import MissileGlobe from './components/MissileGlobe'
import MapboxGlobe from './components/MapboxGlobe'
import EventTooltip from './components/EventTooltip'
import StatusBar from './components/StatusBar'
import Controls from './components/Controls'
import EventPanel from './components/EventPanel'
import ConflictPanel from './components/ConflictPanel'
import TimeTravel from './components/TimeTravel'
import MissileProfile from './components/MissileProfile'
import DataTable from './components/DataTable'
import { fetchMissileEvents, fetchPredictions } from './lib/supabase'
import { useAirTraffic } from './components/AirTrafficLayer'
import LiveNewsPlayer from './components/LiveNewsPlayer'
import SimulationPanel from './components/SimulationPanel'
import PrayerTicker from './components/PrayerTicker'
import IntelBriefing from './components/IntelBriefing'

/**
 * Main application — the Global Missile Activity Intelligence Console.
 *
 * Three-zone layout with collapsible side panels for responsive design:
 *   [StatusBar]                     — top: live clock, data freshness, metrics
 *   [ConflictPanel] [Globe] [EventPanel] — main content (panels hide on small screens)
 *   [Controls]                      — bottom-left: freeze, filters, type layers
 *   [TimeTravel]                    — bottom-center: timeline scrubber (when active)
 *   [DataTable]                     — full-screen overlay (when opened)
 */
export default function App() {
  // --- Data state ---
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // --- UI state ---
  const [frozen, setFrozen] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [activeConflict, setActiveConflict] = useState('Global')
  const [showDataTable, setShowDataTable] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [globeStyle, setGlobeStyle] = useState('night') // 'night' or 'mapbox'
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.4)
  const [airTrafficEnabled, setAirTrafficEnabled] = useState(false)
  const [liveNewsOpen, setLiveNewsOpen] = useState(false)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [predictions, setPredictions] = useState([])
  const [briefingOpen, setBriefingOpen] = useState(false)
  const audioRef = useRef(null)

  // Live aircraft data — only fetches when the toggle is on
  const { aircraft: airTrafficData } = useAirTraffic(airTrafficEnabled)

  // --- Filters ---
  const [confidenceFilter, setConfidenceFilter] = useState([
    'confirmed', 'likely', 'unverified', 'intercepted',
  ])
  const [missileTypeFilter, setMissileTypeFilter] = useState([])

  // --- Time Travel ---
  const [timeTravelActive, setTimeTravelActive] = useState(false)
  const [timeTravelValue, setTimeTravelValue] = useState(Date.now())
  const [timeTravelPlaying, setTimeTravelPlaying] = useState(false)

  const globeRef = useRef(null)

  // Browsers block autoplay with sound until the user interacts with the page.
  // We listen for ANY interaction (mouse move, click, scroll, key press, touch)
  // so the music starts the instant someone moves their mouse over the globe.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume

    const tryPlay = () => {
      audio.play().then(() => {
        // Playback started — remove all listeners so we don't keep retrying
        interactionEvents.forEach((evt) =>
          document.removeEventListener(evt, onInteraction)
        )
      }).catch(() => {})
    }

    const interactionEvents = ['click', 'mousemove', 'scroll', 'keydown', 'touchstart', 'pointerdown']

    const onInteraction = () => tryPlay()

    // Try immediately in case the browser allows it
    tryPlay()

    // Otherwise, start on the very first user interaction of any kind
    interactionEvents.forEach((evt) =>
      document.addEventListener(evt, onInteraction, { once: false })
    )

    return () => {
      interactionEvents.forEach((evt) =>
        document.removeEventListener(evt, onInteraction)
      )
    }
  }, [])

  // ---------- Data loading ----------
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [data, preds] = await Promise.all([
        fetchMissileEvents(),
        fetchPredictions(),
      ])
      setEvents(data)
      setPredictions(preds)
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

  // ---------- Time Travel playback ----------
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

  // ---------- Responsive: auto-collapse panels on small screens ----------
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1024) {
        setLeftPanelOpen(false)
        setRightPanelOpen(false)
      } else {
        setLeftPanelOpen(true)
        setRightPanelOpen(true)
      }
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // ---------- Handlers ----------
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

  const handleConflictChange = useCallback((conflict) => {
    setActiveConflict(conflict)
    globeRef.current?.flyToConflict(conflict)
  }, [])

  const handleEventClick = useCallback((event) => {
    globeRef.current?.flyToEvent(event)
  }, [])

  // ---------- Filtered + time-sliced events ----------
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Confidence filter
      const passesConfidence = e.intercepted && confidenceFilter.includes('intercepted')
        ? true
        : confidenceFilter.includes(e.confidence_level)
      if (!passesConfidence) return false

      // Missile type filter
      const type = e.missile_type || 'unknown'
      if (missileTypeFilter.length > 0 && !missileTypeFilter.includes(type)) return false

      // Conflict filter
      if (activeConflict !== 'Global' && e.conflict_name !== activeConflict) return false

      // Time travel filter
      if (timeTravelActive) {
        const eventTime = new Date(e.event_timestamp_utc).getTime()
        if (eventTime > timeTravelValue) return false
      }

      return true
    })
  }, [events, confidenceFilter, missileTypeFilter, activeConflict, timeTravelActive, timeTravelValue])

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0F1A]">
      {/* Top status strip */}
      <StatusBar events={filteredEvents} allEvents={events} />

      {/* Main three-zone layout */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Left: Conflict Overview Panel — fully removed from DOM when collapsed */}
        {leftPanelOpen && (
          <ConflictPanel
            events={filteredEvents}
            activeConflict={activeConflict}
            onConflictChange={handleConflictChange}
          />
        )}

        {/* Center: Globe area */}
        <div className="relative flex-1 min-w-0">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B0F1A]/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white/40 tracking-wider uppercase">
                  Loading intelligence data...
                </span>
              </div>
            </div>
          )}

          {globeStyle === 'mapbox' ? (
            <MapboxGlobe
              ref={globeRef}
              events={filteredEvents}
              frozen={frozen}
              onHoverEvent={setHoveredEvent}
              onMouseMove={setMousePos}
              activeConflict={activeConflict}
              airTrafficData={airTrafficEnabled ? airTrafficData : []}
            />
          ) : (
            <MissileGlobe
              ref={globeRef}
              events={filteredEvents}
              frozen={frozen}
              onHoverEvent={setHoveredEvent}
              onMouseMove={setMousePos}
              activeConflict={activeConflict}
              globeStyle={globeStyle}
              airTrafficData={airTrafficEnabled ? airTrafficData : []}
            />
          )}

          {/* Panel toggle buttons — always visible for responsive */}
          <button
            onClick={() => setLeftPanelOpen((p) => !p)}
            className="absolute top-1/3 left-2 -translate-y-1/2 z-20
                       w-6 h-12 bg-navy-800/70 backdrop-blur border border-white/10
                       rounded-r-lg flex items-center justify-center
                       text-white/30 hover:text-white/60 transition-all"
            title={leftPanelOpen ? 'Hide conflict panel' : 'Show conflict panel'}
          >
            <span className="text-[10px]">{leftPanelOpen ? '<' : '>'}</span>
          </button>
          <button
            onClick={() => setRightPanelOpen((p) => !p)}
            className="absolute top-1/3 right-2 -translate-y-1/2 z-20
                       w-6 h-12 bg-navy-800/70 backdrop-blur border border-white/10
                       rounded-l-lg flex items-center justify-center
                       text-white/30 hover:text-white/60 transition-all"
            title={rightPanelOpen ? 'Hide event panel' : 'Show event panel'}
          >
            <span className="text-[10px]">{rightPanelOpen ? '>' : '<'}</span>
          </button>

          {/* Floating controls */}
          <Controls
            frozen={frozen}
            onToggleFreeze={() => setFrozen((f) => !f)}
            confidenceFilter={confidenceFilter}
            onToggleConfidence={handleToggleConfidence}
            events={events}
            missileTypeFilter={missileTypeFilter}
            onToggleMissileType={handleToggleMissileType}
            timeTravelActive={timeTravelActive}
            onToggleTimeTravel={() => setTimeTravelActive((t) => !t)}
            onOpenDataTable={() => setShowDataTable(true)}
            globeStyle={globeStyle}
            onToggleGlobeStyle={() => setGlobeStyle((s) => s === 'night' ? 'mapbox' : 'night')}
            airTrafficEnabled={airTrafficEnabled}
            onToggleAirTraffic={() => setAirTrafficEnabled((a) => !a)}
            liveNewsOpen={liveNewsOpen}
            onToggleLiveNews={() => setLiveNewsOpen((n) => !n)}
            simulationOpen={simulationOpen}
            onToggleSimulation={() => setSimulationOpen((s) => !s)}
            briefingOpen={briefingOpen}
            onToggleBriefing={() => setBriefingOpen((b) => !b)}
          />

          {/* Title watermark with AI 360 logo */}
          <div className="absolute top-3 left-10 z-10 flex items-center gap-3">
            <img
              src="/ai360-logo.png"
              alt="AI 360"
              className="h-8 sm:h-10 opacity-70"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.3em] text-red-500/80 uppercase leading-none">
                World War III
              </p>
              <h1 className="text-xs sm:text-sm font-semibold tracking-wider text-white/60 uppercase mt-0.5">
                Missile Tracking Collector
              </h1>
              <p className="text-[9px] sm:text-[10px] text-white/25 tracking-wider uppercase mt-0.5">
                Global Intelligence Console
              </p>
            </div>
          </div>

          {/* Event count badge */}
          <div className="absolute top-3 right-10 z-10 text-right">
            <div className="text-[9px] sm:text-[10px] text-white/25 tracking-wider uppercase">
              Tracking
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-white/70">
              {filteredEvents.length}
              <span className="text-[10px] sm:text-xs text-white/30 ml-1">events</span>
            </div>
          </div>

          {/* Background audio — loops continuously */}
          <audio ref={audioRef} src="/USArmyREMIXMixMaster.wav" loop muted={muted} />

          {/* Copyright */}
          <div className="absolute bottom-2 right-4 z-10">
            <span className="text-[10px] text-white/30 tracking-wide">
              (C) 2026 AI 360 | Omni BI Solutions
            </span>
          </div>

          {/* Now Playing + Volume control — bottom-right, above copyright */}
          <div className="absolute bottom-8 right-4 z-20 flex items-center gap-2">
            <div className="text-[11px] text-white/35 tracking-wide">
              <span className="text-white/55">Now Playing:</span> USA Army Remix by Blanc
            </div>
            <button
              onClick={() => setMuted((m) => !m)}
              className="flex items-center px-2 py-1
                         bg-navy-800/70 backdrop-blur border border-white/10
                         rounded text-white/40 hover:text-white/70
                         transition-all text-sm"
              title={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setVolume(v)
                if (audioRef.current) audioRef.current.volume = v
                if (v > 0 && muted) setMuted(false)
                if (v === 0) setMuted(true)
              }}
              className="w-16 h-1 accent-white/40 cursor-pointer opacity-50 hover:opacity-80 transition-opacity"
              title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Live news picture-in-picture player */}
          {liveNewsOpen && (
            <LiveNewsPlayer onClose={() => setLiveNewsOpen(false)} />
          )}

          {/* Monte Carlo Simulation Panel */}
          <SimulationPanel
            predictions={predictions}
            visible={simulationOpen}
            onToggle={() => setSimulationOpen(false)}
            onLocate={(pred) => {
              if (pred.target_latitude && pred.target_longitude) {
                globeRef.current?.flyToEvent({
                  launch_latitude: pred.launch_latitude || pred.target_latitude,
                  launch_longitude: pred.launch_longitude || pred.target_longitude,
                  target_latitude: pred.target_latitude,
                  target_longitude: pred.target_longitude,
                })
              }
            }}
          />

          {/* Intel Briefing Panel */}
          <IntelBriefing
            events={filteredEvents}
            predictions={predictions}
            visible={briefingOpen}
            onClose={() => setBriefingOpen(false)}
          />

          {/* Tooltip on hover */}
          <EventTooltip event={hoveredEvent} position={mousePos} />

          {/* Missile Profile modal */}
          <MissileProfile
            event={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />

          {/* Time Travel slider */}
          {timeTravelActive && (
            <TimeTravel
              events={events}
              value={timeTravelValue}
              onChange={setTimeTravelValue}
              playing={timeTravelPlaying}
              onTogglePlay={() => setTimeTravelPlaying((p) => !p)}
            />
          )}
        </div>

        {/* Right: Event Intelligence Feed — fully removed from DOM when collapsed */}
        {rightPanelOpen && (
          <EventPanel
            events={filteredEvents}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* Scripture prayer ticker — bottom of the screen */}
      <PrayerTicker />

      {/* Full-screen Data Table overlay */}
      {showDataTable && (
        <DataTable
          events={filteredEvents}
          onClose={() => setShowDataTable(false)}
        />
      )}
    </div>
  )
}
