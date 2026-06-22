import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Share2, Link2, MousePointerClick, UserPlus, Handshake, Copy,
  CheckCircle2, Plus, ExternalLink, BarChart3,
} from 'lucide-react';
import { buildReferralUrl } from '@/lib/referrals';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_BADGE = {
  sent: 'bg-slate-100 text-slate-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  withdrawn: 'bg-amber-100 text-amber-700',
};

const OFFER_DEFAULTS = {
  candidate_email: '',
  candidate_name: '',
  target_type: 'job',
  target_id: '',
  target_label: '',
  offer_summary: '',
  status: 'sent',
  platform_attributed: true,
  attributed_link_code: '',
  notes: '',
};

/**
 * Recruiter-facing referral & offer analytics. Three views:
 *   - Overview: aggregated metrics across all the recruiter's links + offers.
 *   - Links: per-link cards with click/signup/offer counters and copy button.
 *   - Offers: append-only log of recruiter-recorded offers + a "Log an offer" form.
 */
export default function Referrals() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [offerForm, setOfferForm] = useState(OFFER_DEFAULTS);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerError, setOfferError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [recProfile, myLinks, myOffers, myJobs, myProjects] = await Promise.all([
        base44.entities.RecruiterProfile.filter({ created_by: me.email }),
        base44.entities.ReferralLink.filter({ recruiter_email: me.email }),
        base44.entities.OfferEvent.filter({ recruiter_email: me.email }),
        base44.entities.Job.filter({ created_by: me.email }),
        base44.entities.Project.filter({ created_by: me.email }),
      ]);
      setProfile(recProfile[0] || null);
      setLinks(sortByDateDesc(myLinks));
      setOffers(sortByDateDesc(myOffers));
      setJobs(myJobs);
      setProjects(myProjects);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => ({
    clicks: links.reduce((s, l) => s + (l.total_clicks ?? 0), 0),
    signups: links.reduce((s, l) => s + (l.total_signups ?? 0), 0),
    links: links.length,
    offers: offers.length,
    acceptedOffers: offers.filter(o => o.status === 'accepted').length,
  }), [links, offers]);

  const handleCopy = async (link) => {
    const url = buildReferralUrl(link.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);
    } catch {
      window.prompt('Copy this URL:', url);
    }
  };

  const handleToggleActive = async (link) => {
    const next = !link.is_active;
    await base44.entities.ReferralLink.update(link.id, { is_active: next });
    setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, is_active: next } : l)));
  };

  const handleTargetSelect = (value) => {
    // Format: <type>:<id>:<label>
    const [type, id, ...labelParts] = (value || '').split(':');
    setOfferForm((p) => ({
      ...p,
      target_type: type || 'job',
      target_id: id || '',
      target_label: labelParts.join(':') || '',
    }));
  };

  const submitOffer = async () => {
    if (!user) return;
    if (!offerForm.candidate_email.trim()) {
      setOfferError('Candidate email is required.');
      return;
    }
    setSavingOffer(true);
    setOfferError('');
    try {
      const linkRow = offerForm.attributed_link_code
        ? links.find((l) => l.code === offerForm.attributed_link_code)
        : null;
      const created = await base44.entities.OfferEvent.create({
        recruiter_email: user.email,
        recruiter_name: user.full_name ?? null,
        company: profile?.company ?? null,
        candidate_email: offerForm.candidate_email.trim().toLowerCase(),
        candidate_name: offerForm.candidate_name.trim() || null,
        target_type: offerForm.target_type,
        target_id: offerForm.target_id || null,
        target_label: offerForm.target_label || null,
        offer_summary: offerForm.offer_summary || null,
        status: offerForm.status,
        platform_attributed: !!offerForm.platform_attributed,
        attributed_link_id: linkRow?.id ?? null,
        attributed_link_code: offerForm.attributed_link_code || null,
        decision_date: offerForm.status === 'sent' ? null : new Date().toISOString(),
        notes: offerForm.notes || null,
      });
      setOffers((prev) => [created, ...prev]);
      // Bump per-link offer counter
      if (linkRow) {
        try {
          await base44.entities.ReferralLink.update(linkRow.id, {
            total_offers: (linkRow.total_offers ?? 0) + 1,
          });
          setLinks((prev) => prev.map(l => l.id === linkRow.id
            ? { ...l, total_offers: (l.total_offers ?? 0) + 1 }
            : l));
        } catch {
          /* analytics best-effort */
        }
      }
      setOfferForm(OFFER_DEFAULTS);
    } catch (e) {
      setOfferError(e?.message || 'Could not save offer.');
    } finally {
      setSavingOffer(false);
    }
  };

  const updateOfferStatus = async (offer, status) => {
    const patch = { status };
    if (status !== 'sent' && !offer.decision_date) {
      patch.decision_date = new Date().toISOString();
    }
    await base44.entities.OfferEvent.update(offer.id, patch);
    setOffers((prev) => prev.map(o => (o.id === offer.id ? { ...o, ...patch } : o)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#3D87AA] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EC] pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2E3F4F] flex items-center gap-2">
            <Share2 className="w-6 h-6 text-[#3D87AA]" /> Referrals & Offers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trackable share-links for your jobs and projects + a log of platform-assisted offers.
          </p>
        </div>

        {/* Aggregate cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard icon={Link2} label="Links" value={totals.links} />
          <MetricCard icon={MousePointerClick} label="Clicks" value={totals.clicks} />
          <MetricCard icon={UserPlus} label="Signups" value={totals.signups} />
          <MetricCard icon={Handshake} label="Offers" value={totals.offers} sub={`${totals.acceptedOffers} accepted`} />
        </div>

        <Tabs defaultValue="links" className="w-full">
          <TabsList className="bg-white border border-slate-200 mb-4">
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="links">
            {links.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="No links yet"
                body={'Open a job or project and tap "Share" to create a trackable link.'}
              />
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    onCopy={() => handleCopy(link)}
                    copied={copiedId === link.id}
                    onToggle={() => handleToggleActive(link)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <p className="font-semibold text-[#2E3F4F] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Log an offer
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Candidate email *</Label>
                  <Input
                    value={offerForm.candidate_email}
                    onChange={(e) => setOfferForm((p) => ({ ...p, candidate_email: e.target.value }))}
                    placeholder="candidate@email.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Candidate name</Label>
                  <Input
                    value={offerForm.candidate_name}
                    onChange={(e) => setOfferForm((p) => ({ ...p, candidate_name: e.target.value }))}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Target</Label>
                  <Select
                    value={offerForm.target_id ? `${offerForm.target_type}:${offerForm.target_id}:${offerForm.target_label}` : ''}
                    onValueChange={handleTargetSelect}
                  >
                    <SelectTrigger><SelectValue placeholder="Job or project (optional)" /></SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={`job-${j.id}`} value={`job:${j.id}:${j.title}`}>
                          Job — {j.title}
                        </SelectItem>
                      ))}
                      {projects.map((p) => (
                        <SelectItem key={`proj-${p.id}`} value={`project:${p.id}:${p.title}`}>
                          Project — {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Select
                    value={offerForm.status}
                    onValueChange={(v) => setOfferForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-slate-500">Offer summary</Label>
                  <Input
                    value={offerForm.offer_summary}
                    onChange={(e) => setOfferForm((p) => ({ ...p, offer_summary: e.target.value }))}
                    placeholder="e.g. £45k base + 10% bonus, full-time"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Attribute to link (optional)</Label>
                  <Select
                    value={offerForm.attributed_link_code || ''}
                    onValueChange={(v) => setOfferForm((p) => ({ ...p, attributed_link_code: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Which referral link?" /></SelectTrigger>
                    <SelectContent>
                      {links.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label || l.target_label || l.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={offerForm.platform_attributed}
                      onChange={(e) => setOfferForm((p) => ({ ...p, platform_attributed: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#5BA4C4] accent-[#5BA4C4]"
                    />
                    Platform-assisted
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <Textarea
                    rows={2}
                    value={offerForm.notes}
                    onChange={(e) => setOfferForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Private notes about this offer."
                    className="resize-none"
                  />
                </div>
              </div>
              {offerError && <p className="text-sm text-red-600 mt-2">{offerError}</p>}
              <div className="flex justify-end mt-3">
                <Button
                  onClick={submitOffer}
                  disabled={savingOffer}
                  className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
                >
                  {savingOffer ? 'Saving…' : 'Log offer'}
                </Button>
              </div>
            </div>

            {offers.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="No offers logged yet"
                body="Once you log an offer above, it'll show here with your full history."
              />
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    onStatus={(status) => updateOfferStatus(offer, status)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const MetricCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className="text-2xl font-bold text-[#2E3F4F] mt-1">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

const EmptyState = ({ icon: Icon, title, body }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
    <Icon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
    <p className="font-semibold text-[#2E3F4F]">{title}</p>
    <p className="text-sm text-slate-500 mt-1">{body}</p>
  </div>
);

const LinkRow = ({ link, onCopy, copied, onToggle }) => {
  const url = buildReferralUrl(link.code);
  return (
    <div className={`bg-white rounded-2xl border p-4 ${link.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[#2E3F4F]">{link.label || link.target_label || 'Untitled link'}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EAF5FB] text-[#3D87AA] uppercase">
              {link.target_type}
            </span>
            <button
              type="button"
              onClick={onToggle}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {link.is_active ? 'Active' : 'Disabled'}
            </button>
          </div>
          {link.target_label && link.label && (
            <p className="text-xs text-slate-500 mt-0.5">For: {link.target_label}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Created {format(new Date(link.created_date), 'MMM d, yyyy')}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCopy} className="flex-shrink-0">
          {copied ? (
            <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5 mr-1" /> Copy link</>
          )}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 text-xs text-slate-600 truncate bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">{url}</code>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#3D87AA] hover:underline flex items-center gap-1"
        >
          Preview <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <Stat icon={MousePointerClick} label="Clicks" value={link.total_clicks ?? 0} />
        <Stat icon={UserPlus} label="Signups" value={link.total_signups ?? 0} />
        <Stat icon={Handshake} label="Offers" value={link.total_offers ?? 0} />
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
    <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase tracking-wider">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <p className="font-bold text-[#2E3F4F]">{value}</p>
  </div>
);

const OfferRow = ({ offer, onStatus }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#2E3F4F] truncate">
          {offer.candidate_name || offer.candidate_email}
        </p>
        <p className="text-xs text-slate-500 truncate">{offer.candidate_email}</p>
        {offer.target_label && (
          <p className="text-xs text-slate-500 mt-1">
            <span className="uppercase font-semibold mr-1">{offer.target_type}</span>
            {offer.target_label}
          </p>
        )}
        {offer.offer_summary && (
          <p className="text-sm text-slate-700 mt-1">{offer.offer_summary}</p>
        )}
        {offer.notes && (
          <p className="text-xs text-slate-500 mt-1 italic">{offer.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-400">
          <span>{format(new Date(offer.created_date), 'MMM d, yyyy')}</span>
          {offer.platform_attributed && (
            <span className="px-2 py-0.5 rounded-full bg-[#EAF5FB] text-[#3D87AA] font-semibold">
              <BarChart3 className="w-3 h-3 inline mr-1" /> Platform-assisted
            </span>
          )}
          {offer.attributed_link_code && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {offer.attributed_link_code}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[offer.status]}`}>
          {offer.status}
        </span>
        <Select value={offer.status} onValueChange={onStatus}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

const sortByDateDesc = (rows) =>
  (rows || []).slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
