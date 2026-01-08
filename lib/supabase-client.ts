import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent build errors when env vars are not set
// IMPORTANT: Configure proper values in Vercel Environment Variables for production
const supabaseUrl = 'https://mfb1wvhxztejuzcasclv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYjF3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODM4NjUsImV4cCI6MjA4Mjc1OTg2NX0.DcGhBBvGlj_sipsryHgojiSZoLSVggqPFjLG7hj2OY4k';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
