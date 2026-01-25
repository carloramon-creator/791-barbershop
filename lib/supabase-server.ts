import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

const DEFAULT_URL = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const DEFAULT_KEY = 'sb_publishable_lXhPQ7Wm-pio1CZbPXChmw_ebrxgveT';
const SERVICE_KEY = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';

export const supabase = async () => {
  const headerList = await headers();
  const authHeader = headerList.get('Authorization');

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
      });
    }
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch { }
      }
    }
  });
};

// Função factory para obter instância administrativa limpa
export const getSupabaseAdmin = () => {
  return createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).trim(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || SERVICE_KEY).trim(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
