import React, { useMemo, useState, useEffect } from 'react'

/**
 * Compact intelligence status strip displayed above the globe.
 * Shows key operational metrics with 24h % change indicators,
 * a live clock, and when the last data collection was pushed.
 *
 * The % change compares the last 24 hours vs the prior 24 hours
 * to show whether each metric is trending up or down.
 */
export default function StatusBar({ events, allEvents }) {
  // Live clock that updates every second
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const stats = useMemo(() => {
    if (!events.length) return null

    const today = new Date()
    const last24h = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const prior24h = new Date(today.getTime() - 48 * 60 * 60 * 1000)

    // Split events into "last 24h" and "prior 24h" windows for % change
    const recent = events.filter((e) => new Date(e.event_timestamp_utc) >= last24h)
    const prior = events.filter((e) => {
      const t = new Date(e.event_timestamp_utc)
      return t >= prior24h && t < last24h
    })

    // Current period totals
    const totalMissiles = events.reduce((s, e) => s + (e.missile_count || 0), 0)
    const totalIntercepted = events.reduce((s, e) => s + (e.intercepted_count || 0), 0)
    const interceptionRate = totalMissiles > 0
      ? Math.round((totalIntercepted / totalMissiles) * 100) : 0
    const totalCasualties = events.reduce((s, e) => s + (e.casualties_reported || 0), 0)

    // Last 24h metrics
    const recentMissiles = recent.reduce((s, e) => s + (e.missile_count || 0), 0)
    const recentIntercepted = recent.reduce((s, e) => s + (e.intercepted_count || 0), 0)
    const recentIntRate = recentMissiles > 0
      ? Math.round((recentIntercepted / recentMissiles) * 100) : 0
    const recentCasualties = recent.reduce((s, e) => s + (e.casualties_reported || 0), 0)

    // Prior 24h metrics (for % change comparison)
    const priorMissiles = prior.reduce((s, e) => s + (e.missile_count || 0), 0)
    const priorIntercepted = prior.reduce((s, e) => s + (e.intercepted_count || 0), 0)
    const priorIntRate = priorMissiles > 0
      ? Math.round((priorIntercepted / priorMissiles) * 100) : 0
    const priorCasualties = prior.reduce((s, e) => s + (e.casualties_reported || 0), 0)

    const senderCounts = {}
    events.forEach((e) => {
      if (e.sender_country) senderCounts[e.sender_country] = (senderCounts[e.sender_country] || 0) + 1
    })
    const topSender = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]

    const rangeEvents = events.filter((e) => e.missile_range_km > 0)
    const avgRange = rangeEvents.length > 0
      ? Math.round(rangeEvents.reduce((s, e) => s + e.missile_range_km, 0) / rangeEvents.length) : 0

    return {
      totalEvents: events.length,
      recentEvents: recent.length,
      priorEvents: prior.length,
      totalMissiles,
      recentMissiles,
      priorMissiles,
      interceptionRate,
      recentIntRate,
      priorIntRate,
      totalCasualties,
      recentCasualties,
      priorCasualties,
      topSender: topSender ? topSender[0] : '—',
      avgRange,
    }
  }, [events])

  // "Updated as of" = the most recent collection_timestamp_utc in the actual data
  // This tells the user when the last pipeline run pushed data, not when the page loaded
  const lastDataPush = useMemo(() => {
    const source = allEvents || events
    if (!source.length) return null

    const timestamps = source
      .map((e) => e.collection_timestamp_utc)
      .filter(Boolean)
      .map((t) => new Date(t))
      .filter((d) => !isNaN(d.getTime()))

    if (!timestamps.length) return null
    return new Date(Math.max(...timestamps.map((d) => d.getTime())))
  }, [allEvents, events])

  const lastDataPushStr = lastDataPush
    ? lastDataPush.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZoneName: 'short',
      })
    : '—'

  const clockStr = now.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  })

  if (!stats) {
    return (
      <div className="h-10 bg-navy-800/60 backdrop-blur border-b border-white/5 flex items-center justify-center">
        <span className="text-xs text-white/30">Loading intelligence data...</span>
      </div>
    )
  }

  return (
    <div className="h-11 bg-navy-800/60 backdrop-blur border-b border-white/5 flex items-center px-2 md:px-4 gap-2 md:gap-4 overflow-x-auto scrollbar-thin">
      {/* Live indicator + clock */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" style={{ color: '#22C55E' }} />
        <span className="font-mono text-[10px] text-white/50 hidden sm:inline">{clockStr}</span>
        {/* Mobile: short time only */}
        <span className="font-mono text-[10px] text-white/50 sm:hidden">
          {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="w-px h-5 bg-white/10 flex-shrink-0 hidden md:block" />

      {/* Data freshness + next pull countdown */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        <span className="text-[10px] text-white/25 uppercase tracking-wide">Data as of</span>
        <span className="text-[10px] font-mono text-cyan-400/60">{lastDataPushStr}</span>
      </div>

      <div className="w-px h-5 bg-white/10 flex-shrink-0 hidden md:block" />

      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        <span className="text-[10px] text-white/25 uppercase tracking-wide">Next pull</span>
        <span className="text-[10px] font-mono text-cyan-400/60">{getNextPullStr(now)}</span>
      </div>

      <div className="w-px h-5 bg-white/10 flex-shrink-0" />

      {/* Metrics — show only key ones on mobile, all on desktop */}
      <Metric label="Events" value={stats.totalEvents} recent={stats.recentEvents} prior={stats.priorEvents} />
      <Metric label="Missiles" value={stats.totalMissiles} recent={stats.recentMissiles} prior={stats.priorMissiles} />
      <span className="hidden md:contents">
        <Metric
          label="Intercept"
          value={`${stats.interceptionRate}%`}
          recent={stats.recentIntRate}
          prior={stats.priorIntRate}
          isRate
          color={stats.interceptionRate > 50 ? '#22C55E' : '#F97316'}
          invertChange
        />
        <Metric
          label="Casualties"
          value={stats.totalCasualties.toLocaleString()}
          recent={stats.recentCasualties}
          prior={stats.priorCasualties}
          color={stats.totalCasualties > 0 ? '#EF4444' : undefined}
          invertChange
        />
        <Metric label="Avg Range" value={stats.avgRange > 0 ? `${stats.avgRange} km` : '—'} />
        <Metric label="Top Launcher" value={stats.topSender} />
      </span>
    </div>
  )
}

/**
 * A single metric in the status bar.
 *
 * If `recent` and `prior` are provided, computes % change between
 * the two 24h windows and shows an up/down arrow with color coding.
 *
 * invertChange: for metrics like casualties, "up" is bad (red),
 * while for intercept rate, "up" is good (green).
 */
/**
 * Calculate when the next cron job runs.
 * The cron fires every 30 minutes at :00 and :30 UTC.
 * Returns a string like "in 12m" or "in 28m".
 */
function getNextPullStr(now) {
  const utcM = now.getUTCMinutes()
  // Next :00 or :30 mark
  const minsLeft = utcM < 30 ? (30 - utcM) : (60 - utcM)
  if (minsLeft <= 1) return '~now'
  return `in ${minsLeft}m`
}

function Metric({ label, value, recent, prior, isRate, color, highlight, invertChange }) {
  let changeEl = null

  if (recent !== undefined && prior !== undefined) {
    const pctChange = prior > 0
      ? Math.round(((recent - prior) / prior) * 100)
      : recent > 0 ? 100 : 0

    // Show the change indicator — even 0% shows as "—" for visual consistency
    const isUp = pctChange > 0
    const isDown = pctChange < 0

    // Color logic:
    // - casualties: up = red (bad), down = green (good)
    // - intercept rate: up = green (good), down = red (bad)
    // - everything else: up = orange (neutral alert), down = green
    let changeColor = '#6B7280' // gray for 0%
    if (pctChange !== 0) {
      if (isRate) {
        // For rates like interception: higher is better
        changeColor = isUp ? '#22C55E' : '#EF4444'
      } else if (invertChange) {
        // For things like casualties: lower is better
        changeColor = isUp ? '#EF4444' : '#22C55E'
      } else {
        // General metrics: up = orange alert, down = green
        changeColor = isUp ? '#F97316' : '#22C55E'
      }
    }

    const arrow = isUp ? '+' : isDown ? '' : ''
    changeEl = (
      <span className="text-[9px] font-mono ml-0.5" style={{ color: changeColor }}>
        {pctChange === 0 ? '0%' : `${arrow}${pctChange}%`}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <span className="text-[9px] text-white/25 uppercase tracking-wide">{label}</span>
      <span
        className={`text-[11px] font-mono font-semibold ${highlight ? 'text-cyan-400' : 'text-white/70'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {changeEl}
    </div>
  )
}
