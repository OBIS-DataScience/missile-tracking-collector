import React, { useState } from 'react'
import { getArcColor, CONFIDENCE_COLORS, INTERCEPTED_COLOR } from '../../lib/colors'

/**
 * Mobile event feed — scrollable cards showing missile events.
 * Tap to expand for full details. Confidence filter chips at the top.
 */
export default function MobileEventFeed({ events, confidenceFilter, onToggleConfidence }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="h-full flex flex-col">
      {/* Filter chips — horizontally scrollable */}
      <div className="flex-shrink-0 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
        {Object.entries(CONFIDENCE_COLORS).map(([level, color]) => (
          <FilterChip
            key={level}
            label={level}
            color={color}
            active={confidenceFilter.includes(level)}
            onClick={() => onToggleConfidence(level)}
          />
        ))}
        <FilterChip
          label="intercepted"
          color={INTERCEPTED_COLOR}
          active={confidenceFilter.includes('intercepted')}
          onClick={() => onToggleConfidence('intercepted')}
        />
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {events.length === 0 && (
          <div className="text-center text-white/20 text-xs mt-12">
            No events match current filters
          </div>
        )}

        {events.map((event) => (
          <MobileEventCard
            key={event.event_id}
            event={event}
            expanded={expandedId === event.event_id}
            onToggle={() => setExpandedId((prev) =>
              prev === event.event_id ? null : event.event_id
            )}
          />
        ))}
      </div>
    </div>
  )
}

function FilterChip({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-[10px] font-semibold uppercase tracking-wider
        border transition-all duration-200 active:scale-95
        ${active
          ? 'border-transparent'
          : 'border-white/10 text-white/25'
        }
      `}
      style={active ? {
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color,
      } : undefined}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
      />
      {label}
    </button>
  )
}

function MobileEventCard({ event, expanded, onToggle }) {
  const color = getArcColor(event)
  const rawTs = event.event_timestamp_utc || ''
  const utcTs = rawTs && !rawTs.endsWith('Z') && !rawTs.includes('+') ? rawTs + 'Z' : rawTs
  const time = utcTs
    ? new Date(utcTs).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '--'

  return (
    <div
      className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden
                 active:bg-white/[0.06] transition-all duration-200"
      onClick={onToggle}
    >
      {/* Top accent line — color matches confidence */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Card body */}
      <div className="px-4 py-3">
        {/* Route header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[13px] font-semibold text-white/85">
              {event.sender_country || '?'} → {event.target_country || '?'}
            </span>
          </div>
          {event.missile_count > 0 && (
            <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              x{event.missile_count}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-white/30 font-mono">{time}</span>

          <span
            className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
            style={{ color, backgroundColor: `${color}12` }}
          >
            {event.confidence_level}
          </span>

          {event.intercepted && (
            <span className="text-[9px] font-bold text-green-400/80 uppercase tracking-wider">
              Intercepted
            </span>
          )}

          {event.casualties_reported > 0 && (
            <span className="text-[9px] font-bold text-red-400/80">
              {event.casualties_reported} casualties
            </span>
          )}
        </div>

        {/* Missile name preview */}
        {event.missile_name && (
          <div className="mt-1.5 text-[11px] text-white/30">
            {event.missile_name}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <Detail label="Event ID" value={event.event_id} mono />
            <Detail label="Missile" value={event.missile_name || '--'} />
            <Detail label="Type" value={formatType(event.missile_type)} />
            <Detail label="Warhead" value={formatType(event.warhead_type)} />
            <Detail label="Range" value={event.missile_range_km ? `${event.missile_range_km} km` : '--'} />
            <Detail label="Count" value={`${event.missile_count || 0} launched`} />
            <Detail label="Target" value={event.target_location_name || '--'} />
            <Detail label="Launch" value={event.launch_location_name || '--'} />
            <Detail label="Faction" value={event.sender_faction || '--'} />
            <Detail
              label="Intercepted"
              value={event.intercepted
                ? `${event.interception_system || 'Yes'} (${event.intercepted_count})`
                : 'No'
              }
            />
          </div>

          {event.damage_description && (
            <div className="text-[11px] text-white/35 italic leading-relaxed pt-1 border-t border-white/5">
              {event.damage_description}
            </div>
          )}

          {event.source_references?.length > 0 && (
            <div className="pt-1 border-t border-white/5">
              <span className="text-[9px] text-white/20 uppercase tracking-wider">Sources</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {event.source_references.map((src, i) => (
                  <a
                    key={i}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-cyan-400/50 active:text-cyan-400 underline"
                  >
                    Source {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <span className="text-white/20">{label}: </span>
      <span className={`text-white/55 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  )
}

function formatType(type) {
  if (!type) return '--'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
