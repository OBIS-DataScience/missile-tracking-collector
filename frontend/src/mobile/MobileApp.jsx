import React, { useState, useMemo } from 'react'
import useAppData from '../hooks/useAppData'
import MobileHeader from './components/MobileHeader'
import MobileStats from './components/MobileStats'
import MobileEventFeed from './components/MobileEventFeed'
import MobilePredictions from './components/MobilePredictions'
import PrayerTicker from '../components/PrayerTicker'

/**
 * Mobile THREATNET experience — purpose-built for phones and tablets.
 *
 * No 3D globe (too heavy for mobile GPUs). Instead:
 *   - Top: branded header with live clock and key metrics
 *   - Middle: tab-switchable content (Events, Stats, Data Centers)
 *   - Bottom: prayer ticker
 *
 * Uses the same shared data hook as desktop, so all Supabase data,
 * filters, and logic stay in sync between both versions.
 */
const TABS = [
  { id: 'events', label: 'Events' },
  { id: 'stats', label: 'Intel' },
  { id: 'predictions', label: 'Predictions' },
]

export default function MobileApp() {
  const {
    events,
    filteredEvents,
    predictions,
    loading,
    confidenceFilter,
    handleToggleConfidence,
  } = useAppData()

  const [activeTab, setActiveTab] = useState('events')

  // Quick stats for the header
  const stats = useMemo(() => {
    const totalMissiles = filteredEvents.reduce((s, e) => s + (e.missile_count || 0), 0)
    const totalIntercepted = filteredEvents.reduce((s, e) => s + (e.intercepted_count || 0), 0)
    const totalCasualties = filteredEvents.reduce((s, e) => s + (e.casualties_reported || 0), 0)
    const interceptionRate = totalMissiles > 0
      ? Math.round((totalIntercepted / totalMissiles) * 100) : 0

    return { totalEvents: filteredEvents.length, totalMissiles, totalIntercepted, totalCasualties, interceptionRate }
  }, [filteredEvents])

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0F1A] overflow-hidden">
      {/* Branded header with live stats */}
      <MobileHeader stats={stats} loading={loading} />

      {/* Tab navigation */}
      <div className="flex-shrink-0 border-b border-white/5">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-3 text-[11px] font-semibold tracking-wider uppercase
                transition-all duration-200 relative
                ${activeTab === tab.id
                  ? 'text-cyan-400'
                  : 'text-white/30 active:text-white/50'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-cyan-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-white/30 tracking-wider uppercase">
                Loading intelligence...
              </span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'events' && (
              <MobileEventFeed
                events={filteredEvents}
                confidenceFilter={confidenceFilter}
                onToggleConfidence={handleToggleConfidence}
              />
            )}
            {activeTab === 'stats' && (
              <MobileStats events={filteredEvents} allEvents={events} />
            )}
            {activeTab === 'predictions' && (
              <MobilePredictions predictions={predictions} />
            )}
          </>
        )}
      </div>

      {/* Prayer ticker */}
      <PrayerTicker />
    </div>
  )
}
