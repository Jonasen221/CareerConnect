// Verifies the caller is an authenticated Supabase user by validating the
// Bearer token in the Authorization header. Returns the user record or null.
//
// Functions should call this at the top, exactly like the old Base44 flow:
//   const user = await requireUser(req);
//   if (!user) return json({ error: 'Unauthorized' }, 401);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Service-role client for reading/writing the DB from inside an edge function,
// bypassing RLS. Use sparingly.
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
