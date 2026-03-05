import React, { useState, useMemo } from 'react'
import { getArcColor } from '../lib/colors'

/**
 * Full-screen data table overlay that lets analysts explore all missile
 * event data in a sortable, filterable table with summary visualizations.
 * Think of it like a mini BI tool built into the command center.
 */
export default function DataTable({ events, onClose }) {
  const [sortField, setSortField] = useState('event_timestamp_utc')
  const [sortDir, setSortDir] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('table') // table | insights

  // Sort events
  const sortedEvents = useMemo(() => {
    const filtered = searchTerm
      ? events.filter((e) =>
          Object.values(e).some((v) =>
            String(v).toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : events

    return [...filtered].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || ''
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || ''

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [events, sortField, sortDir, searchTerm])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Summary stats for the insights tab
  const insights = useMemo(() => computeInsights(events), [events])

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/98 backdrop-blur-xl flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-white/80 uppercase">
            Intelligence Data Explorer
          </h2>
          <p className="text-[10px] text-white/30 mt-0.5">
            {sortedEvents.length} of {events.length} events
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tab toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <TabButton active={activeTab === 'table'} onClick={() => setActiveTab('table')}>
              Table
            </TabButton>
            <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')}>
              Insights
            </TabButton>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80
                       placeholder:text-white/20 outline-none focus:border-cyan-500/40 w-60"
          />

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center
                       text-white/40 hover:text-white/70 transition-all text-sm font-medium"
          >
            x
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'table' ? (
          <TableView events={sortedEvents} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
        ) : (
          <InsightsView insights={insights} events={events} />
        )}
      </div>
    </div>
  )
}

// ---------- Table View ----------
const COLUMNS = [
  { key: 'event_timestamp_utc', label: 'Timestamp', width: 'w-[150px]' },
  { key: 'confidence_level', label: 'Confidence', width: 'w-[90px]' },
  { key: 'sender_country', label: 'Sender', width: 'w-[110px]' },
  { key: 'target_country', label: 'Target', width: 'w-[110px]' },
  { key: 'missile_name', label: 'Missile', width: 'w-[120px]' },
  { key: 'missile_type', label: 'Type', width: 'w-[100px]' },
  { key: 'missile_count', label: 'Count', width: 'w-[60px]' },
  { key: 'intercepted', label: 'Intercepted', width: 'w-[85px]' },
  { key: 'intercepted_count', label: 'Intrcpt #', width: 'w-[70px]' },
  { key: 'interception_system', label: 'System', width: 'w-[100px]' },
  { key: 'casualties_reported', label: 'Casualties', width: 'w-[80px]' },
  { key: 'conflict_name', label: 'Conflict', width: 'w-[140px]' },
  { key: 'target_type', label: 'Target Type', width: 'w-[100px]' },
  { key: 'warhead_type', label: 'Warhead', width: 'w-[90px]' },
  { key: 'missile_range_km', label: 'Range (km)', width: 'w-[80px]' },
]

function TableView({ events, sortField, sortDir, onSort }) {
  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-navy-800/95 backdrop-blur z-10">
          <tr className="border-b border-white/5">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className={`
                  ${col.width} px-3 py-2.5 text-left text-[10px] font-semibold
                  text-white/40 uppercase tracking-wider cursor-pointer
                  hover:text-white/60 transition-colors select-none whitespace-nowrap
                `}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="ml-1 text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.event_id}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              {COLUMNS.map((col) => (
                <td key={col.key} className={`${col.width} px-3 py-2 whitespace-nowrap`}>
                  <CellValue field={col.key} value={event[col.key]} event={event} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {events.length === 0 && (
        <div className="text-center text-white/20 text-xs py-12">
          No events match your search
        </div>
      )}
    </div>
  )
}

function CellValue({ field, value, event }) {
  if (field === 'event_timestamp_utc' && value) {
    return (
      <span className="font-mono text-white/50">
        {new Date(value).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    )
  }

  if (field === 'confidence_level') {
    const color = getArcColor(event)
    return (
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {(value || '').toUpperCase()}
      </span>
    )
  }

  if (field === 'intercepted') {
    return value
      ? <span className="text-green-400 font-semibold">YES</span>
      : <span className="text-white/20">No</span>
  }

  if (field === 'casualties_reported' && value > 0) {
    return <span className="text-red-400 font-semibold">{value}</span>
  }

  if (field === 'missile_type' || field === 'target_type' || field === 'warhead_type') {
    return <span className="text-white/50 capitalize">{formatType(value)}</span>
  }

  return <span className="text-white/50">{value ?? '—'}</span>
}

// ---------- Insights View ----------
function InsightsView({ insights, events }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InsightCard label="Total Events" value={insights.totalEvents} />
          <InsightCard label="Total Missiles" value={insights.totalMissiles} />
          <InsightCard label="Intercept Rate" value={`${insights.interceptionRate}%`}
            color={insights.interceptionRate > 50 ? '#22C55E' : '#F97316'} />
          <InsightCard label="Total Casualties" value={insights.totalCasualties}
            color={insights.totalCasualties > 0 ? '#EF4444' : undefined} />
        </div>

        {/* Breakdowns side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BreakdownChart title="Events by Sender Country" data={insights.bySender} color="#EF4444" />
          <BreakdownChart title="Events by Target Country" data={insights.byTarget} color="#F97316" />
          <BreakdownChart title="Events by Missile Type" data={insights.byType} color="#818CF8" />
          <BreakdownChart title="Events by Confidence Level" data={insights.byConfidence} color="#22D3EE" />
          <BreakdownChart title="Interception Systems Used" data={insights.bySystems} color="#22C55E" />
          <BreakdownChart title="Events by Target Type" data={insights.byTargetType} color="#F59E0B" />
        </div>

        {/* Top casualty events */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Highest Casualty Events
          </h3>
          <div className="space-y-2">
            {insights.topCasualties.map((e) => (
              <div key={e.event_id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white/30 text-[10px]">{e.event_id}</span>
                  <span className="text-white/60">{e.sender_country} → {e.target_country}</span>
                </div>
                <span className="text-red-400 font-semibold">{e.casualties_reported} casualties</span>
              </div>
            ))}
            {insights.topCasualties.length === 0 && (
              <span className="text-white/20 text-xs">No casualties reported</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightCard({ label, value, color }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</div>
      <div
        className="text-2xl font-mono font-bold text-white/80"
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

function BreakdownChart({ title, data, color }) {
  const maxVal = data[0]?.[1] || 1

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map(([label, count]) => (
          <div key={label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-white/50 capitalize">{formatType(label)}</span>
              <span className="font-mono text-white/40">{count}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(count / maxVal) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && <span className="text-white/20 text-xs">No data</span>}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-md text-xs font-medium transition-all
        ${active ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}
      `}
    >
      {children}
    </button>
  )
}

function computeInsights(events) {
  const totalMissiles = events.reduce((s, e) => s + (e.missile_count || 0), 0)
  const totalIntercepted = events.reduce((s, e) => s + (e.intercepted_count || 0), 0)
  const totalCasualties = events.reduce((s, e) => s + (e.casualties_reported || 0), 0)

  const count = (field) => {
    const counts = {}
    events.forEach((e) => {
      const val = e[field]
      if (val) counts[val] = (counts[val] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }

  const topCasualties = [...events]
    .filter((e) => e.casualties_reported > 0)
    .sort((a, b) => b.casualties_reported - a.casualties_reported)
    .slice(0, 5)

  return {
    totalEvents: events.length,
    totalMissiles,
    interceptionRate: totalMissiles > 0 ? Math.round((totalIntercepted / totalMissiles) * 100) : 0,
    totalCasualties,
    bySender: count('sender_country'),
    byTarget: count('target_country'),
    byType: count('missile_type'),
    byConfidence: count('confidence_level'),
    bySystems: count('interception_system'),
    byTargetType: count('target_type'),
    topCasualties,
  }
}

function formatType(type) {
  if (!type) return '—'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
