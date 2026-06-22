import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderKanban, Plus, Compass, User, ArrowLeft, ArrowRight, ExternalLink,
  Tag, Users as UsersIcon, CheckCircle, Lock, Sparkles, Mail, Trash2,
  Upload, FileText, X,
} from 'lucide-react';
import KeywordPicker from '@/components/keywords/KeywordPicker';
import { sortByKeywordRelevance } from '@/lib/keywordScore';
import { FEATURE_PROJECTS } from '@/lib/featureFlags';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'React', 'SQL', 'Data Analysis', 'Machine Learning',
  'Finance', 'Marketing', 'Accounting', 'Excel', 'Project Management',
  'Leadership', 'Research', 'Statistics', 'Java', 'Product Management',
  'Sales', 'Communication', 'Business Development', 'Consulting', 'Design',
];

const AUDIENCE_OPTIONS = [
  { value: 'high_school', label: 'High school students' },
  { value: 'university', label: 'University students' },
  { value: 'both', label: 'Both high school and university' },
];

const TAB_DISCOVER = 'discover';
const TAB_MINE = 'mine';
const TAB_NEW = 'new';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KIND_LABEL = {
  user: 'User project',
  company: 'Company / challenge',
  portfolio: 'Portfolio',
};

const ProjectKindBadge = ({ kind }) => {
  const label = KIND_LABEL[kind] || kind;
  const cls = {
    user: 'bg-violet-50 text-violet-700 border-violet-200',
    company: 'bg-[#EAF5FB] text-[#3D87AA] border-[#A8D4E8]',
    portfolio: 'bg-amber-50 text-amber-700 border-amber-200',
  }[kind] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>
      <FolderKanban className="w-3 h-3" /> {label}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const cls = status === 'closed'
    ? 'bg-slate-100 text-slate-500 border-slate-200'
    : 'bg-green-50 text-green-700 border-green-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${cls}`}>
      {status === 'closed' ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} {status || 'open'}
    </span>
  );
};

const AudiencePill = ({ value }) => {
  if (!value) return null;
  const opt = AUDIENCE_OPTIONS.find(o => o.value === value);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-semibold">
      <UsersIcon className="w-3 h-3" /> {opt?.label || value}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Project card (used in Discover + My Projects lists)
// ---------------------------------------------------------------------------

const ProjectCard = ({ project, onOpen }) => (
  <button
    onClick={() => onOpen(project)}
    className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-[#5BA4C4] hover:shadow-md transition-all p-5 group"
  >
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <ProjectKindBadge kind={project.kind} />
      <StatusPill status={project.status} />
      <AudiencePill value={project.target_audience} />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#3D87AA] transition-colors">{project.title}</h3>
    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{project.description || 'No description provided.'}</p>
    {(project.keywords || []).length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {(project.keywords || []).slice(0, 5).map(kw => (
          <span key={kw} className="text-[11px] bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full">{kw}</span>
        ))}
        {(project.keywords || []).length > 5 && (
          <span className="text-[11px] text-slate-400">+{(project.keywords || []).length - 5}</span>
        )}
      </div>
    )}
  </button>
);

// ---------------------------------------------------------------------------
// New / edit project form
// ---------------------------------------------------------------------------

const blankProject = (currentRole) => ({
  title: '',
  description: '',
  kind: currentRole === 'recruiter' ? 'company' : 'user',
  status: 'open',
  target_audience: '',
  needed_skills: [],
  keywords: [],
  link_url: '',
  media_url: '',
});

const ProjectForm = ({ initial, currentRole, onSubmit, submitting, onCancel, lockedKind }) => {
  const [data, setData] = useState(() => initial || blankProject(currentRole));
  const [error, setError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const updateField = (k, v) => setData(p => ({ ...p, [k]: v }));

  const toggleSkill = (s) => {
    setData(p => ({
      ...p,
      needed_skills: (p.needed_skills || []).includes(s)
        ? p.needed_skills.filter(x => x !== s)
        : [...(p.needed_skills || []), s],
    }));
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;
    setUploadingMedia(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('media_url', file_url);
    } catch (e) {
      setError(e?.message || 'Upload failed');
    }
    setUploadingMedia(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!data.title.trim()) { setError('Please add a title.'); return; }
    if (!data.description.trim()) { setError('Please add a short description.'); return; }
    if (data.kind === 'company' && !data.target_audience) {
      setError('Pick a target audience for company-posted projects.');
      return;
    }
    await onSubmit(data);
  };

  const showAudience = data.kind === 'company';
  const isPortfolio = data.kind === 'portfolio';

  return (
    <div className="space-y-5">
      {!lockedKind && (
        <div>
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project type</Label>
          <Select value={data.kind} onValueChange={(v) => updateField('kind', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User project — looking for collaborators</SelectItem>
              {currentRole === 'recruiter' && (
                <SelectItem value="company">Company / challenge — for schools or universities</SelectItem>
              )}
              <SelectItem value="portfolio">Portfolio — past work for your profile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title *</Label>
        <Input value={data.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Open-source climate dashboard" className="mt-1.5" />
      </div>

      <div>
        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description *</Label>
        <Textarea
          value={data.description}
          onChange={e => updateField('description', e.target.value)}
          rows={5}
          placeholder={isPortfolio ? 'What you built, what you learned, your role.' : 'What the project is, what kind of people you’re looking for, and how to get involved.'}
          className="mt-1.5 resize-none"
        />
      </div>

      {showAudience && (
        <div>
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target audience *</Label>
          <Select value={data.target_audience} onValueChange={(v) => updateField('target_audience', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick one" /></SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isPortfolio && (
        <div>
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Skills you&apos;re looking for</Label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(s => (
              <button key={s} type="button" onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${(data.needed_skills || []).includes(s) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <KeywordPicker
        value={data.keywords || []}
        onChange={(v) => updateField('keywords', v)}
        description="Keywords power search and ranking — pick a few that capture what this project is about."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">External link</Label>
          <Input value={data.link_url} onChange={e => updateField('link_url', e.target.value)} placeholder="https://..." className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Media (optional)</Label>
          {data.media_url ? (
            <div className="mt-1.5 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-xl">
              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
              <a href={data.media_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-green-700 hover:underline truncate">View upload</a>
              <button type="button" onClick={() => updateField('media_url', '')} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className={`mt-1.5 flex items-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-xs ${uploadingMedia ? 'opacity-60 pointer-events-none border-slate-200' : 'border-slate-200 hover:border-[#5BA4C4] hover:bg-[#EAF5FB]'}`}>
              <Upload className="w-4 h-4 text-slate-400" />
              {uploadingMedia ? 'Uploading…' : 'Upload image or video'}
              <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleMediaUpload(e.target.files[0])} disabled={uploadingMedia} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting} className="flex-1">Cancel</Button>
        )}
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold">
          {submitting ? 'Saving…' : (initial?.id ? 'Save changes' : 'Publish project')}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

const ProjectDetail = ({ project, user, viewerEducationLevel, onClose, onChanged, onDelete }) => {
  const [interests, setInterests] = useState([]);
  const [myInterest, setMyInterest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);

  const isOwner = !!user && project.created_by === user.email;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all = await base44.entities.ProjectInterest.filter({ project_id: project.id });
      if (cancelled) return;
      setInterests(all);
      setMyInterest(all.find(i => i.user_email === user?.email) || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [project.id, user?.email]);

  const expressInterest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await base44.entities.ProjectInterest.create({
        project_id: project.id,
        user_email: user.email,
        note: note.trim() || null,
      });
      setInterests(prev => [created, ...prev]);
      setMyInterest(created);
      setNote('');
    } catch (e) {
      alert(e?.message || 'Could not record interest.');
    }
    setSubmitting(false);
  };

  const toggleStatus = async () => {
    const next = project.status === 'open' ? 'closed' : 'open';
    setSubmitting(true);
    try {
      const updated = await base44.entities.Project.update(project.id, { status: next });
      onChanged?.(updated);
    } catch (e) {
      alert(e?.message || 'Could not update.');
    }
    setSubmitting(false);
  };

  const handleEdit = async (next) => {
    setSubmitting(true);
    try {
      const updated = await base44.entities.Project.update(project.id, next);
      onChanged?.(updated);
      setEditing(false);
    } catch (e) {
      alert(e?.message || 'Could not save.');
    }
    setSubmitting(false);
  };

  // High-school students viewing a company project: surface the audience fit
  // explicitly so they know it's targeted at them.
  const isHsViewer = viewerEducationLevel === 'high_school' || viewerEducationLevel === 'both';
  const audienceFitNote = project.kind === 'company' && isHsViewer && project.target_audience !== 'university'
    ? 'This challenge is open to high-school students.'
    : null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[#EAF5FB] to-white p-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <ProjectKindBadge kind={project.kind} />
            <StatusPill status={project.status} />
            <AudiencePill value={project.target_audience} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">{project.title}</h1>
          <p className="text-sm text-slate-500">Posted by {project.created_by}</p>
          {audienceFitNote && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4" /> {audienceFitNote}
            </div>
          )}
        </div>

        {editing ? (
          <div className="p-8">
            <ProjectForm
              initial={project}
              currentRole={user?.role}
              lockedKind
              onSubmit={handleEdit}
              submitting={submitting}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="p-8 space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About</p>
              <p className="text-slate-700 whitespace-pre-line">{project.description}</p>
            </div>

            {(project.needed_skills || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {project.needed_skills.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(project.keywords || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.keywords.map(k => (
                    <span key={k} className="px-2.5 py-1 bg-[#EAF5FB] text-[#3D87AA] text-xs font-medium rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {project.link_url && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Link</p>
                <a href={project.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#3D87AA] hover:underline text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> {project.link_url}
                </a>
              </div>
            )}

            {project.media_url && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Media</p>
                <a href={project.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#3D87AA] hover:underline text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> View attached file
                </a>
              </div>
            )}

            {/* Interest CTA / list */}
            {project.kind !== 'portfolio' && (
              <div className="border-t border-slate-100 pt-6">
                {isOwner ? (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Interest ({interests.length})
                    </p>
                    {loading ? (
                      <p className="text-sm text-slate-400">Loading…</p>
                    ) : interests.length === 0 ? (
                      <p className="text-sm text-slate-400">No one has expressed interest yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {interests.map(i => (
                          <li key={i.id} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-[#EAF5FB] text-[#3D87AA] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i.user_email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <a href={`mailto:${i.user_email}`} className="text-sm font-semibold text-slate-800 hover:text-[#3D87AA] truncate flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {i.user_email}
                              </a>
                              {i.note && <p className="text-xs text-slate-500 mt-1">{i.note}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : project.status !== 'open' ? (
                  <p className="text-sm text-slate-500">This project is closed and not accepting new interest.</p>
                ) : myInterest ? (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> You&apos;ve let the owner know you&apos;re interested. They&apos;ll be in touch via {user?.email}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Express interest</Label>
                    <Textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                      placeholder="Optional note for the project owner (e.g. why you're a fit, links to past work)."
                      className="resize-none"
                    />
                    <Button onClick={expressInterest} disabled={submitting || !user} className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold">
                      {submitting ? 'Sending…' : "I'm interested"} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Owner controls */}
            {isOwner && (
              <div className="border-t border-slate-100 pt-6 flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="outline" onClick={toggleStatus} disabled={submitting}>
                  {project.status === 'open' ? 'Close project' : 'Reopen project'}
                </Button>
                <Button variant="outline" onClick={() => onDelete?.(project)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_DISCOVER);

  const openProjectId = searchParams.get('id');
  const newKindParam = searchParams.get('new');

  // Honour ?new=portfolio (or any valid kind) deep links from the profile page.
  useEffect(() => {
    if (newKindParam && ['user', 'company', 'portfolio'].includes(newKindParam)) {
      setActiveTab(TAB_NEW);
    }
  }, [newKindParam]);

  const openProject = useCallback((project) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('id', project.id);
      return next;
    });
  }, [setSearchParams]);

  const closeProject = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      return next;
    });
  }, [setSearchParams]);

  const reloadProjects = useCallback(async () => {
    const all = await base44.entities.Project.list('-created_date', 500);
    setProjects(all);
    return all;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const u = await base44.auth.me();
        if (cancelled) return;
        setUser(u);
        const [sp, rp, all] = await Promise.all([
          base44.entities.StudentProfile.filter({ created_by: u.email }),
          base44.entities.RecruiterProfile.filter({ created_by: u.email }),
          base44.entities.Project.list('-created_date', 500),
        ]);
        if (cancelled) return;
        setStudentProfile(sp[0] || null);
        setRecruiterProfile(rp[0] || null);
        setProjects(all);
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentRole = recruiterProfile ? 'recruiter' : (studentProfile ? 'student' : 'student');
  const viewerKeywords = studentProfile?.keywords || recruiterProfile?.keywords || [];
  const viewerEducationLevel = studentProfile?.education_level || null;

  // Discover view: open & non-portfolio projects, education-aware audience
  // filter, and keyword-relevance ranking.
  const discoverProjects = useMemo(() => {
    const visible = projects.filter(p => {
      if (p.kind === 'portfolio') return false;
      if ((p.status || 'open') !== 'open') return false;
      if (p.kind === 'company' && viewerEducationLevel === 'high_school') {
        // HS-only viewers shouldn't see company projects explicitly targeting
        // university students.
        if (p.target_audience === 'university') return false;
      }
      return true;
    });
    return sortByKeywordRelevance(
      visible,
      (p) => (p.keywords || []).concat(p.needed_skills || []),
      viewerKeywords,
    );
  }, [projects, viewerEducationLevel, viewerKeywords]);

  const myProjects = useMemo(
    () => projects.filter(p => user && p.created_by === user.email),
    [projects, user],
  );

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      const created = await base44.entities.Project.create({
        ...data,
        owner_role: currentRole,
      });
      await reloadProjects();
      setActiveTab(TAB_MINE);
      openProject(created);
    } catch (e) {
      alert(e?.message || 'Could not create project.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (project) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await base44.entities.Project.delete(project.id);
      await reloadProjects();
      closeProject();
    } catch (e) {
      alert(e?.message || 'Could not delete.');
    }
  };

  const handleChanged = async (updated) => {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  if (!FEATURE_PROJECTS) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">Projects are disabled in this environment.</p>
        <Button onClick={() => navigate(createPageUrl('StudentDashboard'))} className="mt-4">Go back</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (openProjectId) {
    const project = projects.find(p => p.id === openProjectId);
    if (!project) {
      return (
        <div className="p-12 text-center">
          <p className="text-slate-500 mb-4">Project not found or no longer available.</p>
          <Button onClick={closeProject}>Back to projects</Button>
        </div>
      );
    }
    return (
      <ProjectDetail
        project={project}
        user={user}
        viewerEducationLevel={viewerEducationLevel}
        onClose={closeProject}
        onChanged={handleChanged}
        onDelete={handleDelete}
      />
    );
  }

  const tabs = [
    { id: TAB_DISCOVER, label: 'Discover', icon: Compass },
    { id: TAB_MINE, label: 'My projects', icon: User },
    { id: TAB_NEW, label: 'New project', icon: Plus },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#2E3F4F] flex items-center gap-2">
          <FolderKanban className="w-7 h-7 text-[#5BA4C4]" /> Projects
        </h1>
        <p className="text-[#7A7870] mt-1">Find collaborators, post challenges, and showcase past work.</p>
      </div>

      <div className="mb-6 flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-[#5BA4C4] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === TAB_DISCOVER && (
        <div className="space-y-4">
          {discoverProjects.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-500">
              No open projects to discover yet. Be the first — switch to the New project tab.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {discoverProjects.map(p => (
                <ProjectCard key={p.id} project={p} onOpen={openProject} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === TAB_MINE && (
        <div className="space-y-4">
          {myProjects.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-500">
              You haven&apos;t posted any projects yet. Use the New project tab to get started.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myProjects.map(p => (
                <ProjectCard key={p.id} project={p} onOpen={openProject} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === TAB_NEW && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 md:p-8">
          <ProjectForm
            initial={newKindParam && ['user', 'company', 'portfolio'].includes(newKindParam)
              ? { ...blankProject(currentRole), kind: newKindParam }
              : undefined}
            currentRole={currentRole}
            onSubmit={handleCreate}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  );
}
