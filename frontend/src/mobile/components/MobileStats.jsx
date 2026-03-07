import React, { useMemo } from 'react'

/**
 * Mobile stats/intel view — key operational intelligence in a scrollable
 * card layout. Shows interception gauge, top launchers, top targets,
 * missile types, and escalation status.
 */
export default function MobileStats({ events, allEvents }) {
  const stats = useMemo(() => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentEvents = events.filter((e) => new Date(e.event_timestamp_utc) >= last24h)
    const totalMissiles = events.reduce((s, e) => s + (e.missile_count || 0), 0)
    const totalIntercepted = events.reduce((s, e) => s + (e.intercepted_count || 0), 0)
    const interceptionRate = totalMissiles > 0 ? Math.round((totalIntercepted / totalMissiles) * 100) : 0
    const totalCasualties = events.reduce((s, e) => s + (e.casualties_reported || 0), 0)

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
  }, [events])

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
      {/* Escalation alert */}
      {stats.escalationRisk !== 'low' && (
        <div className={`
          rounded-xl border p-4
          ${stats.escalationRisk === 'high'
            ? 'bg-red-500/10 border-red-500/25'
            : 'bg-orange-500/10 border-orange-500/25'
          }
        `}>
          <div className="text-[10px] uppercase tracking-wider font-bold mb-1"
            style={{ color: stats.escalationRisk === 'high' ? '#EF4444' : '#F97316' }}
          >
            Escalation Alert
          </div>
          <div className="text-[12px] text-white/50">
            {stats.escalationRisk === 'high'
              ? `High activity: ${stats.last24h} events in last 24h`
              : `Elevated activity: ${stats.last24h} events in last 24h`
            }
          </div>
        </div>
      )}

      {/* Conflict context */}
      <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-4">
        <div className="text-[10px] text-red-400/70 uppercase tracking-wider font-bold mb-1">
          THREATNET — Active Conflicts
        </div>
        <div className="text-[11px] text-white/35 leading-relaxed">
          Global conflict beginning Feb 27, 2026 — triggered by US/Israel strikes on Iran.
          All military attacks worldwide tracked.
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Events" value={stats.totalEvents} />
        <StatCard label="Events (24h)" value={stats.last24h} highlight />
        <StatCard label="Total Missiles" value={stats.totalMissiles} />
        <StatCard label="Intercepted" value={stats.totalIntercepted} color="#22C55E" />
      </div>

      {/* Interception gauge */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
          Interception Success Rate
        </div>
        <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${stats.interceptionRate}%`,
              backgroundColor: stats.interceptionRate > 70 ? '#22C55E' : stats.interceptionRate > 40 ? '#F97316' : '#EF4444',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white/70">
            {stats.interceptionRate}%
          </span>
        </div>
      </div>

      {/* Top Launchers */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
          Most Active Launchers
        </div>
        {stats.topSenders.map(([country, count]) => (
          <BarRow key={country} label={country} value={count} max={stats.topSenders[0]?.[1] || 1} color="#EF4444" />
        ))}
      </div>

      {/* Top Targets */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
          Most Targeted Countries
        </div>
        {stats.topTargets.map(([country, count]) => (
          <BarRow key={country} label={country} value={count} max={stats.topTargets[0]?.[1] || 1} color="#F97316" />
        ))}
      </div>

      {/* Missile Types */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
          Missile Types Used
        </div>
        {stats.missileTypes.map(([type, count]) => (
          <BarRow key={type} label={formatType(type)} value={count} max={stats.missileTypes[0]?.[1] || 1} color="#818CF8" />
        ))}
      </div>

      {/* Casualties card */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center">
        <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Total Casualties Reported</div>
        <div className="text-2xl font-mono font-bold" style={{ color: stats.totalCasualties > 0 ? '#EF4444' : 'rgba(255,255,255,0.5)' }}>
          {stats.totalCasualties.toLocaleString()}
        </div>
      </div>

      {/* Bottom spacer for safe area */}
      <div className="h-4" />
    </div>
  )
}

function StatCard({ label, value, color, highlight }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
      <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">{label}</div>
      <div
        className={`text-lg font-mono font-bold ${highlight ? 'text-cyan-400' : 'text-white/70'}`}
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/50">{label}</span>
        <span className="font-mono text-white/35">{value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function formatType(type) {
  if (!type) return '--'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
