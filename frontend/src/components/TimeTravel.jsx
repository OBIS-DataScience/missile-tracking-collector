import React, { useMemo } from 'react'

/**
 * Timeline slider that allows analysts to "rewind" missile activity.
 * Scrubbing through time filters events to only show those that happened
 * before the selected timestamp, letting the globe replay history.
 */
export default function TimeTravel({ events, value, onChange, playing, onTogglePlay }) {
  // Find the earliest and latest event timestamps to set slider bounds
  const { minTime, maxTime } = useMemo(() => {
    if (!events.length) return { minTime: 0, maxTime: Date.now() }

    const timestamps = events
      .map((e) => new Date(e.event_timestamp_utc).getTime())
      .filter((t) => !isNaN(t))

    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
    }
  }, [events])

  const currentDate = new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  // Count how many events are visible at current time position
  const visibleCount = events.filter(
    (e) => new Date(e.event_timestamp_utc).getTime() <= value
  ).length

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[500px] max-w-[70vw]">
      <div className="bg-navy-800/90 backdrop-blur-md border border-white/10 rounded-lg px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
              Time Travel Mode
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-cyan-400/70">
              {visibleCount} / {events.length} events
            </span>
            <button
              onClick={onTogglePlay}
              className={`
                px-2 py-0.5 rounded text-[10px] font-medium border transition-all
                ${playing
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                }
              `}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>

        {/* Current time display */}
        <div className="text-xs font-mono text-white/60 mb-2 text-center">
          {currentDate}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1 appearance-none bg-white/10 rounded-full outline-none
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
                     [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.4)]"
        />

        {/* Time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/20 font-mono">
            {new Date(minTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[9px] text-white/20 font-mono">
            {new Date(maxTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
