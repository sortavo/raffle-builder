// Supabase client - shared between web and mobile
// The anon key is public by design - security comes from RLS policies
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default production values
const DEFAULT_SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk';

export type { Database };
export type SupabaseClientType = SupabaseClient<Database>;

// Configuration type for platform-specific options
export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  storage?: Storage;
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

// Create client with platform-specific config
export function createSupabaseClient(config: SupabaseConfig = {}): SupabaseClientType {
  const url = config.url || DEFAULT_SUPABASE_URL;
  const anonKey = config.anonKey || DEFAULT_SUPABASE_ANON_KEY;

  return createClient<Database>(url, anonKey, {
    auth: {
      storage: config.storage,
      persistSession: config.persistSession ?? true,
      autoRefreshToken: config.autoRefreshToken ?? true,
    }
  });
}

// Default client for web (uses localStorage)
let _supabase: SupabaseClientType | null = null;

export function getSupabase(): SupabaseClientType {
  if (!_supabase) {
    // Check if we're in a browser environment
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
    _supabase = createSupabaseClient({ storage });
  }
  return _supabase;
}

// For backwards compatibility - direct export
export const supabase = typeof window !== 'undefined'
  ? createSupabaseClient({ storage: window.localStorage })
  : createSupabaseClient();
