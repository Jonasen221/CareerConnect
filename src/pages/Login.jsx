import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const { signInWithPassword, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Already signed in: leave login (stops full-page "bounce" and odd next=login loops)
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
      await signInWithPassword(email, password);
      // Post-sign-in navigation is handled by the useEffect that watches
      // `isAuthenticated` (so `?next=`, off-site, and /login are parsed safely).
    } catch (err) {
      setError(err.message || 'Failed to sign in');
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
          <h1 className="text-2xl font-semibold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-500">Sign in to CareerConnect</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Don&rsquo;t have an account?{' '}
          <Link to="/signup" className="text-[#3D87AA] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
