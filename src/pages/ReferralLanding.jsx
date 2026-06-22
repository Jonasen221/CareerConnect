import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, FolderKanban, User, Sparkles } from 'lucide-react';
import {
  getReferralLinkByCode,
  recordReferralClick,
  stashPendingReferral,
} from '@/lib/referrals';

const ICONS = {
  job: Briefcase,
  project: FolderKanban,
  profile: User,
};

/**
 * Public landing page for /r/:code. Renders a small teaser for the underlying
 * target (job, project, or profile) and a signup CTA. If the user is already
 * authenticated, we redirect them straight to the underlying object.
 */
export default function ReferralLanding() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getReferralLinkByCode(code);
        if (cancelled) return;
        if (!found || !found.is_active) {
          setError('This referral link is no longer active.');
          setLoading(false);
          return;
        }
        setLink(found);

        // Stash the code so a signup-then-attribution dance works.
        stashPendingReferral(code);

        // Best-effort click record. We do this for both authenticated and
        // anonymous viewers because both are interesting in the analytics
        // panel.
        let visitorEmail = null;
        try {
          const session = await base44.auth.isAuthenticated();
          if (session) {
            const me = await base44.auth.me();
            visitorEmail = me?.email ?? null;
          }
        } catch {
          /* unauth — leave visitorEmail null */
        }
        recordReferralClick({ link: found, visitorEmail });

        // Authenticated visitors skip the teaser and go straight to the
        // destination. Logged-out visitors stay on this page to see the
        // teaser + signup CTA.
        if (visitorEmail) {
          navigateToTarget(navigate, found);
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md text-center space-y-3">
          <p className="font-semibold text-slate-800">Link unavailable</p>
          <p className="text-sm text-slate-500">{error || 'We couldn\'t find that link.'}</p>
          <Link to="/">
            <Button className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = ICONS[link.target_type] ?? Sparkles;
  const kindLabel =
    link.target_type === 'job' ? 'Job opportunity' :
      link.target_type === 'project' ? 'Project' :
        link.target_type === 'profile' ? 'Profile' : 'Opportunity';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAF5FB] via-white to-[#EAF5FB] flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#5BA4C4]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A8D4E8]/15 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#5BA4C4] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#5BA4C4]/30">
            <span className="text-white font-bold text-lg">CC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CareerConnect</h1>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3D87AA]">
            <Icon className="w-4 h-4" /> {kindLabel}
            {link.label && <span className="ml-auto text-slate-400 font-normal normal-case">via {link.label}</span>}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {link.target_label || 'You\'ve been invited to check this out'}
            </h2>
            {(link.company || link.recruiter_name) && (
              <p className="text-sm text-slate-500 mt-1">
                {link.recruiter_name && <span>Shared by {link.recruiter_name}</span>}
                {link.recruiter_name && link.company && <span> · </span>}
                {link.company && <span>{link.company}</span>}
              </p>
            )}
          </div>

          {link.target_summary && (
            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line">
              {link.target_summary}
            </p>
          )}

          <div className="rounded-2xl bg-[#EAF5FB] border border-[#A8D4E8]/40 p-4 space-y-2">
            <p className="text-sm font-semibold text-[#2d5f7a]">
              Sign up to view the full details.
            </p>
            <p className="text-xs text-slate-600">
              CareerConnect is free — name + email is all you need. We'll attribute
              your signup to this invite so the sender can follow up.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/login?ref=${encodeURIComponent(code)}`} className="flex-1">
              <Button className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                Sign up to continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Just browsing
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Referral code <code className="font-mono text-slate-500">{code}</code>
        </p>
      </div>
    </div>
  );
}

function navigateToTarget(navigate, link) {
  // For logged-in visitors, deep-link to the most useful destination. We
  // intentionally append ?ref=<code> in case downstream pages want to surface
  // the attribution.
  const params = new URLSearchParams({ ref: link.code }).toString();
  if (link.target_type === 'job') {
    navigate(`/JobSwipe?${params}`);
    return;
  }
  if (link.target_type === 'project' && link.target_id) {
    navigate(`/Projects?id=${encodeURIComponent(link.target_id)}&${params}`);
    return;
  }
  navigate(`/?${params}`);
}
