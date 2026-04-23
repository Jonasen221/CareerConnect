// Supabase Edge Function: extract-data
//
// Replaces Base44's built-in "extract data from uploaded file" endpoint.
// Expected payload (matches `base44.integrations.Core.ExtractDataFromUploadedFile`):
//
//   {
//     file_url: string,                // public URL of the uploaded file
//     json_schema: object,             // JSON schema describing the fields we want
//   }
//
// Response (matches the old shape used in the app):
//
//   { status: 'success' | 'error', output: <object matching json_schema> | null }
//
// How it works:
//   1. Download the file from `file_url`.
//   2. Extract raw text. PDFs and images are sent straight to the LLM as text
//      if they're already text; otherwise we pass the URL through to OpenAI's
//      vision endpoint (works for PDFs + images). For plain-text files we just
//      read them.
//   3. Ask the LLM to return JSON matching `json_schema`.
//
// Secrets required: OPENAI_API_KEY   (Anthropic works for text but not files.)
// Deploy: `supabase functions deploy extract-data`

import { corsHeaders } from '../_shared/cors.ts';
import { json, requireUser } from '../_shared/auth.ts';

type Payload = {
  file_url: string;
  json_schema: Record<string, unknown>;
};

async function extractWithOpenAI(payload: Payload, apiKey: string) {
  const model = Deno.env.get('LLM_DEFAULT_MODEL') ?? 'gpt-4o-mini';

  // Try to fetch the file first so we can detect type and optionally inline
  // the text content (keeps costs down for plain-text / markdown).
  const fileRes = await fetch(payload.file_url);
  if (!fileRes.ok) {
    throw new Error(`Failed to fetch file (${fileRes.status})`);
  }
  const contentType = (fileRes.headers.get('content-type') ?? '').toLowerCase();

  // For plain text / markdown / JSON we can inline the content.
  const isText =
    contentType.startsWith('text/') ||
    contentType.includes('json') ||
    contentType.includes('markdown');

  const baseInstruction = `Extract the requested fields from the document and return ONLY a JSON object that matches this schema:\n${JSON.stringify(
    payload.json_schema
  )}`;

  let messages: Array<Record<string, unknown>>;

  if (isText) {
    const text = await fileRes.text();
    messages = [
      {
        role: 'user',
        content: `${baseInstruction}\n\n--- DOCUMENT ---\n${text}`,
      },
    ];
  } else {
    // PDF / image / docx — let OpenAI fetch it via URL. GPT-4o vision handles
    // both images and PDFs out of the box when passed as an image_url part.
    messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: baseInstruction },
          { type: 'image_url', image_url: { url: payload.file_url } },
        ],
      },
    ];
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Model did not return valid JSON');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const payload = (await req.json()) as Payload;
    if (!payload?.file_url || !payload?.json_schema) {
      return json(
        { status: 'error', output: null, error: 'file_url and json_schema are required' },
        400,
        corsHeaders
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return json(
        {
          status: 'error',
          output: null,
          error:
            'OPENAI_API_KEY is not configured. Set it with: supabase secrets set OPENAI_API_KEY=sk-...',
        },
        500,
        corsHeaders
      );
    }

    const output = await extractWithOpenAI(payload, openaiKey);
    return json({ status: 'success', output }, 200, corsHeaders);
  } catch (error) {
    return json(
      { status: 'error', output: null, error: (error as Error).message },
      500,
      corsHeaders
    );
  }
});
