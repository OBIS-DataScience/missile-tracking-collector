import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import Globe from 'globe.gl'
import * as THREE from 'three'
import { getArcColor } from '../lib/colors'

/**
 * Conflict-specific camera positions.
 */
const CONFLICT_VIEWS = {
  Global: { lat: 30, lng: 45, altitude: 2.2 },
  'Russia-Ukraine War': { lat: 48, lng: 36, altitude: 1.2 },
  '2026 Iran Conflict': { lat: 30, lng: 50, altitude: 1.4 },
}

/**
 * Two globe visual styles the analyst can toggle between:
 * - "night"     — dark city-lights view (original, great for command center aesthetic)
 * - "satellite" — NASA Blue Marble with terrain bump map (great for zoomed-in detail)
 */
const GLOBE_STYLES = {
  night: {
    globeImage: '//unpkg.com/three-globe/example/img/earth-night.jpg',
    bumpImage: null,
    atmosphere: '#1e40af',
    atmosphereAlt: 0.2,
    graticules: true,
  },
  satellite: {
    globeImage: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    bumpImage: '//unpkg.com/three-globe/example/img/earth-topology.png',
    atmosphere: '#4a90d9',
    atmosphereAlt: 0.15,
    graticules: false,
  },
}

/**
 * Max aircraft to render at once. The OpenSky API can return 8,000+
 * aircraft worldwide — we cap it so the GPU stays happy.
 */
const MAX_AIRCRAFT = 3000

const MissileGlobe = forwardRef(function MissileGlobe(
  { events, frozen, onHoverEvent, onMouseMove, activeConflict, globeStyle, airTrafficData = [] },
  ref
) {
  const containerRef = useRef(null)
  const globeRef = useRef(null)

  useImperativeHandle(ref, () => ({
    flyToEvent(event) {
      if (!globeRef.current || !event) return
      globeRef.current.pointOfView(
        {
          lat: (event.launch_latitude + event.target_latitude) / 2,
          lng: (event.launch_longitude + event.target_longitude) / 2,
          altitude: 1.0,
        },
        1000
      )
    },
    flyToConflict(conflict) {
      if (!globeRef.current) return
      const view = CONFLICT_VIEWS[conflict] || CONFLICT_VIEWS.Global
      globeRef.current.pointOfView(view, 1500)
    },
    resize() {
      if (!globeRef.current || !containerRef.current) return
      globeRef.current.width(containerRef.current.clientWidth)
      globeRef.current.height(containerRef.current.clientHeight)
    },
  }))

  // Build the globe instance once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const style = GLOBE_STYLES[globeStyle] || GLOBE_STYLES.night
    const globe = Globe()
    globeRef.current = globe

    globe(containerRef.current)
      .globeImageUrl(style.globeImage)
      .bumpImageUrl(style.bumpImage || '')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor(style.atmosphere)
      .atmosphereAltitude(style.atmosphereAlt)
      .showGraticules(style.graticules)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)

      // Arc settings (missile trajectories)
      .arcColor((d) => {
        const color = getArcColor(d)
        return d.intercepted ? [color, '#22C55E40'] : [color, `${color}88`]
      })
      .arcStroke(0.05)
      .arcDashLength(0.4)
      .arcDashGap(0.4)
      .arcDashAnimateTime((d) => (d.intercepted ? 3000 : 4500))
      .arcDashInitialGap((d) => (d.intercepted ? 0.7 : 0))
      .arcAltitudeAutoScale(0.4)
      .arcLabel(() => '')

      // Launch origin points (pulsing dots)
      .pointColor((d) => getArcColor(d))
      .pointAltitude(0.01)
      .pointRadius((d) => {
        if (d.casualties_reported > 50) return 0.25
        if (d.casualties_reported > 10) return 0.18
        return 0.12
      })
      .pointsMerge(false)

      // Impact rings
      .ringColor(() => (t) => `rgba(255, 255, 255, ${1 - t})`)
      .ringMaxRadius((d) => {
        if (d.casualties > 50) return 2.5
        if (d.casualties > 10) return 2
        return 1.5
      })
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1500)

      // Aircraft layer — uses labelsData which is GPU-rendered (sprites)
      // and natively supports lat/lng positioning + hover tooltips.
      .labelsData([])
      .labelLat((d) => d.lat)
      .labelLng((d) => d.lng)
      .labelText(() => '>')
      .labelSize(0.6)
      .labelDotRadius(0)
      .labelColor(() => 'rgba(0, 220, 255, 0.75)')
      .labelResolution(1)
      .labelAltitude(0.005)
      .labelIncludeDot(false)
      .labelLabel((d) => {
        const alt = d.altitude != null ? `${d.altitude.toLocaleString()}m` : 'N/A'
        const spd = d.velocity != null ? `${d.velocity} m/s` : 'N/A'
        return `
          <div style="
            background: rgba(11, 15, 26, 0.92);
            border: 1px solid rgba(0, 220, 255, 0.4);
            border-radius: 6px;
            padding: 6px 10px;
            color: white;
            font-size: 11px;
            line-height: 1.5;
            font-family: monospace;
            white-space: nowrap;
          ">
            <div style="color: #00dcff; font-weight: bold; margin-bottom: 2px;">${d.callsign}</div>
            <div>Country: ${d.originCountry}</div>
            <div>Altitude: ${alt}</div>
            <div>Speed: ${spd}</div>
          </div>
        `
      })

      .onArcHover((arc) => onHoverEvent(arc))
      .pointOfView(CONFLICT_VIEWS.Global)

    // Enhance satellite mode with specular oceans and better lighting
    if (globeStyle === 'satellite') {
      setTimeout(() => {
        const globeMesh = globe.scene().children.find(
          (obj) => obj.type === 'Mesh' && obj.__globeObjType === 'globe'
        )
        if (globeMesh) {
          const loader = new THREE.TextureLoader()
          loader.load('//unpkg.com/three-globe/example/img/earth-water.png', (texture) => {
            globeMesh.material.specularMap = texture
            globeMesh.material.specular = new THREE.Color('#444466')
            globeMesh.material.shininess = 15
            globeMesh.material.needsUpdate = true
          })
        }
        const scene = globe.scene()
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
        dirLight.position.set(5, 3, 5)
        scene.add(dirLight)
        const ambientLight = scene.children.find((c) => c.type === 'AmbientLight')
        if (ambientLight) ambientLight.intensity = 0.7
      }, 100)
    }

    globe.controls().autoRotate = !frozen
    globe.controls().autoRotateSpeed = 0.05
    globe.controls().enableDamping = true
    globe.controls().dampingFactor = 0.1

    // ResizeObserver watches the container itself, not just the window.
    // This fires when panels collapse/expand and the globe area changes size.
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        globe.width(containerRef.current.clientWidth)
        globe.height(containerRef.current.clientHeight)
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      globe._destructor?.()
    }
  }, [globeStyle]) // Re-create globe when style changes

  // Update data when events change
  useEffect(() => {
    if (!globeRef.current) return

    const arcsData = events
      .filter((e) => e.launch_latitude && e.target_latitude)
      .map((e) => ({
        ...e,
        startLat: e.launch_latitude,
        startLng: e.launch_longitude,
        endLat: e.target_latitude,
        endLng: e.target_longitude,
      }))

    const pointsData = arcsData.map((e) => ({
      ...e,
      lat: e.launch_latitude,
      lng: e.launch_longitude,
    }))

    const ringsData = arcsData
      .filter((e) => e.impact_confirmed)
      .map((e) => ({
        lat: e.target_latitude,
        lng: e.target_longitude,
        casualties: e.casualties_reported || 0,
      }))

    globeRef.current
      .arcsData(arcsData)
      .pointsData(pointsData)
      .ringsData(ringsData)
  }, [events])

  // Update aircraft layer when air traffic data changes.
  // Cap at MAX_AIRCRAFT so rendering stays smooth.
  useEffect(() => {
    if (!globeRef.current) return
    const capped = airTrafficData.length > MAX_AIRCRAFT
      ? airTrafficData.slice(0, MAX_AIRCRAFT)
      : airTrafficData
    globeRef.current.labelsData(capped)
  }, [airTrafficData])

  useEffect(() => {
    if (!globeRef.current || !activeConflict) return
    const view = CONFLICT_VIEWS[activeConflict] || CONFLICT_VIEWS.Global
    globeRef.current.pointOfView(view, 1500)
  }, [activeConflict])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = !frozen
  }, [frozen])

  const handleMouseMove = useCallback(
    (e) => {
      onMouseMove({ x: e.clientX, y: e.clientY })
    },
    [onMouseMove]
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onMouseMove={handleMouseMove}
    />
  )
})

export default MissileGlobe
