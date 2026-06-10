import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Ping Auth /health so we can tell “paused project / 503” apart from bad password, etc.
 */
export function useSupabaseReachability() {
  const [reachability, setReachability] = useState(
    isSupabaseConfigured ? 'checking' : 'skipped'
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReachability('skipped');
      return;
    }
    const base = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    if (!base) {
      setReachability('skipped');
      return;
    }

    const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    let alive = true;
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 10000);

    fetch(`${base}/auth/v1/health`, {
      signal: ac.signal,
      headers: anon ? { apikey: anon } : {},
    })
      .then((res) => {
        if (!alive) return;
        if (res.ok) setReachability('ok');
        else if (res.status === 503 || res.status === 502 || res.status === 521 || res.status === 522) {
          setReachability('paused_or_down');
        } else {
          setReachability('bad_status');
        }
      })
      .catch(() => {
        if (alive) setReachability('unreachable');
      })
      .finally(() => clearTimeout(tid));

    return () => {
      alive = false;
      ac.abort();
      clearTimeout(tid);
    };
  }, []);

  return reachability;
}
