import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://cvcurkdtvpngsrybqzhn.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Create the client only if both URL and Key are available to prevent "supabaseUrl is required" error.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn('Supabase client not initialized. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.');
}

// Shared GUEST_ID for simplified persistence in this context. 
// In a full production app, this would be the authenticated user's ID.
export const GUEST_ID = '00000000-0000-0000-0000-000000000000';
