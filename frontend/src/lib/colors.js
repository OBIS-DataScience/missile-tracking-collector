/**
 * Arc and marker colors based on missile event confidence level.
 * These map directly to the design spec.
 */

export const CONFIDENCE_COLORS = {
  confirmed: '#EF4444',   // Red — confirmed strike
  likely: '#F97316',       // Orange — likely
  unverified: '#6B7280',   // Gray — unverified
}

// Intercepted events get green regardless of confidence
export const INTERCEPTED_COLOR = '#22C55E'

/**
 * Returns the arc color for a missile event.
 * Intercepted missiles are always green; otherwise color by confidence.
 */
export function getArcColor(event) {
  if (event.intercepted) return INTERCEPTED_COLOR
  return CONFIDENCE_COLORS[event.confidence_level] || CONFIDENCE_COLORS.unverified
}

/**
 * Returns a slightly transparent version for the arc's far end,
 * creating a gradient fade effect along the trajectory.
 */
export function getArcColors(event) {
  const color = getArcColor(event)
  return [color, `${color}88`]
}
