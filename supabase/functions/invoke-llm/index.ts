// Supabase Edge Function: invoke-llm
//
// Replaces Base44's built-in LLM endpoint. Accepts the same payload shape the
// rest of the app already sends via `base44.integrations.Core.InvokeLLM(...)`:
//
//   {
//     prompt: string,
//     response_json_schema?: object,   // if present, we ask the model to return JSON
//     system?: string,
//     model?: string,                  // override default
//     temperature?: number,
//   }
//
// Supports either OpenAI or Anthropic — whichever key is configured:
//
//   supabase secrets set OPENAI_API_KEY=sk-...
//   # or
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Optional overrides:
//   supabase secrets set LLM_DEFAULT_MODEL=gpt-4o-mini
//
// Deploy: `supabase functions deploy invoke-llm`

import { corsHeaders } from '../_shared/cors.ts';
import { json, requireUser } from '../_shared/auth.ts';

type Payload = {
  prompt: string;
  system?: string;
  response_json_schema?: Record<string, unknown>;
  model?: string;
  temperature?: number;
};

async function callOpenAI(payload: Payload, apiKey: string) {
  const model =
    payload.model ?? Deno.env.get('LLM_DEFAULT_MODEL') ?? 'gpt-4o-mini';

  const messages: Array<{ role: string; content: string }> = [];
  if (payload.system) messages.push({ role: 'system', content: payload.system });

  const wantsJson = !!payload.response_json_schema;
  const userPrompt = wantsJson
    ? `${payload.prompt}\n\nReturn a JSON object that matches this JSON schema:\n${JSON.stringify(
        payload.response_json_schema
      )}`
    : payload.prompt;
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: payload.temperature ?? 0.2,
      ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  if (wantsJson) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
  return { text };
}

async function callAnthropic(payload: Payload, apiKey: string) {
  const model =
    payload.model ?? Deno.env.get('LLM_DEFAULT_MODEL') ?? 'claude-3-5-sonnet-latest';

  const wantsJson = !!payload.response_json_schema;
  const userPrompt = wantsJson
    ? `${payload.prompt}\n\nReturn ONLY a JSON object (no prose) matching this schema:\n${JSON.stringify(
        payload.response_json_schema
      )}`
    : payload.prompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: payload.temperature ?? 0.2,
      ...(payload.system ? { system: payload.system } : {}),
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  if (wantsJson) {
    // Anthropic sometimes wraps JSON in ```json fences — strip them.
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { raw: text };
    }
  }
  return { text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const payload = (await req.json()) as Payload;
    if (!payload?.prompt) {
      return json({ error: 'Missing `prompt`' }, 400, corsHeaders);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    let result: unknown;
    if (openaiKey) {
      result = await callOpenAI(payload, openaiKey);
    } else if (anthropicKey) {
      result = await callAnthropic(payload, anthropicKey);
    } else {
      return json(
        {
          error:
            'No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY as a Supabase secret.',
        },
        500,
        corsHeaders
      );
    }

    return json(result, 200, corsHeaders);
  } catch (error) {
    return json({ error: (error as Error).message }, 500, corsHeaders);
  }
});
