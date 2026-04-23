import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Creates a "busy/blocked" calendar event so no one can book meetings during that slot
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, date, start_time, end_time, reason } = await req.json();

    const calToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const pad = (n) => String(n).padStart(2, '0');
    const toLocal = (dateStr, timeStr) => {
      const d = new Date(`${dateStr}T${timeStr}:00`);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${calToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const calData = await calRes.json();
    if (!calRes.ok) return Response.json({ error: calData.error?.message }, { status: 400 });

    return Response.json({ success: true, event_id: calData.id, html_link: calData.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});