import React, { useMemo } from 'react'

/**
 * Missile type intelligence layer toggle.
 * Lets analysts filter the globe by specific missile classes,
 * each with a different visual style.
 */

const TYPE_STYLES = {
  ballistic:     { color: '#EF4444', icon: '/' },
  cruise:        { color: '#F97316', icon: '~' },
  hypersonic:    { color: '#A855F7', icon: '>' },
  drone_kamikaze:{ color: '#6B7280', icon: '*' },
  anti_ship:     { color: '#3B82F6', icon: '#' },
  icbm:          { color: '#DC2626', icon: '!' },
  short_range:   { color: '#FB923C', icon: 's' },
  medium_range:  { color: '#F59E0B', icon: 'm' },
  long_range:    { color: '#D97706', icon: 'l' },
  unknown:       { color: '#4B5563', icon: '?' },
}

export default function MissileTypeFilter({ events, activeTypes, onToggleType }) {
  // Count how many events use each missile type
  const typeCounts = useMemo(() => {
    const counts = {}
    events.forEach((e) => {
      const type = e.missile_type || 'unknown'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [events])

  const presentTypes = Object.keys(typeCounts).sort(
    (a, b) => (typeCounts[b] || 0) - (typeCounts[a] || 0)
  )

  return (
    <div className="bg-navy-800/80 backdrop-blur-md border border-white/10 rounded-lg p-3">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">
        Missile Type Layer
      </div>
      {presentTypes.map((type) => {
        const style = TYPE_STYLES[type] || TYPE_STYLES.unknown
        const active = activeTypes.includes(type)

        return (
          <button
            key={type}
            onClick={() => onToggleType(type)}
            className={`
              flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-all
              ${active ? 'text-white/90' : 'text-white/30'}
            `}
          >
            <div
              className="w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] font-bold transition-all"
              style={{
                backgroundColor: active ? style.color : 'transparent',
                borderColor: style.color,
                opacity: active ? 1 : 0.4,
                color: active ? '#fff' : style.color,
              }}
            >
              {style.icon}
            </div>
            <span className="capitalize flex-1 text-left">{formatType(type)}</span>
            <span className="text-[10px] font-mono text-white/25">{typeCounts[type]}</span>
          </button>
        )
      })}
    </div>
  )
}

function formatType(type) {
  if (!type) return 'Unknown'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
