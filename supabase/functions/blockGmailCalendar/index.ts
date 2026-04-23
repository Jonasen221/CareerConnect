// Ports Base44 `blockGmailCalendar`: creates a "busy" calendar event so no
// one can book meetings in that slot.
//
// Deploy: `supabase functions deploy blockGmailCalendar`
// Secret required: GOOGLE_ACCESS_TOKEN (see addToGoogleCalendar for details).

import { corsHeaders } from '../_shared/cors.ts';
import { json, requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const {
      title,
      date,
      start_time,
      end_time,
      reason,
      access_token: callerToken,
    } = await req.json();

    const accessToken = callerToken ?? Deno.env.get('GOOGLE_ACCESS_TOKEN');
    if (!accessToken) {
      return json(
        { error: 'No Google access token configured. Set GOOGLE_ACCESS_TOKEN secret.' },
        500,
        corsHeaders
      );
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocal = (dateStr: string, timeStr: string) => {
      const d = new Date(`${dateStr}T${timeStr}:00`);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const event = {
      summary: `🔒 ${title || 'Blocked'}`,
      description: reason || 'Time blocked - unavailable for meetings',
      start: { dateTime: toLocal(date, start_time), timeZone: 'UTC' },
      end: { dateTime: toLocal(date, end_time), timeZone: 'UTC' },
      transparency: 'opaque',
      status: 'confirmed',
      visibility: 'private',
    };

    const calRes = await fetch(
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

    const calData = await calRes.json();
    if (!calRes.ok) {
      return json({ error: calData.error?.message }, 400, corsHeaders);
    }

    return json(
      { success: true, event_id: calData.id, html_link: calData.htmlLink },
      200,
      corsHeaders
    );
  } catch (error) {
    return json({ error: (error as Error).message }, 500, corsHeaders);
  }
});
