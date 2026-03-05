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

        {/* Globe Style Toggle */}
        <ControlButton
          active={globeStyle === 'satellite'}
          onClick={onToggleGlobeStyle}
          icon={<GlobeIcon />}
          label={globeStyle === 'night' ? 'Satellite' : 'Night View'}
        />
      </div>

      {/* Confidence filter toggles — this also serves as the color legend */}
      <div className="bg-navy-800/80 backdrop-blur-md border border-white/10 rounded-lg p-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
          Confidence / Arc Colors
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
