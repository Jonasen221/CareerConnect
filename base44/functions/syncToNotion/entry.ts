import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { student_email, database_id } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('notion');

    // Fetch student profile
    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ created_by: student_email });
    if (!profiles.length) return Response.json({ error: 'Student not found' }, { status: 404 });
    const profile = profiles[0];

    // Fetch their matches and swipes for progress data
    const [matches, swipes, gameProgress] = await Promise.all([
      base44.asServiceRole.entities.Match.filter({ student_email }),
      base44.asServiceRole.entities.Swipe.filter({ created_by: student_email }),
      base44.asServiceRole.entities.GameProgress.filter({ created_by: student_email }),
    ]);

    const progress = gameProgress[0] || {};

    // Create or update a page in Notion database
    const properties = {
      Name: { title: [{ text: { content: profile.full_name || student_email } }] },
      Email: { email: student_email },
      University: { rich_text: [{ text: { content: profile.university || '' } }] },
      Major: { rich_text: [{ text: { content: profile.major || '' } }] },
      Status: { select: { name: profile.status || 'pending' } },
      Matches: { number: matches.length },
      Swipes: { number: swipes.length },
      XP: { number: progress.total_xp || 0 },
      Credits: { number: progress.credits || 0 },
      Level: { number: progress.level || 1 },
      'Graduation Year': { number: profile.graduation_year || null },
      Skills: { rich_text: [{ text: { content: (profile.skills || []).join(', ') } }] },
    };

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ parent: { database_id }, properties }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || 'Notion error' }, { status: 400 });

    return Response.json({ success: true, notion_page_id: data.id, url: data.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});