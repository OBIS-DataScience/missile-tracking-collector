import React, { useState } from 'react'
import { CONFIDENCE_COLORS, INTERCEPTED_COLOR } from '../lib/colors'
import MissileTypeFilter from './MissileTypeFilter'

/**
 * Mobile-only bottom drawer that slides up from the base of the screen.
 * Contains all the same controls as the desktop Controls panel —
 * action buttons, confidence filters, and missile type layers —
 * but laid out for touch interaction in a collapsible sheet.
 *
 * Hidden on md+ screens (desktop uses the floating Controls instead).
 */
export default function MobileDrawer({
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
  briefingOpen,
  onToggleBriefing,
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Backdrop — dims the globe when drawer is open, only rendered when open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer — pointer-events-none when collapsed so touches pass through
          to the globe and panel toggles underneath */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`
            pointer-events-auto
            bg-[#0B0F1A]/95 backdrop-blur-xl
            border-t border-white/10 rounded-t-2xl
            transition-transform duration-300 ease-out
            ${open ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}
          `}
        >
        {/* Toggle handle — always visible at the bottom of screen */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex flex-col items-center py-2 active:scale-95 transition-transform"
        >
          {/* Pill-shaped drag indicator */}
          <div className="w-10 h-1 bg-white/20 rounded-full mb-1" />
          <div className="flex items-center gap-2">
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`text-white/50 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
              {open ? 'Close' : 'Controls & Filters'}
            </span>
          </div>
        </button>

        {/* Scrollable drawer content */}
        <div className="max-h-[65vh] overflow-y-auto scrollbar-thin px-4 pb-6 space-y-4">

          {/* Action buttons — 2-column grid */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
              Controls
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DrawerButton
                active={frozen}
                onClick={onToggleFreeze}
                label={frozen ? 'Frozen' : 'Freeze'}
                activeColor="cyan"
              />
              <DrawerButton
                active={timeTravelActive}
                onClick={onToggleTimeTravel}
                label="Time Travel"
                activeColor="purple"
              />
              <DrawerButton
                active={false}
                onClick={onOpenDataTable}
                label="Data Explorer"
              />
              <DrawerButton
                active={globeStyle === 'mapbox'}
                onClick={onToggleGlobeStyle}
                label={globeStyle === 'night' ? 'Street Map' : 'Night View'}
              />
              <DrawerButton
                active={airTrafficEnabled}
                onClick={onToggleAirTraffic}
                label="Air Traffic"
                activeColor="cyan"
              />
              <DrawerButton
                active={liveNewsOpen}
                onClick={onToggleLiveNews}
                label="Live News"
                activeColor="red"
              />
              <DrawerButton
                active={simulationOpen}
                onClick={onToggleSimulation}
                label="Predictions"
                activeColor="purple"
              />
              <DrawerButton
                active={briefingOpen}
                onClick={onToggleBriefing}
                label="Briefing"
                activeColor="amber"
              />
            </div>
          </div>

          {/* Confidence filter */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
              Confidence / Arc Colors
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2">
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
          </div>

          {/* Missile Type Layers */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
              Missile Type Layer
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2">
              <MissileTypeFilter
                events={events}
                activeTypes={missileTypeFilter}
                onToggleType={onToggleMissileType}
                compact
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

function DrawerButton({ active, onClick, label, activeColor = 'cyan' }) {
  const colorMap = {
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
    red: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
    amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
  }
  const colors = colorMap[activeColor] || colorMap.cyan

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-xs font-medium
        border transition-all duration-200 active:scale-95
        ${active
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : 'bg-white/[0.03] border-white/10 text-white/60'
        }
      `}
    >
      {label}
    </button>
  )
}

function FilterToggle({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all
        active:scale-95
        ${active ? 'text-white/90' : 'text-white/30'}
      `}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="w-4 h-4 rounded-sm border transition-all"
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
