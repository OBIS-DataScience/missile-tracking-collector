import React, { useMemo } from 'react'

/**
 * Left-side conflict overview panel showing high-level operational intelligence.
 * Includes metrics, mini-charts, and conflict breakdowns.
 */
export default function ConflictPanel({ events, activeConflict, onConflictChange }) {
  const stats = useMemo(() => computeStats(events), [events])

  return (
    <div className="w-[260px] xl:w-[300px] h-full flex-shrink-0 bg-navy-800/70 backdrop-blur-md border-r border-white/5 flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <h2 className="text-xs font-semibold tracking-wider text-white/60 uppercase">
          Conflict Overview
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        {/* Conflict Mode Toggle */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Theater Selection
          </div>
          <div className="space-y-1">
            {['Global', 'Russia-Ukraine War', '2026 Iran Conflict'].map((conflict) => (
              <button
                key={conflict}
                onClick={() => onConflictChange(conflict)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-xs transition-all
                  ${activeConflict === conflict
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                    : 'bg-white/[0.02] border border-white/5 text-white/50 hover:text-white/70 hover:border-white/10'
                  }
                `}
              >
                {conflict}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Operational Metrics
          </div>
          <div className="space-y-1.5">
            <MetricRow label="Total Events" value={stats.totalEvents} />
            <MetricRow label="Launches (24h)" value={stats.last24h} highlight />
            <MetricRow label="Total Missiles" value={stats.totalMissiles} />
            <MetricRow label="Missiles Intercepted" value={stats.totalIntercepted} color="#22C55E" />
            <MetricRow
              label="Intercept Rate"
              value={`${stats.interceptionRate}%`}
              color={stats.interceptionRate > 50 ? '#22C55E' : '#F97316'}
            />
            <MetricRow label="Total Casualties" value={stats.totalCasualties} color={stats.totalCasualties > 0 ? '#EF4444' : undefined} />
          </div>
        </div>

        {/* Interception Gauge */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Interception Success Rate
          </div>
          <InterceptionGauge rate={stats.interceptionRate} />
        </div>

        {/* Top Launchers */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Most Active Launchers
          </div>
          {stats.topSenders.map(([country, count]) => (
            <BarRow key={country} label={country} value={count} max={stats.topSenders[0]?.[1] || 1} color="#EF4444" />
          ))}
        </div>

        {/* Most Targeted */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Most Targeted Countries
          </div>
          {stats.topTargets.map(([country, count]) => (
            <BarRow key={country} label={country} value={count} max={stats.topTargets[0]?.[1] || 1} color="#F97316" />
          ))}
        </div>

        {/* Missile Types Breakdown */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
            Missile Types Used
          </div>
          {stats.missileTypes.map(([type, count]) => (
            <BarRow key={type} label={formatType(type)} value={count} max={stats.missileTypes[0]?.[1] || 1} color="#818CF8" />
          ))}
        </div>

        {/* Escalation indicator */}
        {stats.escalationRisk !== 'low' && (
          <div className={`
            rounded-lg border p-3
            ${stats.escalationRisk === 'high'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-orange-500/10 border-orange-500/30'
            }
          `}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: stats.escalationRisk === 'high' ? '#EF4444' : '#F97316' }}
            >
              Escalation Alert
            </div>
            <div className="text-[11px] text-white/50">
              {stats.escalationRisk === 'high'
                ? `High activity detected: ${stats.last24h} events in the last 24 hours`
                : `Elevated activity: ${stats.last24h} events in the last 24 hours`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function computeStats(events) {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const recentEvents = events.filter((e) => new Date(e.event_timestamp_utc) >= last24h)
  const totalMissiles = events.reduce((s, e) => s + (e.missile_count || 0), 0)
  const totalIntercepted = events.reduce((s, e) => s + (e.intercepted_count || 0), 0)
  const interceptionRate = totalMissiles > 0 ? Math.round((totalIntercepted / totalMissiles) * 100) : 0
  const totalCasualties = events.reduce((s, e) => s + (e.casualties_reported || 0), 0)

  // Country rankings
  const senderCounts = {}
  const targetCounts = {}
  const typeCounts = {}
  events.forEach((e) => {
    if (e.sender_country) senderCounts[e.sender_country] = (senderCounts[e.sender_country] || 0) + 1
    if (e.target_country) targetCounts[e.target_country] = (targetCounts[e.target_country] || 0) + 1
    if (e.missile_type) typeCounts[e.missile_type] = (typeCounts[e.missile_type] || 0) + 1
  })

  const topSenders = Object.entries(senderCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topTargets = Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const missileTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Simple escalation heuristic — if more than 5 events in 24h, elevated; more than 10, high
  let escalationRisk = 'low'
  if (recentEvents.length >= 10) escalationRisk = 'high'
  else if (recentEvents.length >= 5) escalationRisk = 'elevated'

  return {
    totalEvents: events.length,
    last24h: recentEvents.length,
    totalMissiles,
    totalIntercepted,
    interceptionRate,
    totalCasualties,
    topSenders,
    topTargets,
    missileTypes,
    escalationRisk,
  }
}

function MetricRow({ label, value, highlight, color }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
      <span className="text-[11px] text-white/40">{label}</span>
      <span
        className={`text-xs font-mono font-semibold ${highlight ? 'text-cyan-400' : 'text-white/70'}`}
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

function InterceptionGauge({ rate }) {
  const gaugeColor = rate > 70 ? '#22C55E' : rate > 40 ? '#F97316' : '#EF4444'

  return (
    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
        style={{ width: `${rate}%`, backgroundColor: gaugeColor }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white/60">
        {rate}%
      </span>
    </div>
  )
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-white/50">{label}</span>
        <span className="font-mono text-white/40">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function formatType(type) {
  if (!type) return '—'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
