import React, { useState } from 'react'

/**
 * Monte Carlo Simulation Panel — shows predicted next attacks
 * based on 10,000 random simulations of historical attack patterns.
 *
 * Each prediction card shows:
 * - Sender -> Target route
 * - Probability percentage (how often this scenario appeared)
 * - Weapon type
 * - Peak attack hour
 * - Historical basis (how many past attacks match this pattern)
 */
export default function SimulationPanel({ predictions, visible, onToggle, onLocate }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!visible) return null

  return (
    <div className="absolute top-16 right-4 z-30 w-[300px] max-h-[70vh] flex flex-col
                    bg-[#0B0F1A]/95 backdrop-blur-md border border-purple-500/20
                    rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-500/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h2 className="text-xs font-semibold tracking-wider text-purple-400/80 uppercase">
            Monte Carlo Predictions
          </h2>
        </div>
        <button
          onClick={onToggle}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          x
        </button>
      </div>

      {/* Simulation info */}
      <div className="px-4 py-2 border-b border-white/5 flex-shrink-0">
        <div className="text-[9px] text-white/25 leading-relaxed">
          Based on 10,000 simulated scenarios weighted by historical attack patterns.
          Updated every 2 hours.
        </div>
      </div>

      {/* Prediction cards */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
        {(!predictions || predictions.length === 0) && (
          <div className="text-center text-white/20 text-xs mt-8">
            No predictions available yet.
            <br />
            <span className="text-[10px]">Simulation runs after each data collection.</span>
          </div>
        )}

        {predictions?.map((pred, i) => (
          <PredictionCard
            key={pred.prediction_id}
            prediction={pred}
            rank={i + 1}
            expanded={expandedId === pred.prediction_id}
            onToggle={() => setExpandedId(
              expandedId === pred.prediction_id ? null : pred.prediction_id
            )}
            onLocate={() => onLocate(pred)}
          />
        ))}
      </div>
    </div>
  )
}

function PredictionCard({ prediction, rank, expanded, onToggle, onLocate }) {
  const prob = prediction.probability
  // Color based on probability: high = red, medium = orange, low = yellow
  const probColor = prob >= 20 ? '#EF4444' : prob >= 10 ? '#F97316' : '#EAB308'
  const barWidth = Math.min(prob * 2, 100) // Scale for visual bar (50% = full width)

  return (
    <div
      className="bg-purple-500/5 border border-purple-500/10 rounded-lg overflow-hidden
                 hover:border-purple-500/20 transition-all duration-200 cursor-pointer"
      onClick={onToggle}
    >
      <div className="px-3 py-2.5">
        {/* Route + rank */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-mono text-purple-400/50 w-4">
            #{rank}
          </span>
          <span className="text-xs font-medium text-white/80 truncate flex-1">
            {prediction.sender_country} → {prediction.target_country}
          </span>
          <span
            className="text-[11px] font-mono font-bold"
            style={{ color: probColor }}
          >
            {prob}%
          </span>
        </div>

        {/* Probability bar */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2 ml-6">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barWidth}%`, backgroundColor: probColor }}
          />
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 ml-6">
          <span className="text-[10px] text-white/30">
            {formatType(prediction.missile_type)}
          </span>
          <span className="text-[10px] text-white/20">
            Peak: {new Date(Date.UTC(2026, 0, 1, prediction.peak_hour_utc)).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-purple-500/10 mt-0 pt-2">
          <div className="space-y-1 text-[11px] ml-6">
            <DetailRow label="Simulations" value={`${prediction.sample_count.toLocaleString()} / 10,000`} />
            <DetailRow label="Historical Attacks" value={prediction.historical_frequency} />
            <DetailRow
              label="Predicted Window"
              value={formatWindow(prediction.predicted_window_start, prediction.predicted_window_end)}
            />
          </div>

          {prediction.reasoning && (
            <div className="mt-2 ml-6 text-[10px] text-white/30 italic leading-relaxed">
              {prediction.reasoning}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onLocate()
            }}
            className="mt-2 ml-6 w-[calc(100%-1.5rem)] text-[10px] text-purple-400/60
                       hover:text-purple-400 border border-purple-400/20
                       hover:border-purple-400/40 rounded px-2 py-1
                       transition-all uppercase tracking-wider"
          >
            View on Globe
          </button>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/25">{label}</span>
      <span className="text-white/50 font-mono">{value}</span>
    </div>
  )
}

function formatType(type) {
  if (!type || type === 'unknown') return 'Unknown weapon'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatWindow(start, end) {
  if (!start || !end) return '—'
  try {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }
    const endFmt = { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }
    return `${s.toLocaleString('en-US', fmt)} – ${e.toLocaleString('en-US', endFmt)} ET`
  } catch {
    return '—'
  }
}
