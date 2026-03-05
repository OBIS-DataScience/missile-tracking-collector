import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase credentials. Create a .env file in the frontend/ folder with:\n' +
    'VITE_SUPABASE_URL=https://gobbelymdcxrrobciquy.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Fetch all missile events from Supabase, ordered by timestamp (newest first).
 * Uses the public read policy — no auth needed.
 */
export async function fetchMissileEvents() {
  const { data, error } = await supabase
    .from('missile_events')
    .select('*')
    .order('event_timestamp_utc', { ascending: false })

  if (error) {
    console.error('Supabase fetch error:', error)
    return []
  }

  return data
}

/**
 * Fetch Monte Carlo predicted attacks, ordered by highest probability first.
 * These are recalculated every 2 hours by the simulation engine.
 */
export async function fetchPredictions() {
  const { data, error } = await supabase
    .from('predicted_attacks')
    .select('*')
    .order('probability', { ascending: false })

  if (error) {
    console.error('Supabase predictions fetch error:', error)
    return []
  }

  return data
}
