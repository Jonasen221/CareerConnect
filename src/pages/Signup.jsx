import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { formatAuthFlowError } from '@/lib/formatAuthFlowError';
import SupabaseStatusBanner from '@/components/auth/SupabaseStatusBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Signup() {
  const { signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signUpWithPassword(email, password, { full_name: fullName });
      // When email confirmation is enabled in Supabase, `session` is null until
      // the user clicks the confirmation link.
      if (!res?.session) {
        setConfirmationSent(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(formatAuthFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white shadow-sm border border-slate-100 rounded-2xl p-8 text-center space-y-3">
          <h1 className="text-2xl font-semibold text-slate-800">Check your email</h1>
          <p className="text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>. Click it to finish
            creating your account, then come back and sign in.
          </p>
          <Link to="/login" className="text-[#3D87AA] font-semibold hover:underline text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-sm border border-slate-100 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 mx-auto bg-[#5BA4C4] rounded-xl flex items-center justify-center mb-3">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Create your account</h1>
          <p className="text-sm text-slate-500">Join CareerConnect</p>
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
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
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
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#3D87AA] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
