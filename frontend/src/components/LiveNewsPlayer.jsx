import React, { useState, useEffect, useRef, useCallback } from 'react'

const SEARCH_QUERIES = [
  'Fox News live stream USA',
  'CNN live news stream USA',
  'CNBC Squawk Box live stream',
  'Al Jazeera English live',
  'Al Arabiya English live',
  'Iran International English live',
  'TRT World live',
  'Sky News Arabia live',
  'i24NEWS English live',
]

const MAX_STREAMS = 9

/**
 * Maps channel names to their parent network brand so we never show
 * two streams from the same media family (e.g. "Fox News" + "Fox Business"
 * both map to "fox"). If a channel doesn't match any known brand, we
 * fall back to a cleaned version of the channel name itself.
 */
const NETWORK_BRANDS = [
  { pattern: /fox/i, brand: 'fox' },
  { pattern: /cnn/i, brand: 'cnn' },
  { pattern: /cnbc|squawk/i, brand: 'cnbc' },
  { pattern: /al.?jazeera/i, brand: 'aljazeera' },
  { pattern: /al.?arabiya/i, brand: 'alarabiya' },
  { pattern: /iran.?international/i, brand: 'iranintl' },
  { pattern: /trt/i, brand: 'trt' },
  { pattern: /sky.?news/i, brand: 'skynews' },
  { pattern: /i24/i, brand: 'i24' },
  { pattern: /msnbc/i, brand: 'msnbc' },
  { pattern: /bbc/i, brand: 'bbc' },
  { pattern: /abc.?news/i, brand: 'abc' },
  { pattern: /nbc.?news/i, brand: 'nbc' },
  { pattern: /cbs/i, brand: 'cbs' },
  { pattern: /reuters/i, brand: 'reuters' },
  { pattern: /france.?24/i, brand: 'france24' },
  { pattern: /dw.?news|deutsche/i, brand: 'dw' },
  { pattern: /wion/i, brand: 'wion' },
]

function getNetworkBrand(channelName) {
  const name = (channelName || '').trim()
  for (const { pattern, brand } of NETWORK_BRANDS) {
    if (pattern.test(name)) return brand
  }
  // Fallback: use first word of channel name so "SomeNetwork Live" and
  // "SomeNetwork Breaking" still count as duplicates
  return name.toLowerCase().split(/\s+/)[0] || 'unknown'
}

// YouTube embeds use 16:9 aspect ratio
const ASPECT_RATIO = 9 / 16
const MIN_WIDTH = 280
const MAX_WIDTH = 900

/**
 * Draggable, resizable picture-in-picture YouTube player that shows live
 * news coverage of conflicts. Searches for live streams via a server-side
 * proxy (so the API key stays hidden), then embeds the top result.
 *
 * The player can be:
 * - Dragged anywhere on screen (grab the title bar)
 * - Resized by dragging the bottom-right corner handle
 * - Minimized to just a title bar
 * - Cycled through available live streams
 * - Closed entirely
 */
export default function LiveNewsPlayer({ onClose }) {
  const [streams, setStreams] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [size, setSize] = useState({ w: 400, h: 225 })

  // Refs for drag and resize — using refs instead of state so
  // mousemove handlers don't cause re-renders every pixel
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 })

  // Fetch live streams on mount
  useEffect(() => {
    async function fetchStreams() {
      setLoading(true)
      const allStreams = []
      const seenIds = new Set()
      const seenNetworks = new Set()

      for (const query of SEARCH_QUERIES) {
        if (allStreams.length >= MAX_STREAMS) break
        try {
          // Request a few results per query so we have fallbacks if the
          // top result is from an already-seen network
          const res = await fetch(`/api/youtube-live?q=${encodeURIComponent(query)}&max=3`)
          if (!res.ok) continue
          const data = await res.json()
          for (const item of (data.items || [])) {
            if (allStreams.length >= MAX_STREAMS) break
            const id = item.id?.videoId
            const channelName = item.snippet?.channelTitle || ''
            const network = getNetworkBrand(channelName)
            // One stream per network brand — "Fox News", "Fox Business",
            // "Fox 5 New York" all map to "fox" and only the first is kept
            if (id && !seenIds.has(id) && !seenNetworks.has(network)) {
              seenIds.add(id)
              seenNetworks.add(network)
              allStreams.push({
                videoId: id,
                title: item.snippet?.title || 'Live Stream',
                channel: channelName,
                thumbnail: item.snippet?.thumbnails?.default?.url || '',
              })
            }
          }
        } catch {
          continue
        }
      }

      setStreams(allStreams)
      setLoading(false)
    }

    fetchStreams()
  }, [])

  // --- Drag (title bar) ---
  const onDragStart = useCallback((e) => {
    if (e.target.closest('[data-no-drag]')) return
    isDragging.current = true
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.preventDefault()
  }, [position])

  // --- Resize (corner handle) ---
  const onResizeStart = useCallback((e) => {
    isResizing.current = true
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: size.w,
      h: size.h,
    }
    e.preventDefault()
    e.stopPropagation()
  }, [size])

  // Single mousemove/mouseup listener for both drag and resize
  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging.current) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y)),
        })
      }
      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.mouseX
        const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.w + dx))
        const newH = Math.round(newW * ASPECT_RATIO)
        setSize({ w: newW, h: newH })
      }
    }
    const onMouseUp = () => {
      isDragging.current = false
      isResizing.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const activeStream = streams[activeIndex]

  return (
    <div
      style={{ left: position.x, top: position.y, width: size.w }}
      className="fixed z-[200] select-none"
    >
      {/* Title bar — always visible, draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between gap-2 px-3 py-1.5
                   bg-[#0B0F1A]/95 backdrop-blur-md border border-white/10
                   rounded-t-lg cursor-move"
        style={minimized ? { borderRadius: '8px' } : {}}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold flex-shrink-0">
            Live News
          </span>
        </div>

        <div className="flex items-center gap-1" data-no-drag>
          {streams.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setActiveIndex((i) => (i - 1 + streams.length) % streams.length)}
                className="px-1 py-0.5 text-[10px] text-white/40 hover:text-white/70
                           transition-colors"
                title="Previous stream"
              >
                &#9664;
              </button>
              <span className="text-[10px] text-white/40">
                {activeIndex + 1}/{streams.length}
              </span>
              <button
                onClick={() => setActiveIndex((i) => (i + 1) % streams.length)}
                className="px-1 py-0.5 text-[10px] text-white/40 hover:text-white/70
                           transition-colors"
                title="Next stream"
              >
                &#9654;
              </button>
            </div>
          )}
          <button
            onClick={() => setMinimized((m) => !m)}
            className="px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white/70
                       transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '+' : '\u2013'}
          </button>
          <button
            onClick={onClose}
            className="px-1.5 py-0.5 text-[10px] text-white/40 hover:text-red-400
                       transition-colors"
            title="Close"
          >
            x
          </button>
        </div>
      </div>

      {/* Video area + resize handle */}
      {!minimized && (
        <div className="relative bg-black border border-t-0 border-white/10 rounded-b-lg overflow-hidden"
             style={{ width: size.w, height: size.h }}>
          {loading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-white/30">Finding live streams...</span>
              </div>
            </div>
          )}

          {!loading && !activeStream && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] text-white/30">No live streams found</span>
            </div>
          )}

          {!loading && activeStream && (
            <iframe
              src={`https://www.youtube.com/embed/${activeStream.videoId}?autoplay=1&mute=1`}
              width={size.w}
              height={size.h}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="block"
              title={activeStream.title}
            />
          )}

          {/* Resize handle — bottom-right corner */}
          <div
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10"
            title="Drag to resize"
          >
            {/* Three diagonal lines like a standard resize grip */}
            <svg width="14" height="14" viewBox="0 0 14 14" className="absolute bottom-0.5 right-0.5 text-white/25">
              <line x1="10" y1="14" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6" y1="14" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
              <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
