import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getArcColor } from '../lib/colors'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

/**
 * Mapbox GL "Precise View" — dark command-center map with city names,
 * borders, and roads visible against a dark background that matches
 * the app's navy theme.
 *
 * Starts pre-zoomed into the Middle East conflict zone for immediate context.
 */
const MapboxGlobe = forwardRef(function MapboxGlobe(
  { events, frozen, onHoverEvent, onMouseMove, airTrafficData = [] },
  ref
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

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
      style: 'mapbox://styles/mapbox/dark-v11',
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
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            1, 2,
            6, 3,
            12, 4,
          ],
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

      // --- Rich tooltip for all missile layers (arcs, launch, target) ---
      const missileHoverLayers = ['missile-arcs-layer', 'launch-points-layer', 'target-points-layer']

      missileHoverLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const p = e.features[0].properties
          const ts = p.timestamp ? new Date(p.timestamp.endsWith('Z') || p.timestamp.includes('+') ? p.timestamp : p.timestamp + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : ''

          const html = `
            <div style="font-family: 'Inter', system-ui, sans-serif; font-size: 11px; line-height: 1.5; min-width: 260px; max-width: 320px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-family: monospace; font-size: 9px; color: rgba(255,255,255,0.4);">${p.event_id}</span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; padding: 1px 6px; border-radius: 9px; background: ${p.color}20; color: ${p.color}; border: 1px solid ${p.color}40;">${(p.confidence || '').toUpperCase()}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="text-align: right; flex: 1;">
                  <div style="font-weight: 600; font-size: 12px;">${p.sender}</div>
                  <div style="font-size: 10px; color: rgba(255,255,255,0.35);">${p.launch_location}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 2px;">
                  <div style="width: 6px; height: 6px; border-radius: 50%; background: ${p.color};"></div>
                  <div style="width: 32px; height: 1px; background: ${p.color};"></div>
                  <div style="width: 0; height: 0; border-left: 5px solid ${p.color}; border-top: 3px solid transparent; border-bottom: 3px solid transparent;"></div>
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 12px;">${p.target}</div>
                  <div style="font-size: 10px; color: rgba(255,255,255,0.35);">${p.target_location}</div>
                </div>
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.08); margin: 4px 0;"></div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; font-size: 10px;">
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Missile</span><span style="font-weight: 500;">${p.missile_name}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Type</span><span style="font-weight: 500;">${formatType(p.missile_type)}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Count</span><span style="font-weight: 500;">x${p.missile_count}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Range</span><span style="font-weight: 500;">${p.missile_range_km > 0 ? p.missile_range_km + ' km' : '—'}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Warhead</span><span style="font-weight: 500;">${formatType(p.warhead_type)}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Intercepted</span><span style="font-weight: 500; ${p.intercepted === 'Yes' ? 'color: #22C55E;' : ''}">${p.intercepted}${p.intercepted_count > 0 ? ' (' + p.intercepted_count + ')' : ''}${p.interception_system ? ' / ' + p.interception_system : ''}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Casualties</span><span style="font-weight: 500; ${p.casualties > 0 ? 'color: #EF4444;' : ''}">${p.casualties}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.3);">Impact</span><span style="font-weight: 500;">${p.impact_confirmed}</span></div>
              </div>
              ${p.damage_description ? '<div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 4px; padding-top: 4px; font-size: 10px; color: rgba(255,255,255,0.4); font-style: italic;">' + p.damage_description + '</div>' : ''}
              <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 4px; padding-top: 4px; display: flex; justify-content: space-between; font-size: 9px; color: rgba(255,255,255,0.25);">
                <span>${ts}</span>
                <span>${p.conflict_name}</span>
              </div>
            </div>
          `
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map)
        })

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          popupRef.current.remove()
        })
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
      // Atmosphere matches the app's #0B0F1A navy background
      map.setFog({
        color: 'rgb(11, 15, 26)',
        'high-color': 'rgb(15, 22, 45)',
        'horizon-blend': 0.06,
        'space-color': 'rgb(5, 5, 15)',
        'star-intensity': 0.5,
      })

      // Tint the dark-v11 map to match our navy theme —
      // deepens the water and land so it blends with the app background
      map.setPaintProperty('background', 'background-color', '#080C16')
      map.setPaintProperty('land', 'background-color', '#0D1220')
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#070A14')
      }
      // Make country borders subtly glow cyan to match the UI accents
      if (map.getLayer('admin-0-boundary')) {
        map.setPaintProperty('admin-0-boundary', 'line-color', 'rgba(34, 211, 238, 0.25)')
      }
      if (map.getLayer('admin-0-boundary-disputed')) {
        map.setPaintProperty('admin-0-boundary-disputed', 'line-color', 'rgba(239, 68, 68, 0.3)')
      }

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

    // Full event properties shared across all layers for rich tooltips
    const eventProps = (e) => ({
      color: getArcColor(e),
      event_id: e.event_id || '',
      sender: e.sender_country || '?',
      sender_faction: e.sender_faction || '',
      launch_location: e.launch_location_name || '',
      target: e.target_country || '?',
      target_location: e.target_location_name || '',
      missile_name: e.missile_name || 'Unknown',
      missile_type: e.missile_type || 'unknown',
      missile_count: e.missile_count || 0,
      missile_range_km: e.missile_range_km || 0,
      warhead_type: e.warhead_type || 'unknown',
      intercepted: e.intercepted ? 'Yes' : 'No',
      intercepted_count: e.intercepted_count || 0,
      interception_system: e.interception_system || '',
      impact_confirmed: e.impact_confirmed ? 'Confirmed' : 'Unconfirmed',
      casualties: e.casualties_reported || 0,
      confidence: e.confidence_level || 'unverified',
      damage_description: e.damage_description || '',
      conflict_name: e.conflict_name || '',
      timestamp: e.event_timestamp_utc || '',
    })

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
      properties: eventProps(e),
    }))

    // Launch points
    const launchFeatures = validEvents.map((e) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [e.launch_longitude, e.launch_latitude],
      },
      properties: eventProps(e),
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
        properties: eventProps(e),
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

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
})

function formatType(type) {
  if (!type || type === 'unknown') return 'Unknown'
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default MapboxGlobe
