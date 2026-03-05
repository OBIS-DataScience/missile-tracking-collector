import React from 'react'
import { getArcColor } from '../lib/colors'

/**
 * Rich tooltip that appears when hovering over a missile trajectory arc.
 * Shows key intel about the event in a compact card format.
 */
export default function EventTooltip({ event, position }) {
  if (!event) return null

  const color = getArcColor(event)
  const confidenceLabel = event.confidence_level?.toUpperCase() || 'UNKNOWN'

  // Format the timestamp to something readable
  const timestamp = event.event_timestamp_utc
    ? new Date(event.event_timestamp_utc).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'Unknown time'

  return (
    <div
      className="animate-fade-in pointer-events-none fixed z-50"
      style={{
        left: position.x + 16,
        top: position.y - 8,
      }}
    >
      <div className="bg-navy-800/95 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-2xl min-w-[320px] max-w-[400px]">
        {/* Header with event ID and confidence badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-white/50">{event.event_id}</span>
          <span
            className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`,
            }}
          >
            {confidenceLabel}
          </span>
        </div>

        {/* Route: Sender -> Target */}
        <div className="flex items-center gap-2 mb-3">
          <div className="text-right flex-1">
            <div className="text-sm font-semibold">{event.sender_country || 'Unknown'}</div>
            <div className="text-[11px] text-white/40">{event.launch_location_name || ''}</div>
          </div>
          <div className="flex items-center gap-1 px-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <div className="w-12 h-px" style={{ backgroundColor: color }} />
            <svg width="8" height="8" viewBox="0 0 8 8" fill={color}>
              <polygon points="0,0 8,4 0,8" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{event.target_country || 'Unknown'}</div>
            <div className="text-[11px] text-white/40">{event.target_location_name || ''}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 my-2" />

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <Detail label="Missile" value={event.missile_name || 'Unknown'} />
          <Detail label="Type" value={formatType(event.missile_type)} />
          <Detail label="Count" value={event.missile_count || 0} />
          <Detail label="Range" value={event.missile_range_km ? `${event.missile_range_km} km` : '—'} />
          <Detail label="Warhead" value={formatType(event.warhead_type)} />
          <Detail
            label="Intercepted"
            value={
              event.intercepted
                ? `Yes (${event.intercepted_count}${event.interception_system ? ` / ${event.interception_system}` : ''})`
                : 'No'
            }
            color={event.intercepted ? '#22C55E' : undefined}
          />
          <Detail
            label="Casualties"
            value={event.casualties_reported || 0}
            color={event.casualties_reported > 0 ? '#EF4444' : undefined}
          />
          <Detail label="Impact" value={event.impact_confirmed ? 'Confirmed' : 'Unconfirmed'} />
        </div>

        {/* Timestamp and conflict */}
        <div className="border-t border-white/5 mt-2 pt-2 flex items-center justify-between">
          <span className="text-[10px] text-white/30">{timestamp}</span>
          <span className="text-[10px] text-white/40 font-medium">{event.conflict_name || ''}</span>
        </div>

        {/* Damage description if available */}
        {event.damage_description && (
          <div className="mt-2 text-[11px] text-white/50 italic leading-relaxed">
            {event.damage_description}
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value, color }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/30">{label}</span>
      <span className="font-medium" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

/**
 * Converts snake_case type values to Title Case for display.
 * e.g. "ballistic" -> "Ballistic", "short_range" -> "Short Range"
 */
function formatType(type) {
  if (!type) return '—'
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
