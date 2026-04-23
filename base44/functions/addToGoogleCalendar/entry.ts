import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, date, time, location, duration_minutes = 60, block_time = false } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Build start datetime
    const startStr = date && time ? `${date}T${time}:00` : `${date}T09:00:00`;
    const startDate = new Date(startStr);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const toLocal = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const event = {
      summary: block_time ? `[Busy] ${title}` : title,
      description: description || '',
      location: location || '',
      start: { dateTime: toLocal(startDate), timeZone: 'UTC' },
      end: { dateTime: toLocal(endDate), timeZone: 'UTC' },
      ...(block_time ? { transparency: 'opaque', status: 'confirmed' } : {}),
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.error?.message || 'Calendar error' }, { status: 400 });

    return Response.json({ success: true, event_id: data.id, html_link: data.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});