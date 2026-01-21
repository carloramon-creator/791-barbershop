import { createBrowserClient } from '@supabase/ssr';

// Valores padrão para evitar erros de build
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfbiwvhxztejuzcasclv.supabase.co').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODM4NjUsImV4cCI6MjA4Mjc1OTg2NX0.DcGhBBvGlj_sipsryHgojiSZoLSVggqPFjLG7hj2OY4k').trim();

export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
