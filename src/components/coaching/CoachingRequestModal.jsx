import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Inquiry-style modal for the "1:1 coaching" CTA. Submits a row to the
 * coaching_requests table; the admin Candidate Control panel surfaces the
 * inquiry so a coach can follow up out of band.
 *
 * Intentionally NOT a checkout flow — payment integration is out of scope per
 * the current product decision (see AskQuestion answer Jun 29 2026).
 */
const PACKAGE_OPTIONS = [
  { value: 'single_session', label: 'Single 1:1 session' },
  { value: 'package_3', label: '3-session package' },
  { value: 'package_6', label: '6-session package' },
  { value: 'open', label: 'Not sure yet — recommend me a package' },
];

export default function CoachingRequestModal({ open, onOpenChange, user, profile }) {
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [preferredTimes, setPreferredTimes] = useState('');
  const [pkg, setPkg] = useState('open');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTopic('');
    setDetails('');
    setPreferredTimes('');
    setPkg('open');
    setSubmitted(false);
    setError('');
  };

  const handleClose = (next) => {
    onOpenChange(next);
    if (!next) {
      // Reset after the close animation so the user doesn't see fields wipe
      // out mid-transition.
      setTimeout(reset, 200);
    }
  };

  const submit = async () => {
    if (!user?.email) {
      setError('You need to be signed in to request coaching.');
      return;
    }
    if (!topic.trim()) {
      setError("Please tell us briefly what you'd like coaching on.");
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await base44.entities.CoachingRequest.create({
        requester_email: user.email,
        requester_name: user.full_name ?? profile?.full_name ?? null,
        requester_role: user.role ?? null,
        topic: topic.trim(),
        details: details.trim() || null,
        preferred_times: preferredTimes.trim() || null,
        package: pkg,
        status: 'new',
      });
      setSubmitted(true);
    } catch (e) {
      setError(e?.message || 'Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5BA4C4]" /> Request a 1:1 coaching session
          </DialogTitle>
          <DialogDescription>
            Tell us what you need help with and our team will be in touch by
            email to confirm pricing and book a time.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <p className="font-semibold text-slate-800">Request received!</p>
            <p className="text-sm text-slate-500">
              We&apos;ll reach out to <span className="font-semibold">{user?.email}</span> shortly
              to confirm a slot.
            </p>
            <Button onClick={() => handleClose(false)} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">What do you want coaching on? *</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Interview prep for consulting"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500">Tell us more (optional)</Label>
              <Textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Background, the role you're targeting, anything else helpful."
                className="resize-none"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500">Preferred times (optional)</Label>
              <Input
                value={preferredTimes}
                onChange={(e) => setPreferredTimes(e.target.value)}
                placeholder="e.g. Weekday evenings UK / weekend mornings"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500">Package</Label>
              <Select value={pkg} onValueChange={setPkg}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACKAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-[#EAF5FB] border border-[#A8D4E8]/40 px-3 py-2 text-xs text-[#2d5f7a]">
              We&apos;ll respond by email at <strong>{user?.email ?? 'your account email'}</strong>.
              No charge until you confirm a session.
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={submit}
                disabled={submitting}
                className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
              >
                {submitting ? 'Sending...' : 'Send request'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
