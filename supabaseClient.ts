
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Only initialize if keys are present to prevent "supabaseUrl is required" error
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Shared Guest ID for demo/simple persistence
export const GUEST_ID = '00000000-0000-0000-0000-000000000000';
