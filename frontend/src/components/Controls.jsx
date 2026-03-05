import React from 'react'
import { CONFIDENCE_COLORS, INTERCEPTED_COLOR } from '../lib/colors'
import MissileTypeFilter from './MissileTypeFilter'

/**
 * Floating control panel in the bottom-left corner.
 * Provides freeze mode, time travel, confidence filtering,
 * missile type layers, and a data explorer button.
 */
export default function Controls({
  frozen,
  onToggleFreeze,
  confidenceFilter,
  onToggleConfidence,
  events,
  missileTypeFilter,
  onToggleMissileType,
  timeTravelActive,
  onToggleTimeTravel,
  onOpenDataTable,
  globeStyle,
  onToggleGlobeStyle,
  airTrafficEnabled,
  onToggleAirTraffic,
  liveNewsOpen,
  onToggleLiveNews,
  simulationOpen,
  onToggleSimulation,
}) {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin">
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {/* Freeze / Pause */}
        <ControlButton
          active={frozen}
          onClick={onToggleFreeze}
          icon={<PauseIcon />}
          label={frozen ? 'Frozen' : 'Freeze'}
          activeColor="cyan"
        />

        {/* Time Travel */}
        <ControlButton
          active={timeTravelActive}
          onClick={onToggleTimeTravel}
          icon={<ClockIcon />}
          label="Time Travel"
          activeColor="purple"
        />

        {/* Data Explorer */}
        <ControlButton
          active={false}
          onClick={onOpenDataTable}
          icon={<TableIcon />}
          label="Data Explorer"
        />

        {/* Globe Style Toggle — Night View <-> Street Map */}
        <ControlButton
          active={globeStyle === 'mapbox'}
          onClick={onToggleGlobeStyle}
          icon={<GlobeIcon />}
          label={globeStyle === 'night' ? 'Street Map' : 'Night View'}
        />

        {/* Air Traffic Toggle */}
        <ControlButton
          active={airTrafficEnabled}
          onClick={onToggleAirTraffic}
          icon={<PlaneIcon />}
          label="Air Traffic"
          activeColor="cyan"
        />

        {/* Live News Toggle */}
        <ControlButton
          active={liveNewsOpen}
          onClick={onToggleLiveNews}
          icon={<LiveIcon />}
          label="Live News"
          activeColor="red"
        />

        {/* Monte Carlo Simulation Toggle */}
        <ControlButton
          active={simulationOpen}
          onClick={onToggleSimulation}
          icon={<SimIcon />}
          label="Predictions"
          activeColor="purple"
        />
      </div>

      {/* Confidence filter toggles — this also serves as the color legend */}
      <div className="bg-navy-800/80 backdrop-blur-md border border-white/10 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Confidence / Arc Colors
          </div>
          <div className="relative group">
            <InfoIcon />
            <div className="fixed left-4 bottom-4 px-3 py-2.5
                            bg-[#0B0F1A]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl
                            text-[10px] text-white/70 leading-relaxed
                            min-w-[220px] max-w-[280px] w-max
                            opacity-0 pointer-events-none group-hover:opacity-100
                            transition-opacity duration-200 z-[100]">
              Missile event data is collected and structured by AI-powered news
              gathering. Confidence levels reflect the degree of source
              corroboration at the time of collection and may be updated as new
              information becomes available.
            </div>
          </div>
        </div>
        {Object.entries(CONFIDENCE_COLORS).map(([level, color]) => (
          <FilterToggle
            key={level}
            label={level}
            color={color}
            active={confidenceFilter.includes(level)}
            onClick={() => onToggleConfidence(level)}
          />
        ))}
        <FilterToggle
          label="intercepted"
          color={INTERCEPTED_COLOR}
          active={confidenceFilter.includes('intercepted')}
          onClick={() => onToggleConfidence('intercepted')}
        />
      </div>

      {/* Missile Type Layers */}
      <MissileTypeFilter
        events={events}
        activeTypes={missileTypeFilter}
        onToggleType={onToggleMissileType}
      />
    </div>
  )
}

function ControlButton({ active, onClick, icon, label, activeColor = 'cyan' }) {
  const colorMap = {
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
    red: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
  }
  const colors = colorMap[activeColor] || colorMap.cyan

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium
        border transition-all duration-200 backdrop-blur-md whitespace-nowrap
        ${active
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : 'bg-navy-800/80 border-white/10 text-white/60 hover:text-white/80 hover:border-white/20'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}

function FilterToggle({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-all
        ${active ? 'text-white/90' : 'text-white/30'}
      `}
    >
      {/* Color swatch acts as both checkbox and legend */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-sm border transition-all"
          style={{
            backgroundColor: active ? color : 'transparent',
            borderColor: color,
            opacity: active ? 1 : 0.4,
          }}
        />
        <div
          className="w-4 h-0.5 rounded-full"
          style={{ backgroundColor: color, opacity: active ? 0.8 : 0.3 }}
        />
      </div>
      <span className="capitalize">{label}</span>
    </button>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="2" width="3" height="8" rx="0.5" />
      <rect x="7" y="2" width="3" height="8" rx="0.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/25 hover:text-white/50 cursor-help transition-colors">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function LiveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2a10 10 0 0 1 7.07 2.93" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2a10 10 0 0 0-7.07 2.93" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 6a6 6 0 0 1 4.24 1.76" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 6a6 6 0 0 0-4.24 1.76" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PlaneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  )
}

function SimIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
