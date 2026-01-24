// Supabase client with hardcoded values for production reliability
// The anon key is public by design - security comes from RLS policies
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});