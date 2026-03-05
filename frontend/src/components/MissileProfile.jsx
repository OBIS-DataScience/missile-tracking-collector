import React from 'react'

/**
 * Missile capability profile card.
 * Opens when an analyst clicks a missile type in the event panel
 * or when they want to understand a specific weapon system.
 */
export default function MissileProfile({ event, onClose }) {
  if (!event) return null

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
      <div className="bg-navy-800/95 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl w-[360px] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/90">
              {event.missile_name || 'Unknown Missile'}
            </h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              Weapon System Profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center
                       text-white/40 hover:text-white/70 transition-all text-xs"
          >
            x
          </button>
        </div>

        {/* Profile grid */}
        <div className="space-y-2">
          <ProfileRow label="Classification" value={formatType(event.missile_type)} />
          <ProfileRow label="Origin Country" value={event.missile_origin_country || '—'} />
          <ProfileRow label="Range" value={event.missile_range_km ? `${event.missile_range_km} km` : 'Unknown'} />
          <ProfileRow label="Warhead Type" value={formatType(event.warhead_type)} />

          {/* Range visualization */}
          {event.missile_range_km && (
            <div className="mt-3">
              <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">
                Range Comparison
              </div>
              <RangeBar range={event.missile_range_km} />
            </div>
          )}

          {/* Deployment context */}
          <div className="border-t border-white/5 pt-2 mt-3">
            <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
              Deployment Context
            </div>
            <ProfileRow label="Launched By" value={event.sender_country || '—'} />
            <ProfileRow label="Faction" value={event.sender_faction || '—'} />
            <ProfileRow label="Targeted" value={event.target_country || '—'} />
            <ProfileRow label="Conflict" value={event.conflict_name || '—'} />
          </div>

          {/* Interception history */}
          {event.intercepted && (
            <div className="border-t border-white/5 pt-2 mt-2">
              <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                Interception Record
              </div>
              <ProfileRow label="Status" value="INTERCEPTED" color="#22C55E" />
              <ProfileRow label="System" value={event.interception_system || '—'} />
              <ProfileRow label="Count" value={`${event.intercepted_count} of ${event.missile_count}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-white/30">{label}</span>
      <span
        className="text-[11px] font-medium text-white/70"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Visual range bar — compares missile range to ICBM scale (~13,000 km).
 */
function RangeBar({ range }) {
  const maxRange = 13000
  const pct = Math.min((range / maxRange) * 100, 100)

  let color = '#22C55E'
  if (range > 5000) color = '#EF4444'
  else if (range > 1000) color = '#F97316'
  else if (range > 300) color = '#F59E0B'

  return (
    <div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-white/20">0 km</span>
        <span className="text-[9px] font-mono" style={{ color }}>{range.toLocaleString()} km</span>
        <span className="text-[9px] text-white/20">13,000 km</span>
      </div>
    </div>
  )
}

function formatType(type) {
  if (!type) return '—'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
