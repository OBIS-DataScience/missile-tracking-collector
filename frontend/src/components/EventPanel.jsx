import React, { useState } from 'react'
import { getArcColor } from '../lib/colors'

/**
 * Right-side intelligence panel showing the latest missile events
 * in chronological streaming order. Each event is a compact card
 * that can be expanded for full details.
 */
export default function EventPanel({ events, onEventClick }) {
  const [expandedId, setExpandedId] = useState(null)

  const toggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="w-[280px] xl:w-[340px] h-full flex-shrink-0 bg-navy-800/70 backdrop-blur-md border-l border-white/5 flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-white/60 uppercase">
            Event Intelligence Feed
          </h2>
          <span className="text-[10px] font-mono text-cyan-400/70">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Scrollable event list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
        {events.length === 0 && (
          <div className="text-center text-white/20 text-xs mt-8">
            No events match current filters
          </div>
        )}

        {events.map((event) => (
          <EventCard
            key={event.event_id}
            event={event}
            expanded={expandedId === event.event_id}
            onToggle={() => toggle(event.event_id)}
            onLocate={() => onEventClick(event)}
          />
        ))}
      </div>
    </div>
  )
}

function EventCard({ event, expanded, onToggle, onLocate }) {
  const color = getArcColor(event)
  // Ensure the timestamp is treated as UTC — some AI-generated timestamps
  // may be missing the trailing "Z", causing JS to treat them as local time
  const rawTs = event.event_timestamp_utc || ''
  const utcTs = rawTs && !rawTs.endsWith('Z') && !rawTs.includes('+') ? rawTs + 'Z' : rawTs
  const time = utcTs
    ? new Date(utcTs).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : '—'

  return (
    <div
      className="bg-navy-900/60 border border-white/5 rounded-lg overflow-hidden
                 hover:border-white/10 transition-all duration-200 cursor-pointer"
      onClick={onToggle}
    >
      {/* Compact view — always visible */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          {/* Confidence dot */}
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {/* Route */}
          <span className="text-xs font-medium text-white/80 truncate flex-1">
            {event.sender_country || '?'} → {event.target_country || '?'}
          </span>
          {/* Missile count badge */}
          {event.missile_count > 0 && (
            <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
              x{event.missile_count}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 font-mono">{time}</span>
            {event.intercepted && (
              <span className="text-[9px] font-semibold text-green-400/80 uppercase tracking-wider">
                Intercepted
              </span>
            )}
            {event.casualties_reported > 0 && (
              <span className="text-[9px] font-semibold text-red-400/80">
                {event.casualties_reported} casualties
              </span>
            )}
          </div>
          <span
            className="text-[9px] font-semibold tracking-wider uppercase"
            style={{ color: `${color}99` }}
          >
            {event.confidence_level}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 mt-0 pt-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <CardDetail label="Event ID" value={event.event_id} mono />
            <CardDetail label="Missile" value={event.missile_name || '—'} />
            <CardDetail label="Type" value={formatType(event.missile_type)} />
            <CardDetail label="Warhead" value={formatType(event.warhead_type)} />
            <CardDetail label="Range" value={event.missile_range_km ? `${event.missile_range_km} km` : '—'} />
            <CardDetail
              label="Interception"
              value={event.intercepted ? `${event.interception_system || 'Yes'} (${event.intercepted_count})` : 'No'}
            />
            <CardDetail label="Target" value={event.target_location_name || '—'} />
            <CardDetail label="Target Type" value={formatType(event.target_type)} />
            <CardDetail label="Launch Site" value={event.launch_location_name || '—'} />
            <CardDetail label="Faction" value={event.sender_faction || '—'} />
          </div>

          {event.damage_description && (
            <div className="mt-2 text-[10px] text-white/40 italic leading-relaxed">
              {event.damage_description}
            </div>
          )}

          {/* Source references */}
          {event.source_references?.length > 0 && (
            <div className="mt-2">
              <span className="text-[9px] text-white/25 uppercase tracking-wider">Sources</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {event.source_references.map((src, i) => (
                  <a
                    key={i}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] text-cyan-400/60 hover:text-cyan-400 truncate max-w-[140px]"
                  >
                    [{i + 1}]
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Locate on globe button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLocate()
            }}
            className="mt-2 w-full text-[10px] text-cyan-400/60 hover:text-cyan-400
                       border border-cyan-400/20 hover:border-cyan-400/40
                       rounded px-2 py-1 transition-all uppercase tracking-wider"
          >
            Locate on Globe
          </button>
        </div>
      )}
    </div>
  )
}

function CardDetail({ label, value, mono }) {
  return (
    <div>
      <span className="text-white/25">{label}: </span>
      <span className={`text-white/60 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  )
}

function formatType(type) {
  if (!type) return '—'
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
