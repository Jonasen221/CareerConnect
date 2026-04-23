// Ports the old Base44 `addToGoogleCalendar` function to a Supabase Edge Function.
//
// Deploy: `supabase functions deploy addToGoogleCalendar`
// Secrets it uses:
//   GOOGLE_ACCESS_TOKEN  — a valid OAuth access token with the
//                          https://www.googleapis.com/auth/calendar scope.
//                          Set with: `supabase secrets set GOOGLE_ACCESS_TOKEN=ya29.xxx`
//
// The Base44 version used a built-in connector that refreshed tokens for us.
// With Supabase you have two upgrade paths:
//
//   Option A (simple, shared calendar): keep using GOOGLE_ACCESS_TOKEN secret.
//     Events land on whichever Google account the token belongs to. Tokens
//     expire in ~1h so for anything beyond testing you'll want to also store
//     a refresh token and exchange it here — see TODO below.
//
//   Option B (per-user): enable Supabase's Google auth provider, request the
//     calendar scope, and read `provider_token` from the client session. Pass
//     it in the request body and use it instead of the secret.

import { corsHeaders } from '../_shared/cors.ts';
import { json, requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const {
      title,
      description,
      date,
      time,
      location,
      duration_minutes = 60,
      block_time = false,
      // Optional: caller can pass its own token (Option B above).
      access_token: callerToken,
    } = await req.json();

    // TODO: swap this for a short-lived token minted from a stored refresh
    // token (e.g. via Google's token endpoint) so it doesn't expire.
    const accessToken = callerToken ?? Deno.env.get('GOOGLE_ACCESS_TOKEN');
    if (!accessToken) {
      return json(
        { error: 'No Google access token configured. Set GOOGLE_ACCESS_TOKEN secret.' },
        500,
        corsHeaders
      );
    }

    const startStr = date && time ? `${date}T${time}:00` : `${date}T09:00:00`;
    const startDate = new Date(startStr);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const event = {
      summary: block_time ? `[Busy] ${title}` : title,
      description: description || '',
      location: location || '',
      start: { dateTime: toLocal(startDate), timeZone: 'UTC' },
      end: { dateTime: toLocal(endDate), timeZone: 'UTC' },
      ...(block_time ? { transparency: 'opaque', status: 'confirmed' } : {}),
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return json(
        { error: data.error?.message || 'Calendar error' },
        400,
        corsHeaders
      );
    }

    return json(
      { success: true, event_id: data.id, html_link: data.htmlLink },
      200,
      corsHeaders
    );
  } catch (error) {
    return json({ error: (error as Error).message }, 500, corsHeaders);
  }
});
