import React, { useState, useEffect } from 'react'

/**
 * Mobile header — branded THREATNET bar with live clock and 4 key metrics.
 * Compact enough for small screens but still feels like a command center.
 */
export default function MobileHeader({ stats, loading }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <div className="flex-shrink-0">
      {/* Top brand bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/ai360-logo.png"
            alt="AI 360"
            width="28"
            height="28"
            className="h-7 w-auto opacity-70"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div>
            <p className="text-[9px] font-bold tracking-[0.3em] text-red-500/80 uppercase leading-none">
              THREATNET
            </p>
            <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase mt-0.5">
              Global Strike Monitor
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[10px] text-white/40">LIVE</span>
          </div>
          <span className="font-mono text-[10px] text-white/30">{timeStr}</span>
        </div>
      </div>

      {/* Metrics strip */}
      {!loading && stats && (
        <div className="flex items-center justify-between px-4 pb-3">
          <MetricPill label="Events" value={stats.totalEvents} />
          <MetricPill label="Missiles" value={stats.totalMissiles} />
          <MetricPill
            label="Intercept"
            value={`${stats.interceptionRate}%`}
            color={stats.interceptionRate > 50 ? '#22C55E' : '#F97316'}
          />
          <MetricPill
            label="Casualties"
            value={stats.totalCasualties.toLocaleString()}
            color={stats.totalCasualties > 0 ? '#EF4444' : undefined}
          />
        </div>
      )}

      {/* Bottom border line */}
      <div className="h-px" style={{
        background: 'linear-gradient(90deg, transparent 5%, rgba(34,211,238,0.15) 50%, transparent 95%)'
      }} />
    </div>
  )
}

function MetricPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[8px] text-white/20 uppercase tracking-wider">{label}</span>
      <span
        className="text-sm font-mono font-bold text-white/70"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}
