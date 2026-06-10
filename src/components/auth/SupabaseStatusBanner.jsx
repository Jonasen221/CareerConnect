import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useSupabaseReachability } from '@/lib/useSupabaseReachability';

function projectDashboardUrl() {
  const raw = import.meta.env.VITE_SUPABASE_URL || '';
  const m = String(raw).match(/https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  if (m) return `https://supabase.com/dashboard/project/${m[1]}`;
  return 'https://supabase.com/dashboard';
}

/** Warns when /auth/v1/health fails (common: paused free-tier project → 503). */
export default function SupabaseStatusBanner() {
  const reachability = useSupabaseReachability();

  if (!isSupabaseConfigured || reachability === 'checking' || reachability === 'skipped' || reachability === 'ok') {
    return null;
  }

  const dash = projectDashboardUrl();

  if (reachability === 'paused_or_down') {
    return (
      <div className="text-sm text-amber-950 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 space-y-2">
        <p>
          <strong>Your Supabase backend is not accepting traffic right now</strong> (the API returned an error). On the
          free plan, projects are often <strong>paused</strong> after a period of inactivity.
        </p>
        <p>
          <a href={dash} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3D87AA] underline">
            Open this project in the Supabase Dashboard
          </a>
          — if you see <strong>Restore project</strong> or <strong>Resume</strong>, use it and wait until the project is{' '}
          <strong>Active</strong>, then try again.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm text-amber-950 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 space-y-2">
      <p>
        <strong>Cannot reach your Supabase project</strong> from this browser. Check VPN, firewall, corporate network,
        or ad blockers. If those look fine, confirm the project is <strong>Active</strong> in the dashboard (not paused).
      </p>
      <p>
        <a href={dash} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3D87AA] underline">
          Open Supabase Dashboard
        </a>
      </p>
    </div>
  );
}
