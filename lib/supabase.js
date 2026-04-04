/**
 * Supabase client — community votes & tips.
 *
 * Required environment variables (add to Vercel + .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL      — e.g. https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — long JWT from Supabase Settings > API
 *
 * The NEXT_PUBLIC_ prefix makes these available in the browser too,
 * which is safe with Supabase's Row Level Security (RLS) enabled.
 * Without these vars the app runs normally — community features are hidden.
 */

import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;
export const isSupabaseEnabled = !!(url && key);
