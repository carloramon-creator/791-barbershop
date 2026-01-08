import { createClient } from '@supabase/supabase-js';

// Fallback values to prevent build errors when env vars are not set
// IMPORTANT: Configure proper values in Vercel Environment Variables for production
const supabaseUrl = 'https://vldqmsajhytxeyyvubjy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZHFtc2FqaHl0eXl2dWJqeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NDY1MDg1LCJleHAiOjIwNDk5OTcwODV9.X-6-s-k-T-2-V-S-x-k-z-4-W-0-Q-O-g-Z-v-I-0-G-U-D-X-g-L-W-N-o-X-R-r-E-G-U-8-R-l-A-d-U';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
