import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient: SupabaseClient | null = null;

export function initializeSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration is missing. Check your environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  }

  // Use service role key for server-side operations to bypass RLS policies
  supabaseClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  return supabaseClient;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
}

// Initialize on module load
try {
  initializeSupabase();
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
}
