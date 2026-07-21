// lib/services/supabase.js
// Supabase client — ready for integration
// Install: npm install @supabase/supabase-js
// Add to .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=your_url
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

// import { createClient } from '@supabase/supabase-js'
//
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Placeholder until Supabase is configured
export const supabase = null

export function getSupabaseClient() {
  if (!supabase) {
    console.warn('Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
    return null
  }
  return supabase
}
