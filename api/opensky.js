/**
 * Vercel serverless function — proxies OpenSky Network API with OAuth2.
 *
 * Same logic as the Vite dev server plugin, but runs as a serverless
 * function in production. Handles the OAuth2 client_credentials flow
 * to get a token, then fetches live aircraft positions.
 *
 * Required env vars in Vercel project settings:
 *   OPENSKY_CLIENT_ID
 *   OPENSKY_CLIENT_SECRET
 */

// In-memory token cache — persists across warm invocations on the same
// Vercel instance, but each cold start will re-fetch a token
let cachedToken = null
let tokenExpiry = 0

export default async function handler(req, res) {
  const clientId = process.env.OPENSKY_CLIENT_ID
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'OpenSky credentials not configured' })
  }

  try {
    // Get or refresh the OAuth token
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
        console.error('[OpenSky] Token request failed:', tokenRes.status, err)
        return res.status(tokenRes.status).json({ error: 'OAuth token request failed' })
      }

      const tokenData = await tokenRes.json()
      cachedToken = tokenData.access_token
      // Refresh 5 minutes before expiry
      tokenExpiry = Date.now() + ((tokenData.expires_in - 300) * 1000)
    }

    const apiRes = await fetch('https://opensky-network.org/api/states/all', {
      headers: { Authorization: `Bearer ${cachedToken}` },
    })

    if (!apiRes.ok) {
      console.error('[OpenSky] API request failed:', apiRes.status)
      return res.status(apiRes.status).json({ error: `OpenSky API returned ${apiRes.status}` })
    }

    const data = await apiRes.json()

    // Cache for 30 seconds — aircraft positions update roughly every 10s
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=10')
    return res.status(200).json(data)
  } catch (err) {
    console.error('[OpenSky] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
