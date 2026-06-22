import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Filter,
  ShieldCheck,
  ClipboardList,
  Settings as SettingsIcon,
  Users,
  Building2,
  Search,
  RefreshCw,
} from 'lucide-react';
import StatusPill, {
  STATUS_OPTIONS,
  FlaggedPill,
  VerifiedStudentPill,
} from '@/components/admin/StatusPill';
import EducationLevelBadge from '@/components/students/EducationLevelBadge';
import ProfileActionsDialog from '@/components/admin/ProfileActionsDialog';
import {
  loadAppSettings,
  updateAppSettings,
  DEFAULT_APP_SETTINGS,
} from '@/lib/appSettings';
import { listAdminActions, logAdminAction } from '@/lib/adminLog';

const EDUCATION_OPTIONS = [
  { value: 'high_school', label: 'High school' },
  { value: 'university', label: 'University / college' },
  { value: 'both', label: 'Both' },
];

const DEFAULT_FILTERS = Object.freeze({
  search: '',
  statuses: [],          // empty = show all
  education_levels: [],  // students only
  flagged_only: false,
  verified_only: false,  // students only
  joined_from: '',       // ISO date
  joined_to: '',
});

const matchesText = (value, query) =>
  !query || (value ?? '').toString().toLowerCase().includes(query.toLowerCase());

const inDateRange = (createdDate, from, to) => {
  if (!createdDate) return true;
  const ts = new Date(createdDate).getTime();
  if (Number.isNaN(ts)) return true;
  if (from) {
    const f = new Date(from).getTime();
    if (!Number.isNaN(f) && ts < f) return false;
  }
  if (to) {
    const t = new Date(`${to}T23:59:59`).getTime();
    if (!Number.isNaN(t) && ts > t) return false;
  }
  return true;
};

function FilterPanel({ filters, setFilters, kind }) {
  const toggleArray = (key, value) => {
    setFilters((prev) => {
      const list = prev[key] ?? [];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search name, email, university, company…"
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Joined from</Label>
          <Input
            type="date"
            value={filters.joined_from}
            onChange={(e) => setFilters((f) => ({ ...f, joined_from: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Joined to</Label>
          <Input
            type="date"
            value={filters.joined_to}
            onChange={(e) => setFilters((f) => ({ ...f, joined_to: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">Status</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const active = filters.statuses.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleArray('statuses', s)}
                type="button"
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-[#3D87AA] text-white border-[#3D87AA]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#A8D4E8]'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {kind === 'student' && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Education level</Label>
          <div className="flex flex-wrap gap-2">
            {EDUCATION_OPTIONS.map((opt) => {
              const active = filters.education_levels.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleArray('education_levels', opt.value)}
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#3D87AA] text-white border-[#3D87AA]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#A8D4E8]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Switch
            checked={filters.flagged_only}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, flagged_only: v }))}
          />
          Flagged only
        </label>
        {kind === 'student' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Switch
              checked={filters.verified_only}
              onCheckedChange={(v) => setFilters((f) => ({ ...f, verified_only: v }))}
            />
            Verified students only
          </label>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ ...DEFAULT_FILTERS })}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function CandidateRow({ profile, kind, onClick }) {
  const initials = profile.full_name?.split(' ')
    .map((n) => n?.[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-[#A8D4E8] transition-colors"
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        {profile.photo_url && <img src={profile.photo_url} alt="" className="w-full h-full object-cover rounded-full" />}
        {profile.company_logo_url && !profile.photo_url && (
          <img src={profile.company_logo_url} alt="" className="w-full h-full object-cover rounded-full" />
        )}
        <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800">{profile.full_name || 'Unnamed'}</p>
          <StatusPill status={profile.status} />
          {profile.flagged && <FlaggedPill />}
          {kind === 'student' && profile.verified_student && <VerifiedStudentPill />}
          {kind === 'student' && profile.education_level && (
            <EducationLevelBadge level={profile.education_level} />
          )}
        </div>
        <p className="text-sm text-slate-500 truncate">
          {kind === 'student'
            ? [profile.university, profile.major, profile.graduation_year ? `Class of ${profile.graduation_year}` : null]
                .filter(Boolean)
                .join(' · ') || profile.email
            : [profile.company, profile.title, profile.industry].filter(Boolean).join(' · ') || profile.email}
        </p>
        {profile.suspension_reason && (
          <p className="text-xs text-orange-700 mt-1 truncate">
            <span className="font-semibold">Reason:</span> {profile.suspension_reason}
          </p>
        )}
      </div>
      <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
        {profile.created_date
          ? new Date(profile.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : ''}
      </div>
    </button>
  );
}

function ProfileList({ profiles, kind, loading, onSelect }) {
  if (loading) {
    return <p className="text-slate-400 text-center py-12">Loading…</p>;
  }
  if (profiles.length === 0) {
    return <p className="text-slate-400 text-center py-12">No profiles match these filters.</p>;
  }
  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <CandidateRow key={p.id} profile={p} kind={kind} onClick={() => onSelect(p)} />
      ))}
    </div>
  );
}

function AuditLogPanel({ entries, loading, onRefresh }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} most recent admin actions</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>
      {loading && <p className="text-slate-400 text-center py-12">Loading…</p>}
      {!loading && entries.length === 0 && (
        <p className="text-slate-400 text-center py-12">No admin actions recorded yet.</p>
      )}
      {!loading && entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 hidden md:grid">
            <div className="col-span-2">When</div>
            <div className="col-span-2">Admin</div>
            <div className="col-span-2">Action</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-3">Reason / notes</div>
          </div>
          {entries.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 text-sm last:border-b-0"
            >
              <div className="md:col-span-2 text-xs text-slate-500">
                {e.created_date ? new Date(e.created_date).toLocaleString() : '—'}
              </div>
              <div className="md:col-span-2 text-slate-700 truncate">{e.admin_email || e.admin_id || '—'}</div>
              <div className="md:col-span-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {e.action}
                </span>
              </div>
              <div className="md:col-span-3 text-slate-600 truncate">
                {e.target_type ? <span className="text-xs text-slate-400 mr-1">{e.target_type}</span> : null}
                {e.target_label || e.target_id || ''}
              </div>
              <div className="md:col-span-3 text-xs text-slate-500 truncate">
                {[e.reason, e.notes].filter(Boolean).join(' — ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onSave, adminUser }) {
  const [moderationStudents, setModerationStudents] = useState(!!settings.moderation_students);
  const [moderationRecruiters, setModerationRecruiters] = useState(!!settings.moderation_recruiters);
  const [logPageViews, setLogPageViews] = useState(settings.log_admin_page_views !== false);
  const [domains, setDomains] = useState(
    (settings.trusted_student_email_domains ?? []).join('\n')
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setModerationStudents(!!settings.moderation_students);
    setModerationRecruiters(!!settings.moderation_recruiters);
    setLogPageViews(settings.log_admin_page_views !== false);
    setDomains((settings.trusted_student_email_domains ?? []).join('\n'));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const domainList = domains
        .split(/[\n,\s]+/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const patch = {
        moderation_students: moderationStudents,
        moderation_recruiters: moderationRecruiters,
        log_admin_page_views: logPageViews,
        trusted_student_email_domains: domainList,
      };
      const updated = await updateAppSettings(patch);
      await logAdminAction(adminUser, {
        action: 'update_app_settings',
        target_type: 'app_settings',
        target_id: updated?.id ?? null,
        metadata: patch,
      });
      setSavedAt(new Date());
      onSave(updated);
    } catch (e) {
      setError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Moderation</p>
          <p className="text-xs text-slate-500">
            When ON, new profiles land as <span className="font-semibold">pending</span> until an admin
            approves them. Existing profiles are unaffected. When OFF, new profiles are auto-approved.
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-slate-700">Gate new candidate (student) profiles</span>
          <Switch checked={moderationStudents} onCheckedChange={setModerationStudents} />
        </label>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-slate-700">Gate new recruiter profiles</span>
          <Switch checked={moderationRecruiters} onCheckedChange={setModerationRecruiters} />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Trusted student email domains</p>
          <p className="text-xs text-slate-500">
            Students who sign up with one of these email domains are automatically marked as
            verified. You can also override verification manually from the candidate controls.
            One domain per line (e.g. <code>nyu.edu</code>, <code>students.uu.nl</code>).
          </p>
        </div>
        <Textarea
          rows={6}
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          placeholder="example.edu&#10;school.nl"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Audit log</p>
          <p className="text-xs text-slate-500">
            When ON, every admin route visit is logged to the audit trail (in addition to all
            writes). Useful for compliance trails but the table grows quickly.
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-slate-700">Log admin page views</span>
          <Switch checked={logPageViews} onCheckedChange={setLogPageViews} />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : '\u00A0'}
        </p>
        <Button onClick={handleSave} disabled={saving} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function AdminCandidates() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [students, setStudents] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [studentFilters, setStudentFilters] = useState({ ...DEFAULT_FILTERS });
  const [recruiterFilters, setRecruiterFilters] = useState({ ...DEFAULT_FILTERS });

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedKind, setSelectedKind] = useState(null);

  const [auditEntries, setAuditEntries] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);

  // --- Auth + initial load ----------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (u.role !== 'admin') {
          navigate('/');
          return;
        }
        setAdminUser(u);
      } catch {
        navigate('/');
        return;
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [navigate]);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const [s, r] = await Promise.all([
      base44.entities.StudentProfile.list(),
      base44.entities.RecruiterProfile.list(),
    ]);
    setStudents(s);
    setRecruiters(r);
    setLoadingProfiles(false);
  }, []);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    const entries = await listAdminActions({ limit: 300 });
    setAuditEntries(entries);
    setLoadingAudit(false);
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    loadProfiles();
    loadAudit();
    loadAppSettings({ force: true }).then((s) => { if (s) setAppSettings(s); });
  }, [adminUser, loadProfiles, loadAudit]);

  // --- Filtering --------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    const f = studentFilters;
    return students.filter((s) => {
      if (f.statuses.length > 0 && !f.statuses.includes(s.status)) return false;
      if (f.education_levels.length > 0 && !f.education_levels.includes(s.education_level)) return false;
      if (f.flagged_only && !s.flagged) return false;
      if (f.verified_only && !s.verified_student) return false;
      if (!inDateRange(s.created_date, f.joined_from, f.joined_to)) return false;
      const haystack = [s.full_name, s.email, s.university, s.major, s.location].join(' ');
      if (!matchesText(haystack, f.search)) return false;
      return true;
    });
  }, [students, studentFilters]);

  const filteredRecruiters = useMemo(() => {
    const f = recruiterFilters;
    return recruiters.filter((r) => {
      if (f.statuses.length > 0 && !f.statuses.includes(r.status)) return false;
      if (f.flagged_only && !r.flagged) return false;
      if (!inDateRange(r.created_date, f.joined_from, f.joined_to)) return false;
      const haystack = [r.full_name, r.email, r.company, r.title, r.industry, r.location].join(' ');
      if (!matchesText(haystack, f.search)) return false;
      return true;
    });
  }, [recruiters, recruiterFilters]);

  // --- Render -----------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Verifying access…</p>
      </div>
    );
  }
  if (!adminUser) return null;

  const handleSelect = (profile, kind) => {
    setSelectedProfile(profile);
    setSelectedKind(kind);
  };
  const handleActionChanged = async () => {
    await Promise.all([loadProfiles(), loadAudit()]);
    if (selectedProfile) {
      // Refresh the dialog target with the latest data so action results show.
      const entity = selectedKind === 'student'
        ? base44.entities.StudentProfile
        : base44.entities.RecruiterProfile;
      try {
        const fresh = await entity.get(selectedProfile.id);
        if (fresh) setSelectedProfile(fresh);
      } catch {
        /* ignore, dialog will close on next user action */
      }
    }
  };
  const handleSettingsSaved = (updated) => {
    if (updated) setAppSettings(updated);
  };

  const counts = {
    candidates: filteredStudents.length,
    recruiters: filteredRecruiters.length,
    pendingStudents: students.filter((s) => s.status === 'pending').length,
    pendingRecruiters: recruiters.filter((r) => r.status === 'pending').length,
    flagged: students.filter((s) => s.flagged).length + recruiters.filter((r) => r.flagged).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Candidate Control
          </h1>
          <p className="text-white/80 mt-1">
            Review, edit, suspend, and audit every profile on the platform.
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 -mt-10 pb-12 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Candidates</p>
            <p className="text-2xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Recruiters</p>
            <p className="text-2xl font-bold text-slate-900">{recruiters.length}</p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Pending</p>
            <p className="text-2xl font-bold text-amber-700">
              {counts.pendingStudents + counts.pendingRecruiters}
            </p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Flagged</p>
            <p className="text-2xl font-bold text-pink-700">{counts.flagged}</p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Moderation</p>
            <p className="text-sm font-semibold text-slate-700">
              {appSettings.moderation_students || appSettings.moderation_recruiters
                ? 'ON'
                : 'OFF'}
            </p>
            <p className="text-xs text-slate-400">
              {[appSettings.moderation_students && 'students', appSettings.moderation_recruiters && 'recruiters']
                .filter(Boolean)
                .join(' + ') || 'auto-approve all'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="candidates">
          <TabsList className="bg-white shadow-sm border border-slate-100 flex-wrap h-auto gap-1">
            <TabsTrigger value="candidates" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" /> Candidates
            </TabsTrigger>
            <TabsTrigger value="recruiters" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-1.5" /> Recruiters
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4 mr-1.5" /> Audit log
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <SettingsIcon className="w-4 h-4 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="mt-4 space-y-4">
            <FilterPanel filters={studentFilters} setFilters={setStudentFilters} kind="student" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                Showing {filteredStudents.length} of {students.length} candidates
              </p>
              <Button variant="outline" size="sm" onClick={loadProfiles}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
            <ProfileList
              profiles={filteredStudents}
              kind="student"
              loading={loadingProfiles}
              onSelect={(p) => handleSelect(p, 'student')}
            />
          </TabsContent>

          <TabsContent value="recruiters" className="mt-4 space-y-4">
            <FilterPanel filters={recruiterFilters} setFilters={setRecruiterFilters} kind="recruiter" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                Showing {filteredRecruiters.length} of {recruiters.length} recruiters
              </p>
              <Button variant="outline" size="sm" onClick={loadProfiles}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
            <ProfileList
              profiles={filteredRecruiters}
              kind="recruiter"
              loading={loadingProfiles}
              onSelect={(p) => handleSelect(p, 'recruiter')}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditLogPanel entries={auditEntries} loading={loadingAudit} onRefresh={loadAudit} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SettingsPanel
              settings={appSettings}
              onSave={handleSettingsSaved}
              adminUser={adminUser}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ProfileActionsDialog
        open={!!selectedProfile}
        onOpenChange={(open) => { if (!open) setSelectedProfile(null); }}
        profile={selectedProfile}
        type={selectedKind}
        adminUser={adminUser}
        onChanged={handleActionChanged}
      />
    </div>
  );
}
