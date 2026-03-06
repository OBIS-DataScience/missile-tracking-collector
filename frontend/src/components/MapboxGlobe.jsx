import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getArcColor } from '../lib/colors'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Two Mapbox styles — satellite (default) and dark (inverted, labels-only feel)
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
}

/**
 * Mapbox GL "Precise View" — an alternative to the globe.gl view that supports
 * zooming all the way to street-level imagery with city names and borders.
 *
 * Starts pre-zoomed into the Middle East conflict zone for immediate context.
 * Includes a dark/light toggle to invert the map for a command-center aesthetic.
 */
const MapboxGlobe = forwardRef(function MapboxGlobe(
  { events, frozen, onHoverEvent, onMouseMove, airTrafficData = [] },
  ref
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useImperativeHandle(ref, () => ({
    flyToEvent(event) {
      if (!mapRef.current || !event) return
      const lat = ((event.launch_latitude || event.target_latitude) + event.target_latitude) / 2
      const lng = ((event.launch_longitude || event.target_longitude) + event.target_longitude) / 2
      mapRef.current.flyTo({ center: [lng, lat], zoom: 5, duration: 1500 })
    },
    flyToConflict() {
      if (!mapRef.current) return
      mapRef.current.flyTo({ center: [50, 30], zoom: 4.5, duration: 1500 })
    },
    resize() {
      mapRef.current?.resize()
    },
  }))

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: darkMode ? MAP_STYLES.dark : MAP_STYLES.satellite,
      projection: 'globe',
      center: [50, 30],
      zoom: 4.5,
      attributionControl: false,
      dragRotate: true,
      scrollZoom: true,
      touchZoomRotate: true,
      doubleClickZoom: true,
      dragPan: true,
    })

    // Add zoom/rotation controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')

    mapRef.current = map
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'mapbox-missile-popup',
    })

    // Setup function for all data sources/layers — called on initial load
    // and again after any style switch (Mapbox removes sources on style change)
    function setupLayers() {
      if (map.getSource('missile-arcs')) return // already set up

      // --- Missile arc lines (launch -> target) ---
      map.addSource('missile-arcs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'missile-arcs-layer',
        type: 'line',
        source: 'missile-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 0.8,
          'line-dasharray': [3, 2],
        },
      })

      // --- Launch points (circles at origin) ---
      map.addSource('launch-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'launch-points-layer',
        type: 'circle',
        source: 'launch-points',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, ['case', ['>', ['get', 'casualties'], 50], 6, ['>', ['get', 'casualties'], 10], 4, 3],
            8, ['case', ['>', ['get', 'casualties'], 50], 12, ['>', ['get', 'casualties'], 10], 9, 7],
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 0.3,
        },
      })

      // --- Target/impact rings ---
      map.addSource('target-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'target-points-layer',
        type: 'circle',
        source: 'target-points',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, 5,
            8, 14,
          ],
          'circle-color': 'transparent',
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-opacity': 0.7,
        },
      })

      // --- Air traffic ---
      map.addSource('air-traffic', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'air-traffic-layer',
        type: 'circle',
        source: 'air-traffic',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, 1.5,
            6, 3,
          ],
          'circle-color': 'rgba(0, 220, 255, 0.6)',
          'circle-stroke-color': 'rgba(0, 220, 255, 0.3)',
          'circle-stroke-width': 0.5,
        },
      })

      // --- Launch point labels (visible when zoomed in) ---
      map.addLayer({
        id: 'launch-labels',
        type: 'symbol',
        source: 'launch-points',
        minzoom: 4,
        layout: {
          'text-field': ['concat', ['get', 'sender'], ' → ', ['get', 'target']],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': 0.7,
          'text-halo-color': '#0B0F1A',
          'text-halo-width': 1,
        },
      })

      // --- Hover interactions ---
      map.on('mouseenter', 'launch-points-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const props = e.features[0].properties
        const html = `
          <div style="font-family: monospace; font-size: 11px; line-height: 1.6;">
            <div style="font-weight: bold; color: ${props.color}; margin-bottom: 2px;">
              ${props.sender} → ${props.target}
            </div>
            <div>Type: ${formatType(props.missile_type)}</div>
            <div>Missiles: x${props.missile_count}</div>
            <div>Confidence: ${props.confidence}</div>
            ${props.casualties > 0 ? `<div style="color: #EF4444;">Casualties: ${props.casualties}</div>` : ''}
          </div>
        `
        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map)
      })

      map.on('mouseleave', 'launch-points-layer', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current.remove()
      })

      // Air traffic hover
      map.on('mouseenter', 'air-traffic-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const props = e.features[0].properties
        const html = `
          <div style="font-family: monospace; font-size: 11px; line-height: 1.5;">
            <div style="color: #00dcff; font-weight: bold;">${props.callsign}</div>
            <div>Country: ${props.country}</div>
            <div>Altitude: ${props.altitude || 'N/A'}m</div>
            <div>Speed: ${props.velocity || 'N/A'} m/s</div>
          </div>
        `
        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map)
      })

      map.on('mouseleave', 'air-traffic-layer', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current.remove()
      })

    } // end setupLayers

    map.on('load', () => {
      // Dark fog/atmosphere effect for the globe view
      map.setFog({
        color: 'rgb(11, 15, 26)',
        'high-color': 'rgb(20, 30, 60)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(5, 5, 15)',
        'star-intensity': 0.6,
      })

      setupLayers()

      // Mark map as ready so data useEffects can fire
      setMapReady(true)
    })

    // Re-add sources/layers after any style switch
    map.on('style.load', () => {
      setupLayers()
    })

    map.on('mousemove', (e) => {
      onMouseMove({ x: e.point.x, y: e.point.y })
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  // Update missile data — only when map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current

    const validEvents = events.filter(
      (e) => e.launch_latitude && e.launch_longitude && e.target_latitude && e.target_longitude
    )

    // Arc lines
    const arcFeatures = validEvents.map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [e.launch_longitude, e.launch_latitude],
          [e.target_longitude, e.target_latitude],
        ],
      },
      properties: { color: getArcColor(e) },
    }))

    // Launch points
    const launchFeatures = validEvents.map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [e.launch_longitude, e.launch_latitude],
      },
      properties: {
        color: getArcColor(e),
        casualties: e.casualties_reported || 0,
        sender: e.sender_country || '?',
        target: e.target_country || '?',
        missile_type: e.missile_type || 'unknown',
        confidence: e.confidence_level || 'unverified',
        missile_count: e.missile_count || 0,
      },
    }))

    // Target impact rings
    const targetFeatures = validEvents
      .filter((e) => e.impact_confirmed)
      .map((e) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [e.target_longitude, e.target_latitude],
        },
        properties: {
          color: getArcColor(e),
          casualties: e.casualties_reported || 0,
        },
      }))

    const arcSrc = map.getSource('missile-arcs')
    const launchSrc = map.getSource('launch-points')
    const targetSrc = map.getSource('target-points')

    if (arcSrc) arcSrc.setData({ type: 'FeatureCollection', features: arcFeatures })
    if (launchSrc) launchSrc.setData({ type: 'FeatureCollection', features: launchFeatures })
    if (targetSrc) targetSrc.setData({ type: 'FeatureCollection', features: targetFeatures })
  }, [events, mapReady])

  // Update air traffic
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const features = airTrafficData.slice(0, 3000).map((a) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [a.lng, a.lat],
      },
      properties: {
        callsign: a.callsign,
        country: a.originCountry,
        altitude: a.altitude,
        velocity: a.velocity,
      },
    }))

    const src = mapRef.current.getSource('air-traffic')
    if (src) src.setData({ type: 'FeatureCollection', features })
  }, [airTrafficData, mapReady])

  // Toggle between satellite and dark map styles
  const handleDarkToggle = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      if (mapRef.current) {
        // Save current camera position
        const center = mapRef.current.getCenter()
        const zoom = mapRef.current.getZoom()
        const bearing = mapRef.current.getBearing()
        const pitch = mapRef.current.getPitch()

        mapRef.current.setStyle(next ? MAP_STYLES.dark : MAP_STYLES.satellite)

        // After style loads, re-add all data sources/layers and restore camera
        mapRef.current.once('style.load', () => {
          mapRef.current.jumpTo({ center, zoom, bearing, pitch })
          // Re-add fog for dark atmosphere
          mapRef.current.setFog({
            color: 'rgb(11, 15, 26)',
            'high-color': 'rgb(20, 30, 60)',
            'horizon-blend': 0.08,
            'space-color': 'rgb(5, 5, 15)',
            'star-intensity': 0.6,
          })
          // Trigger data re-initialization by toggling mapReady
          setMapReady(false)
          setTimeout(() => setMapReady(true), 50)
        })
      }
      return next
    })
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Dark mode toggle — only visible in Precise View */}
      <button
        onClick={handleDarkToggle}
        className={`
          absolute top-14 right-2 z-10 px-2.5 py-1.5 rounded-lg text-[10px] font-medium
          border transition-all duration-200 backdrop-blur-sm
          ${darkMode
            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
            : 'bg-black/40 border-white/10 text-white/60 hover:text-white/80'
          }
        `}
        title={darkMode ? 'Switch to Satellite' : 'Switch to Dark Mode'}
      >
        {darkMode ? 'Satellite' : 'Dark Mode'}
      </button>
    </div>
  )
})

function formatType(type) {
  if (!type || type === 'unknown') return 'Unknown'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default MapboxGlobe
