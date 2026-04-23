// Shared CORS headers so the browser can invoke edge functions from the app.
// Supabase's `functions.invoke()` client handles these automatically, but
// setting them explicitly makes the functions usable from anywhere.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
