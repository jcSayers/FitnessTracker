import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient: SupabaseClient | null = null;

export function initializeSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration is missing. Check your environment variables.');
  }

  supabaseClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
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
