import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import MissileGlobe from './components/MissileGlobe'
import EventTooltip from './components/EventTooltip'
import StatusBar from './components/StatusBar'
import Controls from './components/Controls'
import EventPanel from './components/EventPanel'
import ConflictPanel from './components/ConflictPanel'
import PrayerTicker from './components/PrayerTicker'
import { fetchMissileEvents, fetchPredictions, fetchDataCenters } from './lib/supabase'

// Lazy-load heavy components — these only render when the user toggles them,
// so there's no reason to download them upfront and block the initial paint.
const MapboxGlobe = React.lazy(() => import('./components/MapboxGlobe'))
const TimeTravel = React.lazy(() => import('./components/TimeTravel'))
const MissileProfile = React.lazy(() => import('./components/MissileProfile'))
const DataTable = React.lazy(() => import('./components/DataTable'))
const LiveNewsPlayer = React.lazy(() => import('./components/LiveNewsPlayer'))
const SimulationPanel = React.lazy(() => import('./components/SimulationPanel'))

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
export default function DesktopApp() {
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
  const [liveNewsOpen, setLiveNewsOpen] = useState(false)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [predictions, setPredictions] = useState([])
  const [dataCenters, setDataCenters] = useState([])
  const [dataCenterFilter, setDataCenterFilter] = useState([
    'Amazon AWS', 'Microsoft Azure', 'Oracle Cloud',
  ])
  const audioRef = useRef(null)

  // --- Filters ---
  const [confidenceFilter, setConfidenceFilter] = useState([
    'confirmed', 'likely', 'intercepted',
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

  const handleToggleDataCenter = useCallback((provider) => {
    setDataCenterFilter((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    )
  }, [])

  const filteredDataCenters = useMemo(() => {
    return dataCenters.filter((dc) => dataCenterFilter.includes(dc.provider))
  }, [dataCenters, dataCenterFilter])

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
      // Intercepted events are controlled solely by the intercepted toggle —
      // they won't leak through via their confidence level
      if (e.intercepted) {
        if (!confidenceFilter.includes('intercepted')) return false
      } else {
        if (!confidenceFilter.includes(e.confidence_level)) return false
      }

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
            <React.Suspense fallback={<div className="w-full h-full bg-[#0B0F1A] flex items-center justify-center"><span className="text-white/30 text-xs">Loading map...</span></div>}>
              <MapboxGlobe
                ref={globeRef}
                events={filteredEvents}
                frozen={frozen}
                onHoverEvent={setHoveredEvent}
                onMouseMove={setMousePos}
                activeConflict={activeConflict}
                dataCenters={filteredDataCenters}
              />
            </React.Suspense>
          ) : (
            <MissileGlobe
              ref={globeRef}
              events={filteredEvents}
              frozen={frozen}
              onHoverEvent={setHoveredEvent}
              onMouseMove={setMousePos}
              activeConflict={activeConflict}
              globeStyle={globeStyle}
              dataCenters={filteredDataCenters}
            />
          )}

          {/* Panel toggle buttons — larger on mobile for touch, subtle on desktop */}
          <button
            onClick={() => setLeftPanelOpen((p) => !p)}
            className="absolute top-1/3 left-2 -translate-y-1/2 z-20
                       w-8 h-14 md:w-6 md:h-12 bg-navy-800/70 backdrop-blur border border-white/10
                       rounded-r-lg flex items-center justify-center
                       text-white/30 hover:text-white/60 active:scale-95 transition-all"
            title={leftPanelOpen ? 'Hide conflict panel' : 'Show conflict panel'}
          >
            <span className="text-xs md:text-[10px]">{leftPanelOpen ? '<' : '>'}</span>
          </button>
          <button
            onClick={() => setRightPanelOpen((p) => !p)}
            className="absolute top-1/3 right-2 -translate-y-1/2 z-20
                       w-8 h-14 md:w-6 md:h-12 bg-navy-800/70 backdrop-blur border border-white/10
                       rounded-l-lg flex items-center justify-center
                       text-white/30 hover:text-white/60 active:scale-95 transition-all"
            title={rightPanelOpen ? 'Hide event panel' : 'Show event panel'}
          >
            <span className="text-xs md:text-[10px]">{rightPanelOpen ? '>' : '<'}</span>
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
            liveNewsOpen={liveNewsOpen}
            onToggleLiveNews={() => setLiveNewsOpen((n) => !n)}
            simulationOpen={simulationOpen}
            onToggleSimulation={() => setSimulationOpen((s) => !s)}
            dataCenterFilter={dataCenterFilter}
            onToggleDataCenter={handleToggleDataCenter}
          />

          {/* Title watermark with AI 360 logo */}
          <div className="absolute top-2 md:top-3 left-10 z-10 flex items-center gap-2 md:gap-3">
            <img
              src="/ai360-logo.png"
              alt="AI 360"
              width="40"
              height="40"
              className="h-6 sm:h-8 md:h-10 w-auto opacity-70"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <p className="text-[8px] sm:text-[10px] md:text-xs font-bold tracking-[0.3em] text-red-500/80 uppercase leading-none">
                THREATNET
              </p>
              <h1 className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider text-white/60 uppercase mt-0.5">
                Global Strike Monitor
              </h1>
              <p className="text-[8px] sm:text-[9px] md:text-[10px] text-white/25 tracking-wider uppercase mt-0.5 hidden sm:block">
                Live Conflict Intelligence
              </p>
            </div>
          </div>

          {/* Event count badge */}
          <div className="absolute top-2 md:top-3 right-10 z-10 text-right">
            <div className="text-[8px] sm:text-[10px] text-white/25 tracking-wider uppercase">
              Tracking
            </div>
            <div className="text-sm sm:text-base md:text-lg font-mono font-bold text-white/70">
              {filteredEvents.length}
              <span className="text-[9px] sm:text-xs text-white/30 ml-1">events</span>
            </div>
          </div>

          {/* Background audio — loops continuously.
              preload="none" prevents the browser from downloading the 30MB file
              until the user interacts and playback starts. */}
          <audio ref={audioRef} src="/USArmyREMIXMixMaster_MP3.mp3" loop muted={muted} preload="none" />

          {/* Copyright */}
          <div className="absolute bottom-14 md:bottom-2 right-4 z-10">
            <span className="text-[9px] md:text-[10px] text-white/30 tracking-wide">
              © 2026 AI 360 | Omni BI Solutions
            </span>
          </div>

          {/* Now Playing + Volume control — above copyright, raised on mobile for drawer */}
          <div className="absolute bottom-[4.5rem] md:bottom-8 right-4 z-20 flex items-center gap-2">
            <div className="text-[9px] md:text-[11px] text-white/35 tracking-wide">
              <span className="text-white/55">Now Playing:</span> USA Army Remix by Blanc
            </div>
            <button
              onClick={() => setMuted((m) => !m)}
              className="flex items-center px-2.5 py-1.5 md:px-2 md:py-1
                         bg-navy-800/70 backdrop-blur border border-white/10
                         rounded text-white/40 hover:text-white/70
                         active:scale-95 transition-all text-sm"
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
              className="w-16 h-1 accent-white/40 cursor-pointer opacity-50 hover:opacity-80 transition-opacity hidden md:block"
              title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Lazy-loaded panels — wrapped in Suspense so they download
              only when the user actually opens them */}
          <React.Suspense fallback={null}>
            {/* Live news picture-in-picture player */}
            {liveNewsOpen && (
              <LiveNewsPlayer onClose={() => setLiveNewsOpen(false)} />
            )}

            {/* Monte Carlo Simulation Panel */}
            {simulationOpen && (
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
            )}

            {/* Missile Profile modal */}
            {selectedProfile && (
              <MissileProfile
                event={selectedProfile}
                onClose={() => setSelectedProfile(null)}
              />
            )}

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
          </React.Suspense>
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
        <React.Suspense fallback={null}>
          <DataTable
            events={filteredEvents}
            onClose={() => setShowDataTable(false)}
          />
        </React.Suspense>
      )}
    </div>
  )
}
