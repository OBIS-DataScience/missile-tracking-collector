import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Proxy for YouTube Data API — searches for live news streams.
 * Keeps the API key server-side so it never reaches the browser.
 *
 * Flow:
 *   Browser → GET /api/youtube-live?q=search+terms → Vite server → YouTube API → returns results
 */
function youTubeProxyPlugin() {
  return {
    name: 'youtube-proxy',
    configureServer(server) {
      server.middlewares.use('/api/youtube-live', async (req, res) => {
        const env = loadEnv('', process.cwd(), '')
        const apiKey = env.YOUTUBE_API_KEY

        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'YOUTUBE_API_KEY not configured in .env' }))
          return
        }

        try {
          const url = new URL(req.url, 'http://localhost')
          const query = url.searchParams.get('q') || 'missile strike war live news'
          const maxResults = url.searchParams.get('max') || '5'

          const params = new URLSearchParams({
            part: 'snippet',
            type: 'video',
            eventType: 'live',
            q: query,
            maxResults,
            key: apiKey,
          })

          const apiRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params}`
          )
          const data = await apiRes.json()

          res.writeHead(apiRes.ok ? 200 : apiRes.status, {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300',
          })
          res.end(JSON.stringify(data))
        } catch (err) {
          console.error('[YouTube Proxy] Error:', err.message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), youTubeProxyPlugin()],
  resolve: {
    // Prevent globe.gl and our code from loading separate copies of Three.js
    dedupe: ['three'],
  },
  build: {
    // Split the 3.9MB bundle into smaller chunks so the browser can load
    // critical UI first and lazy-load the heavy 3D libraries in parallel
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js is ~1.5MB alone — load it as a separate chunk
          three: ['three'],
          // globe.gl and its dependencies
          globe: ['globe.gl', 'three-globe'],
          // Mapbox GL (~700KB)
          mapbox: ['mapbox-gl'],
          // Supabase client
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
