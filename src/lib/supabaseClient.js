import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let unavailableReason = null
let hasLoggedUnavailableReason = false

function stringifyError(error) {
  return String(error?.message || error || '').trim()
}

export function isSupabaseNetworkError(error) {
  const text = stringifyError(error).toLowerCase()
  return text.includes('failed to fetch')
    || text.includes('fetch failed')
    || text.includes('networkerror')
    || text.includes('err_name_not_resolved')
    || text.includes('network request failed')
}

export function markSupabaseUnavailable(reason) {
  unavailableReason = stringifyError(reason) || 'Supabase is unavailable.'
  if (!hasLoggedUnavailableReason && unavailableReason) {
    hasLoggedUnavailableReason = true
    console.error(`Supabase disabled: ${unavailableReason}`)
  }
}

export function getSupabaseUnavailableReason() {
  return unavailableReason
}

export function isSupabaseAvailable() {
  return Boolean(supabase) && !unavailableReason
}

async function guardedFetch(input, init) {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (isSupabaseNetworkError(error)) markSupabaseUnavailable(error)
    throw error
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: guardedFetch,
      },
    })
  : null
