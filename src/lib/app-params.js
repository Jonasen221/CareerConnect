// Legacy Base44 app-params module. It's now a thin shim kept only so any stray
// import continues to resolve. All real configuration lives in Supabase env vars
// (see src/lib/supabaseClient.js).

export const appParams = {
  appId: import.meta.env.VITE_SUPABASE_URL ?? null,
  token: null,
  fromUrl: typeof window !== 'undefined' ? window.location.href : null,
  functionsVersion: null,
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : null,
};
