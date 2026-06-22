import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2, Share2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildReferralUrl, createReferralLink } from '@/lib/referrals';

/**
 * Modal for creating + copying referral links to a single target (job / project
 * / profile). Reuses existing links when found so a recruiter can't accidentally
 * spawn a forest of duplicates while still keeping the "create a fresh one with
 * a custom label" path available.
 */
export default function ShareLinkModal({
  open,
  onOpenChange,
  target,        // { type: 'job'|'project'|'profile', id, label, summary }
  recruiter,     // { email, full_name, company }
}) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !target?.id || !recruiter?.email) return;
    setLoading(true);
    setError('');
    base44.entities.ReferralLink.filter({
      recruiter_email: recruiter.email,
      target_type: target.type,
      target_id: target.id,
    })
      .then((rows) => setLinks(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e?.message || 'Could not load links.'))
      .finally(() => setLoading(false));
  }, [open, target?.id, target?.type, recruiter?.email]);

  const handleCreate = async () => {
    if (!recruiter?.email || !target?.id) return;
    setCreating(true);
    setError('');
    try {
      const row = await createReferralLink({
        recruiter,
        target,
        label: label.trim() || null,
      });
      setLinks((prev) => [row, ...prev]);
      setLabel('');
    } catch (e) {
      setError(e?.message || 'Could not create link.');
    } finally {
      setCreating(false);
    }
  };

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
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, is_active: next } : l)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#3D87AA]" /> Share this {target?.type ?? 'item'}
          </DialogTitle>
          <DialogDescription>
            Every click is counted. New signups that arrive via this link are
            attributed to it in the analytics panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{target?.type}</p>
            <p className="font-semibold text-slate-800">{target?.label ?? '—'}</p>
            {target?.summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{target.summary}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <Label className="text-xs text-slate-500">Create a new link (optional label)</Label>
            <div className="flex gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. LinkedIn outbound, conference flyer…"
              />
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-400 text-center py-4">Loading links…</p>}

          {!loading && links.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              No links yet — create your first above.
            </p>
          )}

          {!loading && links.length > 0 && (
            <div className="space-y-2">
              {links.map((link) => {
                const url = buildReferralUrl(link.code);
                return (
                  <div
                    key={link.id}
                    className={`rounded-2xl border p-3 ${
                      link.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {link.label || 'Untitled link'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(link)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          link.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-slate-600 truncate bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                        {url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(link)}
                        className="flex-shrink-0"
                      >
                        {copiedId === link.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      <span><strong className="text-slate-800">{link.total_clicks ?? 0}</strong> clicks</span>
                      <span><strong className="text-slate-800">{link.total_signups ?? 0}</strong> signups</span>
                      <span><strong className="text-slate-800">{link.total_offers ?? 0}</strong> offers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
