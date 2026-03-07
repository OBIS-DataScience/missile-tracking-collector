import React, { useState } from 'react'

/**
 * Mobile predictions view — Monte Carlo simulated attack scenarios.
 * Each card shows a predicted attack route, probability, weapon type,
 * and timing. Tap to expand for full reasoning and historical basis.
 */
export default function MobilePredictions({ predictions }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!predictions || predictions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F6" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <p className="text-[12px] text-white/40 mb-1">No predictions available yet</p>
        <p className="text-[11px] text-white/20">Simulation runs after each data collection cycle</p>
      </div>
    )
  }

  // Split into threat tiers for visual grouping
  const highThreat = predictions.filter((p) => p.probability >= 20)
  const medThreat = predictions.filter((p) => p.probability >= 10 && p.probability < 20)
  const lowThreat = predictions.filter((p) => p.probability < 10)

  return (
    <div className="h-full flex flex-col">
      {/* Simulation context bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-wider">
            Monte Carlo Simulation Engine
          </span>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed">
          10,000 simulated scenarios weighted by historical attack patterns. Updated every 2 hours.
        </p>
      </div>

      {/* Prediction list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* High threat tier */}
        {highThreat.length > 0 && (
          <ThreatSection
            label="High Probability"
            color="#EF4444"
            predictions={highThreat}
            expandedId={expandedId}
            onToggle={setExpandedId}
            startRank={1}
          />
        )}

        {/* Medium threat tier */}
        {medThreat.length > 0 && (
          <ThreatSection
            label="Moderate Probability"
            color="#F97316"
            predictions={medThreat}
            expandedId={expandedId}
            onToggle={setExpandedId}
            startRank={highThreat.length + 1}
          />
        )}

        {/* Low threat tier */}
        {lowThreat.length > 0 && (
          <ThreatSection
            label="Low Probability"
            color="#EAB308"
            predictions={lowThreat}
            expandedId={expandedId}
            onToggle={setExpandedId}
            startRank={highThreat.length + medThreat.length + 1}
          />
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}

function ThreatSection({ label, color, predictions, expandedId, onToggle, startRank }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <span className="text-[9px] text-white/20 font-mono">({predictions.length})</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="space-y-2">
        {predictions.map((pred, i) => (
          <PredictionCard
            key={pred.prediction_id}
            prediction={pred}
            rank={startRank + i}
            expanded={expandedId === pred.prediction_id}
            onToggle={() => onToggle(
              expandedId === pred.prediction_id ? null : pred.prediction_id
            )}
          />
        ))}
      </div>
    </div>
  )
}

function PredictionCard({ prediction, rank, expanded, onToggle }) {
  const prob = prediction.probability
  const probColor = prob >= 20 ? '#EF4444' : prob >= 10 ? '#F97316' : '#EAB308'
  const barWidth = Math.min(prob * 2, 100)

  return (
    <div
      className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden
                 active:bg-white/[0.06] transition-all duration-200"
      onClick={onToggle}
    >
      {/* Top accent — color indicates threat level */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${probColor}, transparent)` }} />

      <div className="px-4 py-3">
        {/* Route + probability */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-white/20 w-5">#{rank}</span>
            <span className="text-[13px] font-semibold text-white/85">
              {prediction.sender_country} → {prediction.target_country}
            </span>
          </div>
          <span
            className="text-[14px] font-mono font-bold"
            style={{ color: probColor }}
          >
            {prob}%
          </span>
        </div>

        {/* Probability bar */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2.5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barWidth}%`, backgroundColor: probColor }}
          />
        </div>

        {/* Quick meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-white/35">
            {formatType(prediction.missile_type)}
          </span>
          <span className="text-[10px] text-white/20 font-mono">
            Peak: {String(prediction.peak_hour_utc).padStart(2, '0')}:00 UTC
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <Detail label="Simulations" value={`${prediction.sample_count?.toLocaleString()} / 10,000`} />
            <Detail label="Historical Attacks" value={prediction.historical_frequency} />
            <Detail label="Predicted Window" value={formatWindow(prediction.predicted_window_start, prediction.predicted_window_end)} />
            {prediction.target_location_name && (
              <Detail label="Target Area" value={prediction.target_location_name} />
            )}
          </div>

          {prediction.reasoning && (
            <div className="text-[11px] text-white/30 italic leading-relaxed pt-2 border-t border-white/5">
              {prediction.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="text-white/20">{label}: </span>
      <span className="text-white/50 font-mono text-[10px]">{value}</span>
    </div>
  )
}

function formatType(type) {
  if (!type || type === 'unknown') return 'Unknown weapon'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatWindow(start, end) {
  if (!start || !end) return '--'
  try {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return `${s.toLocaleString('en-US', fmt)} - ${e.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return '--'
  }
}
