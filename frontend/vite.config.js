import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Custom Vite plugin that creates a server-side proxy for the OpenSky API.
 *
 * Why a proxy? The OpenSky API requires OAuth2 credentials (client ID + secret).
 * If we put those in frontend code, anyone visiting the site could steal them.
 * Instead, the browser calls our own dev server at /api/opensky, and this plugin
 * handles the OAuth token exchange + API call on the server side. The credentials
 * never leave the server.
 *
 * Flow:
 *   Browser → GET /api/opensky → Vite server → (gets OAuth token) → calls OpenSky API → returns data
 */
function openSkyProxyPlugin() {
  let cachedToken = null
  let tokenExpiry = 0

  return {
    name: 'opensky-proxy',
    configureServer(server) {
      server.middlewares.use('/api/opensky', async (req, res) => {
        const env = loadEnv('', process.cwd(), '')
        const clientId = env.OPENSKY_CLIENT_ID
        const clientSecret = env.OPENSKY_CLIENT_SECRET

        if (!clientId || !clientSecret) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'OpenSky credentials not configured in .env' }))
          return
        }

        try {
          // Get or refresh the OAuth token (valid for 30 min, we refresh at 25 min)
          if (!cachedToken || Date.now() > tokenExpiry) {
            const tokenRes = await fetch(
              'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret,
                }),
              }
            )

            if (!tokenRes.ok) {
              const err = await tokenRes.text()
              console.error('[OpenSky Proxy] Token request failed:', tokenRes.status, err)
              res.writeHead(tokenRes.status, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'OAuth token request failed' }))
              return
            }

            const tokenData = await tokenRes.json()
            cachedToken = tokenData.access_token
            // Refresh 5 minutes before expiry
            tokenExpiry = Date.now() + ((tokenData.expires_in - 300) * 1000)
            console.log('[OpenSky Proxy] Got fresh OAuth token')
          }

          // Fetch aircraft data with the token
          const apiRes = await fetch('https://opensky-network.org/api/states/all', {
            headers: { Authorization: `Bearer ${cachedToken}` },
          })

          if (!apiRes.ok) {
            console.error('[OpenSky Proxy] API request failed:', apiRes.status)
            res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `OpenSky API returned ${apiRes.status}` }))
            return
          }

          const data = await apiRes.json()
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30',
          })
          res.end(JSON.stringify(data))
        } catch (err) {
          console.error('[OpenSky Proxy] Error:', err.message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

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
  plugins: [react(), openSkyProxyPlugin(), youTubeProxyPlugin()],
  server: {
    port: 3000,
    open: true,
  },
})
