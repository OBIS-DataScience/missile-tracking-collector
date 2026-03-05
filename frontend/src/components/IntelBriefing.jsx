import React, { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Military-style audio intelligence briefing.
 *
 * Generates a structured briefing script from live event data and
 * Monte Carlo predictions, then reads it aloud using the browser's
 * built-in Web Speech API (window.speechSynthesis). No API keys or
 * costs involved — the browser does all the text-to-speech work.
 *
 * Draggable (grab the title bar) just like the LiveNewsPlayer.
 * Closing the panel immediately stops any speech in progress.
 */
export default function IntelBriefing({ events, predictions, visible, onClose }) {
  const [speaking, setSpeaking] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [briefingLines, setBriefingLines] = useState([])
  const [voiceReady, setVoiceReady] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 })
  const utteranceRef = useRef(null)
  const scrollRef = useRef(null)
  // Stop flag — checked by speakNext before queuing the next line.
  // Without this, cancel() triggers onend which re-queues speech.
  const stoppedRef = useRef(false)

  // Drag refs — using refs so mousemove doesn't cause re-renders every pixel
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // --- Drag handlers (same pattern as LiveNewsPlayer) ---
  const onDragStart = useCallback((e) => {
    if (e.target.closest('[data-no-drag]')) return
    isDragging.current = true
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.preventDefault()
  }, [position])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging.current) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y)),
        })
      }
    }
    const onMouseUp = () => {
      isDragging.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Wait for voices to load — some browsers load them asynchronously
  useEffect(() => {
    const checkVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || []
      if (voices.length > 0) setVoiceReady(true)
    }
    checkVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', checkVoices)
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', checkVoices)
    }
  }, [])

  // Generate the briefing text from current data
  const generateBriefing = useCallback(() => {
    const now = new Date()
    const zuluTime = now.toISOString().replace('T', ' ').slice(0, 16) + 'Z'

    const totalEvents = events.length
    const confirmed = events.filter((e) => e.confidence_level === 'confirmed').length
    const likely = events.filter((e) => e.confidence_level === 'likely').length
    const unverified = events.filter((e) => e.confidence_level === 'unverified').length

    const totalCasualties = events.reduce((sum, e) => sum + (e.casualties_reported || 0), 0)
    const totalMissiles = events.reduce((sum, e) => sum + (e.missile_count || 0), 0)
    const totalIntercepted = events.reduce((sum, e) => sum + (e.intercepted_count || 0), 0)

    const senders = [...new Set(events.map((e) => e.sender_country).filter(Boolean))]
    const targets = [...new Set(events.map((e) => e.target_country).filter(Boolean))]

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentEvents = events.filter((e) => new Date(e.event_timestamp_utc) >= oneDayAgo)

    const senderCounts = {}
    events.forEach((e) => {
      if (e.sender_country) senderCounts[e.sender_country] = (senderCounts[e.sender_country] || 0) + 1
    })
    const topSender = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]

    const targetCounts = {}
    events.forEach((e) => {
      if (e.target_country) targetCounts[e.target_country] = (targetCounts[e.target_country] || 0) + 1
    })
    const topTarget = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0]

    const latest5 = events.slice(0, 5)

    const lines = []

    lines.push('INTELLIGENCE BRIEFING — CLASSIFIED')
    lines.push(`Briefing generated at ${zuluTime}. This is an automated intelligence summary from the Global Missile Activity Console.`)
    lines.push('')

    lines.push('SECTION 1: SITUATION OVERVIEW')
    lines.push(`The global conflict designated World War Three, initiated on February 27th, 2026, following United States and Israeli strikes on Iranian nuclear facilities, continues to escalate across multiple theaters of operation.`)
    lines.push(`We are currently tracking ${totalEvents} missile events across ${targets.length} target nations involving ${senders.length} state actors.`)
    lines.push(`Total munitions tracked: ${totalMissiles} missiles launched. ${totalIntercepted} confirmed interceptions. ${totalCasualties} casualties reported.`)
    lines.push('')

    lines.push('SECTION 2: INTELLIGENCE CONFIDENCE BREAKDOWN')
    lines.push(`Of ${totalEvents} total events: ${confirmed} are confirmed by multiple sources, ${likely} are assessed as likely, and ${unverified} remain unverified at this time.`)
    lines.push('')

    lines.push('SECTION 3: KEY ACTORS ASSESSMENT')
    if (topSender) {
      lines.push(`Most active aggressor: ${topSender[0]}, responsible for ${topSender[1]} recorded events.`)
    }
    if (topTarget) {
      lines.push(`Most targeted nation: ${topTarget[0]}, sustaining ${topTarget[1]} attacks.`)
    }
    lines.push(`Active belligerents include: ${senders.join(', ')}.`)
    lines.push(`Nations under fire: ${targets.join(', ')}.`)
    lines.push('')

    lines.push('SECTION 4: RECENT ACTIVITY — LAST 24 HOURS')
    if (recentEvents.length === 0) {
      lines.push('No new missile events have been recorded in the past 24 hours.')
    } else {
      lines.push(`${recentEvents.length} new events detected in the past 24 hours.`)
      latest5.forEach((e, i) => {
        const time = new Date(e.event_timestamp_utc).toISOString().slice(0, 16).replace('T', ' ')
        const type = formatType(e.missile_type)
        const count = e.missile_count || 'unknown number of'
        const intercepted = e.intercepted_count > 0 ? `, ${e.intercepted_count} intercepted` : ''
        const casualties = e.casualties_reported > 0 ? `, ${e.casualties_reported} casualties reported` : ''
        lines.push(
          `Event ${i + 1}: ${e.sender_country || 'Unknown'} launched ${count} ${type} at ${e.target_country || 'Unknown'} at ${time} Zulu${intercepted}${casualties}. Confidence: ${e.confidence_level || 'unverified'}.`
        )
      })
    }
    lines.push('')

    lines.push('SECTION 5: THREAT FORECAST — MONTE CARLO ANALYSIS')
    if (predictions.length === 0) {
      lines.push('No predictive analysis is currently available.')
    } else {
      lines.push(`Our Monte Carlo simulation engine, based on ${predictions[0]?.sample_count || 10000} weighted random scenarios, has identified the following highest-probability threats:`)
      predictions.slice(0, 5).forEach((p, i) => {
        const prob = (p.probability * 100).toFixed(1)
        lines.push(
          `Threat ${i + 1}: ${prob} percent probability of ${p.sender_country} attacking ${p.target_country} with ${formatType(p.missile_type)}. ${p.reasoning || ''}`
        )
      })
    }
    lines.push('')

    lines.push('END OF BRIEFING')
    lines.push('This intelligence summary is generated automatically and updated every two hours. All data should be cross-referenced with primary intelligence sources before operational use. Stay vigilant. End transmission.')

    setBriefingLines(lines)
    return lines
  }, [events, predictions])

  // Generate briefing when panel becomes visible
  useEffect(() => {
    if (visible && events.length > 0) {
      generateBriefing()
    }
  }, [visible, events, predictions, generateBriefing])

  // Auto-scroll to current line being read
  useEffect(() => {
    if (currentLine >= 0 && scrollRef.current) {
      const lineEl = scrollRef.current.querySelector(`[data-line="${currentLine}"]`)
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentLine])

  // Stop speech immediately when panel closes or component unmounts
  useEffect(() => {
    if (!visible) {
      stoppedRef.current = true
      window.speechSynthesis?.cancel()
      setSpeaking(false)
      setCurrentLine(-1)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      stoppedRef.current = true
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Close handler — sets stop flag, cancels speech, then closes panel
  const handleClose = () => {
    stoppedRef.current = true
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setCurrentLine(-1)
    onClose()
  }

  const startBriefing = () => {
    if (!window.speechSynthesis) {
      alert('Your browser does not support text-to-speech.')
      return
    }

    window.speechSynthesis.cancel()

    const lines = briefingLines.length > 0 ? briefingLines : generateBriefing()
    const fullText = lines.filter((l) => l.length > 0)

    // Pick a deep, authoritative voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(
      (v) => v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Google UK English Male')
    ) || voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
    ) || voices.find(
      (v) => v.lang.startsWith('en')
    ) || voices[0]

    let lineIndex = 0
    stoppedRef.current = false
    setSpeaking(true)

    const speakNext = () => {
      if (stoppedRef.current || lineIndex >= fullText.length) {
        setSpeaking(false)
        setCurrentLine(-1)
        return
      }

      const utterance = new SpeechSynthesisUtterance(fullText[lineIndex])
      utterance.voice = preferred
      utterance.rate = 0.92
      utterance.pitch = 0.85
      utterance.volume = 1

      const originalIndex = briefingLines.indexOf(fullText[lineIndex])
      setCurrentLine(originalIndex)

      utterance.onend = () => {
        lineIndex++
        speakNext()
      }

      utterance.onerror = () => {
        lineIndex++
        speakNext()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    speakNext()
  }

  const stopBriefing = () => {
    stoppedRef.current = true
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setCurrentLine(-1)
  }

  const toggleBriefing = () => {
    if (speaking) {
      stopBriefing()
    } else {
      startBriefing()
    }
  }

  if (!visible) return null

  return (
    <div
      style={{ left: position.x, top: position.y, width: 380 }}
      className="fixed z-[200] select-none"
    >
      {/* Title bar — draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between gap-2 px-3 py-2
                   bg-[#0B0F1A]/95 backdrop-blur-md border border-amber-500/30
                   cursor-move"
        style={minimized ? { borderRadius: '8px' } : { borderRadius: '8px 8px 0 0' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BriefingIcon />
          <div>
            <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Intel Briefing
            </h3>
            <p className="text-[8px] text-white/30 uppercase tracking-wider">
              Automated INTSUM
            </p>
          </div>
          {speaking && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
              <span className="text-[8px] text-amber-400/60 ml-1">BROADCASTING</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1" data-no-drag>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white/70
                       transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '+' : '\u2013'}
          </button>
          <button
            onClick={handleClose}
            className="px-1.5 py-0.5 text-[10px] text-white/40 hover:text-red-400
                       transition-colors"
            title="Close"
          >
            x
          </button>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div className="bg-[#0B0F1A]/95 backdrop-blur-md border border-t-0 border-amber-500/30
                        rounded-b-lg shadow-2xl flex flex-col"
             style={{ maxHeight: '60vh' }}>
          {/* Control bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
            <button
              onClick={toggleBriefing}
              data-no-drag
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium
                border transition-all duration-200
                ${speaking
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                }
              `}
            >
              {speaking ? (
                <>
                  <StopIcon /> Stop Briefing
                </>
              ) : (
                <>
                  <PlayIcon /> Start Briefing
                </>
              )}
            </button>

            {!voiceReady && (
              <span className="text-[9px] text-white/30">Loading voices...</span>
            )}

            <div className="ml-auto text-[9px] text-white/20">
              {briefingLines.filter((l) => l.length > 0).length} lines
            </div>
          </div>

          {/* Briefing transcript — scrollable */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1.5">
            {briefingLines.length === 0 ? (
              <p className="text-[10px] text-white/30 text-center py-8">
                Loading briefing data...
              </p>
            ) : (
              briefingLines.map((line, i) => {
                if (line === '') return <div key={i} className="h-2" />

                const isSection = line.startsWith('SECTION') || line.startsWith('INTELLIGENCE BRIEFING') || line.startsWith('END OF BRIEFING')
                const isActive = i === currentLine

                return (
                  <p
                    key={i}
                    data-line={i}
                    className={`
                      text-[11px] leading-relaxed transition-all duration-300
                      ${isSection
                        ? 'text-amber-400/80 font-bold uppercase tracking-wider text-[10px] mt-2'
                        : isActive
                          ? 'text-white/90 bg-amber-500/10 -mx-2 px-2 py-1 rounded border-l-2 border-amber-400'
                          : i < currentLine && currentLine >= 0
                            ? 'text-white/25'
                            : 'text-white/50'
                      }
                    `}
                  >
                    {line}
                  </p>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatType(type) {
  if (!type || type === 'unknown') return 'unknown type'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function BriefingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
      <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}
