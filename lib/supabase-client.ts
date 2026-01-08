import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent build errors when env vars are not set
// IMPORTANT: Configure proper values in Vercel Environment Variables for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vldqmsajhytxeyyvubjy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
