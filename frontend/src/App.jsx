import React, { useState, useEffect } from 'react'

/**
 * Platform router — loads the desktop or mobile app based on screen width.
 *
 * Why not just use CSS breakpoints?
 * Mobile users would still download the 3D globe, Three.js, and Mapbox
 * (~2MB) even though they'd never see it. By code-splitting here,
 * mobile only downloads the lightweight mobile bundle.
 *
 * The 1024px threshold matches Tailwind's `lg` breakpoint — anything
 * below that (phones, tablets, landscape phones) gets the mobile app.
 */
const DesktopApp = React.lazy(() => import('./DesktopApp'))
const MobileApp = React.lazy(() => import('./mobile/MobileApp'))

export default function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  // Re-check on resize so rotating a tablet switches views
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <React.Suspense
      fallback={
        <div className="w-screen h-screen bg-[#0B0F1A] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[10px] text-white/30 tracking-wider uppercase">
            Loading THREATNET...
          </p>
        </div>
      }
    >
      {isMobile ? <MobileApp /> : <DesktopApp />}
    </React.Suspense>
  )
}
