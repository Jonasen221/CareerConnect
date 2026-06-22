import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { formatAuthFlowError } from '@/lib/formatAuthFlowError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { isSupabaseConfigured } from '@/lib/supabaseClient';
import SupabaseStatusBanner from '@/components/auth/SupabaseStatusBanner';
import { stashPendingReferral } from '@/lib/referrals';

export default function Login() {
  const { signInOrSignUp, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // F6: stash referral codes that arrive as ?ref=ABC1234 so the post-signup
  // attribution hook in AuthContext can pick them up.
  useEffect(() => {
    const code = params.get('ref');
    if (code) stashPendingReferral(code);
  }, [params]);

  // Already signed in: bounce out of the login page safely.
  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;
    const rawNext = params.get('next');
    if (rawNext) {
      try {
        const u = new URL(rawNext, window.location.origin);
        if (u.origin !== window.location.origin) {
          navigate('/', { replace: true });
          return;
        }
        if (u.pathname === '/login' || u.pathname === '/signup') {
          navigate('/', { replace: true });
          return;
        }
        navigate(`${u.pathname}${u.search}${u.hash}`, { replace: true });
        return;
      } catch {
        navigate('/', { replace: true });
        return;
      }
    }
    navigate('/', { replace: true });
  }, [isLoadingAuth, isAuthenticated, params, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInOrSignUp(email, fullName);
      // Post-sign-in navigation is handled by the useEffect above that
      // watches `isAuthenticated`.
    } catch (err) {
      setError(formatAuthFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-sm border border-slate-100 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 mx-auto bg-[#5BA4C4] rounded-xl flex items-center justify-center mb-3">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Jump in</h1>
          <p className="text-sm text-slate-500">
            Free for everyone — no password required.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>Supabase is not configured.</strong> Copy <code className="text-xs">.env.example</code> to{' '}
            <code className="text-xs">.env.local</code>, add your project URL and anon key, then restart the dev server.
          </div>
        )}

        <SupabaseStatusBanner />

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Your name</Label>
            <Input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          New here? Just enter your name and email — we'll set up your account
          automatically.
        </p>
      </div>
    </div>
  );
}
