import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

/** Maps low-level fetch errors into actionable copy for login/signup. */
export function formatAuthFlowError(err) {
  const msg = err?.message || String(err);
  const network =
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg) ||
    err?.name === 'TypeError';
  if (network) {
    return (
      <>
        <strong>Could not reach Supabase.</strong>{' '}
        {isSupabaseConfigured ? (
          <>
            Most often this is a <strong>paused</strong> Supabase project (free tier) or a temporary outage. Open the
            Supabase Dashboard and <strong>restore / resume</strong> the project until it shows <strong>Active</strong>.
            Also check VPN, firewall, and ad blockers if it is already active.
          </>
        ) : (
          <>
            Create <code className="text-xs bg-red-100 px-1 rounded">.env.local</code> from{' '}
            <code className="text-xs bg-red-100 px-1 rounded">.env.example</code>, set{' '}
            <code className="text-xs bg-red-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs bg-red-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, then restart{' '}
            <code className="text-xs bg-red-100 px-1 rounded">npm run dev</code>.
          </>
        )}
      </>
    );
  }
  return msg;
}
