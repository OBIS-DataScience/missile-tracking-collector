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
/**
 * Provider brand colors — these match each cloud company's official palette
 * so analysts can instantly identify which provider operates each facility.
 */
const PROVIDER_COLORS = {
  'Amazon AWS': '#FF9900',
  'Microsoft Azure': '#0078D4',
  'Oracle Cloud': '#C74634',
}

const MissileGlobe = forwardRef(function MissileGlobe(
  { events, frozen, onHoverEvent, onMouseMove, activeConflict, globeStyle, dataCenters = [] },
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
      // Initial stroke — dynamically updated by zoom listener below
      .arcStroke(0.25)
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

      // Data center layer — small colored dots at each cloud facility.
      // Uses labelsData (GPU-rendered sprites) for efficient rendering of 400+ points.
      .labelsData([])
      .labelLat((d) => d.latitude)
      .labelLng((d) => d.longitude)
      .labelText(() => '')
      .labelSize(0)
      .labelDotRadius(0.3)
      .labelColor((d) => PROVIDER_COLORS[d.provider] || '#888')
      .labelResolution(2)
      .labelAltitude(0.008)
      .labelIncludeDot(true)
      .labelLabel((d) => {
        const color = PROVIDER_COLORS[d.provider] || '#888'
        return `
          <div style="
            background: rgba(11, 15, 26, 0.95);
            border: 1px solid ${color}60;
            border-radius: 8px;
            padding: 8px 12px;
            color: white;
            font-size: 11px;
            line-height: 1.6;
            font-family: 'Inter', system-ui, sans-serif;
            min-width: 220px;
            max-width: 300px;
          ">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
              <span style="color: ${color}; font-weight: 700; font-size: 12px;">${d.provider}</span>
            </div>
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">${d.name}</div>
            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; margin-top: 2px;">
              <div style="color: rgba(255,255,255,0.5); font-size: 10px;">${d.city || ''}${d.state_region ? ', ' + d.state_region : ''}</div>
              <div style="color: rgba(255,255,255,0.5); font-size: 10px;">${d.country || ''}</div>
              ${d.address ? '<div style="color: rgba(255,255,255,0.3); font-size: 9px; margin-top: 2px;">' + d.address + '</div>' : ''}
            </div>
            ${d.ai_companies_hosted ? '<div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 6px; padding-top: 6px;"><div style="color: rgba(255,255,255,0.35); font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">AI Companies Hosted</div><div style="color: #22D3EE; font-size: 11px; font-weight: 500;">' + d.ai_companies_hosted + '</div></div>' : ''}
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

    // Adjust arc thickness based on zoom — thicker when zoomed out so you
    // can see routes globally, thinner when zoomed in for city-level precision.
    // We throttle this so it only fires every 300ms (not every frame) and
    // skip the update entirely if the stroke hasn't meaningfully changed.
    let lastStroke = 0.25
    let throttleTimer = null
    globe.controls().addEventListener('change', () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        const pov = globe.pointOfView()
        const alt = pov.altitude || 2
        const stroke = Math.min(0.50, Math.max(0.05, alt * 0.15))
        // Only re-render arcs if stroke changed by more than 0.02
        if (Math.abs(stroke - lastStroke) > 0.02) {
          lastStroke = stroke
          globe.arcStroke(stroke)
        }
      }, 300)
    })

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

  // Update data center dots when the filtered list changes
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.labelsData(
      dataCenters.filter((dc) => dc.latitude && dc.longitude)
    )
  }, [dataCenters])

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
