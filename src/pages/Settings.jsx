import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Users, ShieldCheck, ArrowLeft } from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'student', label: 'University / college students' },
  { value: 'high_school', label: 'High school students' },
  { value: 'recruiter', label: 'Recruiters / hiring teams' },
];

const DEFAULT_AUDIENCE = ['student', 'high_school', 'recruiter'];

const loadProfile = async (email) => {
  const [studentRows, recruiterRows] = await Promise.all([
    base44.entities.StudentProfile.filter({ created_by: email }),
    base44.entities.RecruiterProfile.filter({ created_by: email }),
  ]);
  if (studentRows[0]) return { profile: studentRows[0], kind: 'student' };
  if (recruiterRows[0]) return { profile: recruiterRows[0], kind: 'recruiter' };
  return { profile: null, kind: null };
};

export default function Settings() {
  const navigate = useNavigate();
  const [, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [kind, setKind] = useState(null);
  const [optedOut, setOptedOut] = useState(false);
  const [audience, setAudience] = useState(DEFAULT_AUDIENCE);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const { profile: p, kind: k } = await loadProfile(u.email);
      setProfile(p);
      setKind(k);
      setOptedOut(!!p?.connect_opt_out);
      const aud = Array.isArray(p?.connect_audience) && p.connect_audience.length > 0
        ? p.connect_audience
        : DEFAULT_AUDIENCE;
      setAudience(aud);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    reload();
  }, [reload]);

  const entity = useMemo(() => (
    kind === 'student'
      ? base44.entities.StudentProfile
      : kind === 'recruiter'
        ? base44.entities.RecruiterProfile
        : null
  ), [kind]);

  const toggleAudience = (value) => {
    setAudience((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return [...prev, value];
    });
  };

  const handleSave = async () => {
    if (!entity || !profile) return;
    setSaving(true);
    setError('');
    try {
      await entity.update(profile.id, {
        connect_opt_out: optedOut,
        connect_audience: audience,
      });
      setSavedAt(new Date());
      await reload();
    } catch (e) {
      setError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading settings…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md text-center space-y-3">
          <p className="text-slate-600">
            Finish onboarding before opening settings.
          </p>
          <Button onClick={() => navigate('/Onboarding')} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
            Continue onboarding
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" /> Settings
          </h1>
          <p className="text-white/80 mt-1">
            Control how you show up across CareerConnect.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-10 pb-12 space-y-5">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#EAF5FB] rounded-2xl flex items-center justify-center text-[#3D87AA]">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">Connect deck visibility</p>
              <p className="text-sm text-slate-500">
                When ON, you appear in the swipe deck on the Connect page. Turn this OFF if
                you want to use the platform without being discoverable to peers.
              </p>
            </div>
            <Switch
              checked={!optedOut}
              onCheckedChange={(v) => setOptedOut(!v)}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-4">
          <div>
            <p className="font-semibold text-slate-800">Who do you want to meet?</p>
            <p className="text-sm text-slate-500">
              The Connect deck only surfaces people whose audience includes you AND who
              match one of the audiences you pick here.
            </p>
          </div>
          <div className="space-y-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
              >
                <span className="text-sm text-slate-700">{opt.label}</span>
                <Switch
                  checked={audience.includes(opt.value)}
                  onCheckedChange={() => toggleAudience(opt.value)}
                />
              </label>
            ))}
          </div>
          {audience.length === 0 && (
            <p className="text-xs text-amber-700">
              You haven't picked any audiences — the deck will be empty until you pick at least one.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <Label className="text-sm font-semibold text-slate-700">Account</Label>
          </div>
          <p className="text-xs text-slate-500">
            Signed in as <span className="font-mono">{profile.email || profile.created_by}</span>.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : '\u00A0'}
          </p>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
