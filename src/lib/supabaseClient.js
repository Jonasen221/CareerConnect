import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when real project env vars are present (not relying on local-dev fallbacks). */
export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' &&
    /^https?:\/\//.test(supabaseUrl.trim()) &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 20
);

if (!isSupabaseConfigured) {
  // Keep this as a warning rather than throwing, so the build doesn't break when
  // the envs haven't been configured yet. Auth/DB calls will fail loudly at runtime.
  console.warn(
    '[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are missing or invalid. ' +
      'Copy .env.example to .env.local, add your Supabase project URL + anon key.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
