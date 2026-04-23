// Ports Base44 `syncToNotion`: pushes a student's profile + stats into a
// Notion database as a new page.
//
// Deploy: `supabase functions deploy syncToNotion`
// Secret required:
//   NOTION_TOKEN  — an internal-integration secret.
//                   Create one at https://www.notion.so/my-integrations
//                   Share the target database with the integration.
//                   Set with: `supabase secrets set NOTION_TOKEN=secret_xxx`
//
// The Supabase service-role key is also required so this function can read
// the DB bypassing RLS. It's exposed automatically to deployed edge functions
// as SUPABASE_SERVICE_ROLE_KEY, no manual setup needed.

import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, json, requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const caller = await requireUser(req);
    if (!caller) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const { student_email, database_id } = await req.json();
    if (!student_email || !database_id) {
      return json(
        { error: 'student_email and database_id are required' },
        400,
        corsHeaders
      );
    }

    const notionToken = Deno.env.get('NOTION_TOKEN');
    if (!notionToken) {
      return json(
        { error: 'No Notion token configured. Set NOTION_TOKEN secret.' },
        500,
        corsHeaders
      );
    }

    const admin = adminClient();

    const { data: profiles, error: profErr } = await admin
      .from('student_profiles')
      .select('*')
      .eq('created_by', student_email)
      .limit(1);
    if (profErr) throw profErr;
    if (!profiles?.length) {
      return json({ error: 'Student not found' }, 404, corsHeaders);
    }
    const profile = profiles[0];

    const [{ data: matches }, { data: swipes }, { data: gameProgress }] =
      await Promise.all([
        admin.from('matches').select('id').eq('student_email', student_email),
        admin.from('swipes').select('id').eq('created_by', student_email),
        admin.from('game_progress').select('*').eq('created_by', student_email),
      ]);

    const progress = gameProgress?.[0] ?? {};

    const properties: Record<string, unknown> = {
      Name: {
        title: [
          { text: { content: profile.full_name || student_email } },
        ],
      },
      Email: { email: student_email },
      University: {
        rich_text: [{ text: { content: profile.university || '' } }],
      },
      Major: {
        rich_text: [{ text: { content: profile.major || '' } }],
      },
      Status: { select: { name: profile.status || 'pending' } },
      Matches: { number: matches?.length ?? 0 },
      Swipes: { number: swipes?.length ?? 0 },
      XP: { number: progress.total_xp || 0 },
      Credits: { number: progress.credits || 0 },
      Level: { number: progress.level || 1 },
      'Graduation Year': { number: profile.graduation_year || null },
      Skills: {
        rich_text: [
          { text: { content: (profile.skills || []).join(', ') } },
        ],
      },
    };

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ parent: { database_id }, properties }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json(
        { error: data.message || 'Notion error' },
        400,
        corsHeaders
      );
    }

    return json(
      { success: true, notion_page_id: data.id, url: data.url },
      200,
      corsHeaders
    );
  } catch (error) {
    return json({ error: (error as Error).message }, 500, corsHeaders);
  }
});
