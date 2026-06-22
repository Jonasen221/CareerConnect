import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle2,
  XCircle,
  PauseCircle,
  Ban,
  Flag,
  ShieldCheck,
  Pencil,
  StickyNote,
  Bell,
} from 'lucide-react';
import StatusPill, { FlaggedPill, VerifiedStudentPill } from '@/components/admin/StatusPill';
import { logAdminAction } from '@/lib/adminLog';

/**
 * Sweeping admin action dialog for a single candidate or recruiter profile.
 *
 * Renders the profile summary plus a vertical action stack:
 *   - Approve / Reject (when pending)
 *   - Suspend / Ban / Reactivate
 *   - Flag / Unflag
 *   - Verify student status (students only)
 *   - Edit profile fields on behalf of the user
 *   - Internal notes (admin-only)
 *   - Send a notification message that surfaces on the user's dashboard
 *
 * Every write goes through the entity shim AND is logged to admin_actions via
 * `logAdminAction`. The parent page is notified via `onChanged` so it can
 * refresh its list.
 */
export default function ProfileActionsDialog({
  open,
  onOpenChange,
  profile,
  type, // 'student' | 'recruiter'
  adminUser,
  onChanged,
}) {
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [activeReasonAction, setActiveReasonAction] = useState(null);
  const [notifyUser, setNotifyUser] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const [showNotify, setShowNotify] = useState(false);
  const [notifyDraft, setNotifyDraft] = useState('');

  useEffect(() => {
    if (!open) {
      setBusyAction(null);
      setError('');
      setReasonText('');
      setActiveReasonAction(null);
      setNotifyUser(true);
      setShowEdit(false);
      setEditForm({});
      setShowNotes(false);
      setNotesDraft('');
      setShowNotify(false);
      setNotifyDraft('');
    }
  }, [open]);

  if (!profile) return null;

  const entity = type === 'student'
    ? base44.entities.StudentProfile
    : base44.entities.RecruiterProfile;
  const targetType = type === 'student' ? 'student_profile' : 'recruiter_profile';
  const targetLabel = profile.full_name || profile.email || profile.id;

  const applyPatch = async (patch, action, { reason, notes, metadata } = {}) => {
    setBusyAction(action);
    setError('');
    try {
      await entity.update(profile.id, patch);
      await logAdminAction(adminUser, {
        action,
        target_type: targetType,
        target_id: profile.id,
        target_label: targetLabel,
        reason: reason ?? null,
        notes: notes ?? null,
        metadata: {
          ...(metadata ?? {}),
          patch_keys: Object.keys(patch),
        },
      });
      if (onChanged) await onChanged();
    } catch (e) {
      setError(e?.message || 'Action failed.');
    } finally {
      setBusyAction(null);
    }
  };

  // ---- Status transitions -------------------------------------------------
  const handleApprove = () => applyPatch(
    { status: 'approved', suspension_reason: null },
    'approve_profile',
  );

  const handleReject = () => applyPatch(
    { status: 'rejected', suspension_reason: reasonText || null },
    'reject_profile',
    { reason: reasonText },
  );

  const handleSuspend = () => applyPatch(
    {
      status: 'suspended',
      suspension_reason: reasonText || null,
      notification_message: notifyUser && reasonText
        ? `Your account has been suspended. Reason: ${reasonText}`
        : profile.notification_message ?? null,
    },
    'suspend_profile',
    { reason: reasonText },
  );

  const handleBan = () => applyPatch(
    {
      status: 'banned',
      suspension_reason: reasonText || null,
      notification_message: notifyUser && reasonText
        ? `Your account has been banned. Reason: ${reasonText}`
        : profile.notification_message ?? null,
    },
    'ban_profile',
    { reason: reasonText },
  );

  const handleReactivate = () => applyPatch(
    {
      status: 'approved',
      suspension_reason: null,
      notification_message: null,
    },
    'reactivate_profile',
  );

  // ---- Flag / Verify ------------------------------------------------------
  const handleToggleFlag = () => applyPatch(
    { flagged: !profile.flagged },
    profile.flagged ? 'unflag_profile' : 'flag_profile',
    { reason: reasonText },
  );

  const handleToggleVerify = () => {
    if (type !== 'student') return;
    return applyPatch(
      { verified_student: !profile.verified_student },
      profile.verified_student ? 'unverify_student' : 'verify_student',
    );
  };

  // ---- Inline editor ------------------------------------------------------
  const studentFields = [
    ['full_name', 'Full name'],
    ['email', 'Email'],
    ['university', 'University'],
    ['major', 'Major'],
    ['graduation_year', 'Graduation year'],
    ['location', 'Location'],
    ['phone_number', 'Phone'],
    ['linkedin_url', 'LinkedIn URL'],
    ['headline', 'Headline'],
  ];
  const recruiterFields = [
    ['full_name', 'Full name'],
    ['email', 'Email'],
    ['company', 'Company'],
    ['title', 'Title'],
    ['industry', 'Industry'],
    ['company_website', 'Website'],
    ['location', 'Location'],
    ['phone_number', 'Phone'],
  ];
  const editableFields = type === 'student' ? studentFields : recruiterFields;

  const openEdit = () => {
    const seed = {};
    for (const [key] of editableFields) seed[key] = profile[key] ?? '';
    setEditForm(seed);
    setShowEdit(true);
  };
  const submitEdit = async () => {
    const changed = {};
    for (const [key] of editableFields) {
      if ((editForm[key] ?? '') !== (profile[key] ?? '')) {
        changed[key] = editForm[key] === '' ? null : editForm[key];
      }
    }
    if (Object.keys(changed).length === 0) {
      setShowEdit(false);
      return;
    }
    await applyPatch(changed, 'edit_profile', {
      metadata: { fields: Object.keys(changed) },
    });
    setShowEdit(false);
  };

  // ---- Internal notes -----------------------------------------------------
  const openNotes = () => {
    setNotesDraft(profile.internal_notes ?? '');
    setShowNotes(true);
  };
  const submitNotes = async () => {
    await applyPatch(
      { internal_notes: notesDraft || null },
      'update_internal_notes',
    );
    setShowNotes(false);
  };

  // ---- Notification to user -----------------------------------------------
  const openNotify = () => {
    setNotifyDraft(profile.notification_message ?? '');
    setShowNotify(true);
  };
  const submitNotify = async () => {
    await applyPatch(
      { notification_message: notifyDraft || null },
      notifyDraft ? 'send_notification' : 'clear_notification',
      { notes: notifyDraft },
    );
    setShowNotify(false);
  };

  // ---- Reason flow shared by suspend/ban/reject ---------------------------
  const armReason = (action) => {
    setActiveReasonAction(action);
    setReasonText('');
    setError('');
  };
  const confirmReason = async () => {
    if (!activeReasonAction) return;
    if (activeReasonAction === 'suspend') await handleSuspend();
    if (activeReasonAction === 'ban') await handleBan();
    if (activeReasonAction === 'reject') await handleReject();
    if (activeReasonAction === 'flag') await handleToggleFlag();
    setActiveReasonAction(null);
  };

  const initials = profile.full_name?.split(' ')
    .map((n) => n?.[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'student' ? '🎓 Candidate controls' : '💼 Recruiter controls'}
          </DialogTitle>
          <DialogDescription>
            Every action is logged to the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Summary */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-[#EAF5FB] text-[#3D87AA] flex items-center justify-center font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">{profile.full_name || 'Unnamed'}</p>
              <p className="text-sm text-slate-500 truncate">{profile.email || profile.created_by}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <StatusPill status={profile.status} />
                {profile.flagged && <FlaggedPill />}
                {type === 'student' && profile.verified_student && <VerifiedStudentPill />}
              </div>
              {profile.suspension_reason && (
                <p className="text-xs text-orange-700 mt-2">
                  <span className="font-semibold">Reason on file:</span> {profile.suspension_reason}
                </p>
              )}
            </div>
          </div>

          {/* Reason flow */}
          {activeReasonAction && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-900">
                Reason for {activeReasonAction === 'flag' && profile.flagged
                  ? 'unflagging'
                  : activeReasonAction}
              </p>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Visible to other admins in the audit log."
                rows={3}
              />
              {(activeReasonAction === 'suspend' || activeReasonAction === 'ban') && (
                <label className="flex items-center gap-2 text-sm text-amber-900">
                  <Switch checked={notifyUser} onCheckedChange={setNotifyUser} />
                  Also surface this reason to the user on their dashboard
                </label>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setActiveReasonAction(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmReason}
                  disabled={busyAction !== null}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Confirm {activeReasonAction}
                </Button>
              </div>
            </div>
          )}

          {/* Edit inline editor */}
          {showEdit && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Edit profile fields on behalf of the user
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {editableFields.map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-slate-500">{label}</Label>
                    <Input
                      value={editForm[key] ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button
                  onClick={submitEdit}
                  disabled={busyAction === 'edit_profile'}
                  className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
                >
                  Save edits
                </Button>
              </div>
            </div>
          )}

          {/* Internal notes editor */}
          {showNotes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Internal admin notes</p>
              <Textarea
                rows={4}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Visible only to admins."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNotes(false)}>Cancel</Button>
                <Button
                  onClick={submitNotes}
                  disabled={busyAction === 'update_internal_notes'}
                  className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
                >
                  Save notes
                </Button>
              </div>
            </div>
          )}

          {/* Notify user editor */}
          {showNotify && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-sky-900">Notification message to the user</p>
              <Textarea
                rows={4}
                value={notifyDraft}
                onChange={(e) => setNotifyDraft(e.target.value)}
                placeholder="Surfaces as a banner on their dashboard. Leave empty to clear."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNotify(false)}>Cancel</Button>
                <Button
                  onClick={submitNotify}
                  disabled={busyAction === 'send_notification' || busyAction === 'clear_notification'}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Save message
                </Button>
              </div>
            </div>
          )}

          {/* Action stack */}
          <div className="grid md:grid-cols-2 gap-2">
            {profile.status === 'pending' && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={busyAction !== null}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white justify-start"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button
                  onClick={() => armReason('reject')}
                  disabled={busyAction !== null}
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 justify-start"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </>
            )}

            {(profile.status === 'suspended' || profile.status === 'banned' || profile.status === 'rejected') && (
              <Button
                onClick={handleReactivate}
                disabled={busyAction !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white justify-start"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Reactivate (set to approved)
              </Button>
            )}

            {profile.status !== 'suspended' && profile.status !== 'banned' && (
              <Button
                onClick={() => armReason('suspend')}
                disabled={busyAction !== null}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50 justify-start"
              >
                <PauseCircle className="w-4 h-4 mr-2" /> Suspend
              </Button>
            )}

            {profile.status !== 'banned' && (
              <Button
                onClick={() => armReason('ban')}
                disabled={busyAction !== null}
                variant="outline"
                className="text-zinc-900 border-zinc-300 hover:bg-zinc-100 justify-start"
              >
                <Ban className="w-4 h-4 mr-2" /> Ban permanently
              </Button>
            )}

            <Button
              onClick={() => armReason('flag')}
              disabled={busyAction !== null}
              variant="outline"
              className={`justify-start ${profile.flagged ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-pink-700 border-pink-200 hover:bg-pink-50'}`}
            >
              <Flag className="w-4 h-4 mr-2" /> {profile.flagged ? 'Unflag' : 'Flag for review'}
            </Button>

            {type === 'student' && (
              <Button
                onClick={handleToggleVerify}
                disabled={busyAction !== null}
                variant="outline"
                className={`justify-start ${profile.verified_student ? 'text-slate-600 border-slate-200 hover:bg-slate-50' : 'text-sky-700 border-sky-200 hover:bg-sky-50'}`}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {profile.verified_student ? 'Remove student verification' : 'Verify student status'}
              </Button>
            )}

            <Button
              onClick={openEdit}
              disabled={busyAction !== null}
              variant="outline"
              className="justify-start"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit profile fields
            </Button>

            <Button
              onClick={openNotes}
              disabled={busyAction !== null}
              variant="outline"
              className="justify-start"
            >
              <StickyNote className="w-4 h-4 mr-2" />
              {profile.internal_notes ? 'View / edit internal notes' : 'Add internal notes'}
            </Button>

            <Button
              onClick={openNotify}
              disabled={busyAction !== null}
              variant="outline"
              className="justify-start text-sky-700 border-sky-200 hover:bg-sky-50"
            >
              <Bell className="w-4 h-4 mr-2" />
              {profile.notification_message ? 'Edit user notification' : 'Send user notification'}
            </Button>
          </div>

          {profile.internal_notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">Notes on file:</span> {profile.internal_notes}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
