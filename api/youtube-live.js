/**
 * Vercel serverless function — proxies YouTube Data API search requests.
 *
 * In dev mode, the Vite plugin in vite.config.js handles /api/youtube-live.
 * In production (Vercel), this file takes over because Vite plugins don't
 * exist after the build. Vercel automatically turns files in the api/ folder
 * into serverless endpoints — so this becomes GET /api/youtube-live.
 *
 * The YOUTUBE_API_KEY env var must be set in Vercel project settings
 * (Settings -> Environment Variables). No VITE_ prefix needed here
 * because this runs server-side, not in the browser.
 */
export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' })
  }

  try {
    const { q = 'missile strike war live news', max = '5' } = req.query

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      eventType: 'live',
      q,
      maxResults: max,
      key: apiKey,
    })

    const apiRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    )
    const data = await apiRes.json()

    // Cache for 5 minutes to avoid burning through YouTube API quota
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return res.status(apiRes.ok ? 200 : apiRes.status).json(data)
  } catch (err) {
    console.error('[YouTube API] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
