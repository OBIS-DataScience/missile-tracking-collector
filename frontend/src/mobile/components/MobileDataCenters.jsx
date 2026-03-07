import React, { useState, useMemo } from 'react'

const PROVIDER_COLORS = {
  'Amazon AWS': '#FF9900',
  'Microsoft Azure': '#0078D4',
  'Oracle Cloud': '#C74634',
}

const PROVIDER_SHORT = {
  'Amazon AWS': 'AWS',
  'Microsoft Azure': 'Azure',
  'Oracle Cloud': 'Oracle',
}

/**
 * Mobile data centers view — strategic infrastructure targets.
 * Provider filter chips at top, then grouped/searchable list of facilities.
 */
export default function MobileDataCenters({
  dataCenters,
  allDataCenters,
  dataCenterFilter,
  onToggleDataCenter,
}) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // Count by provider (from unfiltered data)
  const providerCounts = useMemo(() => {
    const counts = {}
    allDataCenters.forEach((dc) => {
      counts[dc.provider] = (counts[dc.provider] || 0) + 1
    })
    return counts
  }, [allDataCenters])

  // Filter by search
  const visibleCenters = useMemo(() => {
    if (!search.trim()) return dataCenters
    const q = search.toLowerCase()
    return dataCenters.filter((dc) =>
      dc.name?.toLowerCase().includes(q) ||
      dc.city?.toLowerCase().includes(q) ||
      dc.country?.toLowerCase().includes(q) ||
      dc.state_region?.toLowerCase().includes(q) ||
      dc.ai_companies_hosted?.toLowerCase().includes(q)
    )
  }, [dataCenters, search])

  // Group by country
  const grouped = useMemo(() => {
    const groups = {}
    visibleCenters.forEach((dc) => {
      const country = dc.country || 'Unknown'
      if (!groups[country]) groups[country] = []
      groups[country].push(dc)
    })
    // Sort countries by number of DCs (most first)
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [visibleCenters])

  return (
    <div className="h-full flex flex-col">
      {/* Provider filter chips */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 flex gap-2">
        {Object.entries(PROVIDER_COLORS).map(([provider, color]) => (
          <button
            key={provider}
            onClick={() => onToggleDataCenter(provider)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
              text-[10px] font-semibold tracking-wider uppercase
              border transition-all duration-200 active:scale-95
            `}
            style={dataCenterFilter.includes(provider)
              ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color }
              : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }
            }
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color, opacity: dataCenterFilter.includes(provider) ? 1 : 0.3 }}
            />
            {PROVIDER_SHORT[provider]}
            <span className="text-[9px] opacity-60">({providerCounts[provider] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search city, country, or AI company..."
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5
                     text-[12px] text-white/70 placeholder-white/20
                     focus:outline-none focus:border-cyan-400/30 transition-colors"
        />
      </div>

      {/* Results count */}
      <div className="flex-shrink-0 px-4 pb-2">
        <span className="text-[10px] text-white/25">
          {visibleCenters.length} facilities across {grouped.length} countries
        </span>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {grouped.map(([country, dcs]) => (
          <div key={country}>
            {/* Country header */}
            <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-[#0B0F1A] py-1 z-10">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                {country}
              </span>
              <span className="text-[9px] font-mono text-white/20">({dcs.length})</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* DC cards */}
            <div className="space-y-1.5">
              {dcs.map((dc) => {
                const color = PROVIDER_COLORS[dc.provider] || '#888'
                const isExpanded = expandedId === dc.id

                return (
                  <div
                    key={dc.id}
                    className="bg-white/[0.03] border border-white/5 rounded-lg overflow-hidden
                               active:bg-white/[0.06] transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : dc.id)}
                  >
                    <div className="px-3 py-2.5 flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white/70 font-medium truncate">
                          {dc.name}
                        </div>
                        <div className="text-[10px] text-white/30">
                          {dc.city}{dc.state_region ? `, ${dc.state_region}` : ''}
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-bold tracking-wider uppercase flex-shrink-0"
                        style={{ color }}
                      >
                        {PROVIDER_SHORT[dc.provider]}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-2.5 space-y-2">
                        {dc.address && (
                          <div className="text-[11px] text-white/30">{dc.address}</div>
                        )}

                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div>
                            <span className="text-white/20">Lat: </span>
                            <span className="font-mono text-white/40">{dc.latitude?.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-white/20">Lng: </span>
                            <span className="font-mono text-white/40">{dc.longitude?.toFixed(4)}</span>
                          </div>
                        </div>

                        {dc.ai_companies_hosted && (
                          <div className="border-t border-white/5 pt-2">
                            <div className="text-[9px] text-white/20 uppercase tracking-wider mb-1">
                              AI Companies Hosted
                            </div>
                            <div className="text-[11px] text-cyan-400/80 font-medium leading-relaxed">
                              {dc.ai_companies_hosted}
                            </div>
                          </div>
                        )}

                        {dc.region_hint && (
                          <div className="text-[10px] text-white/20">
                            Region: <span className="font-mono text-white/35">{dc.region_hint}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {visibleCenters.length === 0 && (
          <div className="text-center text-white/20 text-xs mt-12">
            No data centers match your search
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
