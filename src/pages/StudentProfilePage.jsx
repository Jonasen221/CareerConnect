import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X, CheckCircle, Clock, AlertCircle, Link as LinkIcon, GraduationCap, MapPin, ArrowLeft, Trash2, Mail, Phone, Video, FileText, Upload } from 'lucide-react';
import { useDemoPreview } from '@/lib/DemoPreviewContext';
import EducationLevelBadge from '../components/students/EducationLevelBadge';
import KeywordPicker from '../components/keywords/KeywordPicker';
import { FolderKanban, Plus, ExternalLink, Tag } from 'lucide-react';
import { COUNTRIES, DEGREE_LEVELS, degreeLabel } from '@/lib/countries';

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High school' },
  { value: 'university', label: 'University / College' },
  { value: 'both', label: 'Both' },
];

const SKILLS = ["Python","JavaScript","React","SQL","Data Analysis","Machine Learning","Finance","Marketing","Accounting","Excel","Project Management","Leadership","Research","Statistics","Java","Product Management","Sales","Communication","Business Development","Consulting"];
const WORK_PREFS = [{ value: "full_time", label: "Full-time" },{ value: "part_time", label: "Part-time" },{ value: "internship", label: "Internship" },{ value: "remote", label: "Remote" },{ value: "hybrid", label: "Hybrid" },{ value: "on_site", label: "On-site" }];
const GRAD_YEARS = Array.from({ length: 41 }, (_, i) => 1990 + i);
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Consulting", "Media", "Manufacturing", "Retail", "Education", "Government", "Non-profit", "Energy", "Real Estate", "Telecommunications", "Transportation", "Hospitality", "Agriculture", "Construction", "Law"];
const LANGUAGES = ["English", "Spanish", "Mandarin", "Hindi", "French", "Arabic", "Portuguese", "Russian", "Japanese", "German", "Korean", "Italian", "Dutch", "Swedish", "Polish", "Turkish", "Greek", "Vietnamese", "Thai", "Hebrew", "Tagalog", "Bengali", "Urdu"];

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const { skipProfileGates, skipApprovalGates } = useDemoPreview();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => { loadProfile(); }, [skipProfileGates]);

  useEffect(() => {
    if (!profile?.email || profile.id === 'preview') {
      setPortfolio([]);
      return;
    }
    let cancelled = false;
    base44.entities.Project
      .filter({ created_by: profile.email, kind: 'portfolio' }, '-created_date', 50)
      .then(rows => { if (!cancelled) setPortfolio(rows); })
      .catch(() => { if (!cancelled) setPortfolio([]); });
    return () => { cancelled = true; };
  }, [profile?.email, profile?.id]);

  const loadProfile = async () => {
    const u = await base44.auth.me();
    const profiles = await base44.entities.StudentProfile.filter({ created_by: u.email });
    if (profiles.length > 0) {
      setProfile(profiles[0]);
      setFormData(profiles[0]);
    } else if (u.role === 'admin' || skipProfileGates) {
      const demo = {
        id: 'preview',
        full_name: u.full_name || 'Demo candidate',
        status: 'approved',
        university: 'Sample University',
        major: 'Business Administration',
        graduation_year: new Date().getFullYear() + 1,
        location: 'Zurich, CH',
        nationality: 'Switzerland',
        bio: 'Preview profile — data is not saved until you create a real candidate profile.',
        skills: ['Communication', 'Excel'],
        work_preferences: ['internship'],
        industries: ['Finance'],
        languages: ['English', 'German'],
        resume_url: null,
        intro_video_url: null,
        photo_url: null,
        linkedin_url: '',
        phone: '',
      };
      setProfile(demo);
      setFormData(demo);
    } else {
      navigate(createPageUrl('Onboarding'));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (profile?.id === 'preview') return;
    setSaving(true);
    const updated = await base44.entities.StudentProfile.update(profile.id, formData);
    setProfile(updated); setEditing(false); setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (profile?.id === 'preview') return;
    setDeletingAccount(true);
    await base44.entities.StudentProfile.delete(profile.id);
    base44.auth.logout('/');
  };

  const [cvUploading, setCvUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [linkedinDraft, setLinkedinDraft] = useState('');
  const [savingLinkedin, setSavingLinkedin] = useState(false);

  const handleCvUpload = async (e) => {
    if (profile?.id === 'preview') return;
    const file = e.target.files[0];
    if (!file) return;
    setCvUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = await base44.entities.StudentProfile.update(profile.id, { ...formData, resume_url: file_url });
    setProfile(updated);
    setFormData(updated);
    setCvUploading(false);
  };

  const handleVideoUpload = async (e) => {
    if (profile?.id === 'preview') return;
    const file = e.target.files[0];
    if (!file) return;
    // 100 MB ceiling — bigger files time-out on the free Supabase storage tier
    // and the resulting 413 is a much worse UX than a friendly stop here.
    if (file.size > 100 * 1024 * 1024) {
      setVideoError('Video is larger than 100 MB. Please trim or compress it before uploading.');
      return;
    }
    setVideoError('');
    setVideoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = await base44.entities.StudentProfile.update(profile.id, { intro_video_url: file_url });
      setProfile(updated);
      setFormData(updated);
    } catch (err) {
      setVideoError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleRemoveVideo = async () => {
    if (profile?.id === 'preview') return;
    const updated = await base44.entities.StudentProfile.update(profile.id, { intro_video_url: null });
    setProfile(updated);
    setFormData(updated);
  };

  const handleSaveLinkedin = async () => {
    if (profile?.id === 'preview') return;
    setSavingLinkedin(true);
    const updated = await base44.entities.StudentProfile.update(profile.id, { linkedin_url: linkedinDraft.trim() });
    setProfile(updated);
    setFormData(updated);
    setLinkedinDraft('');
    setSavingLinkedin(false);
  };

  const [customSkill, setCustomSkill] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const toggleSkill = skill => setFormData(p => ({ ...p, skills: (p.skills || []).includes(skill) ? p.skills.filter(s => s !== skill) : [...(p.skills || []), skill] }));

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !(formData.skills || []).includes(trimmed)) {
      setFormData(p => ({ ...p, skills: [...(p.skills || []), trimmed] }));
    }
    setCustomSkill('');
  };

  const addCustomIndustry = () => {
    const trimmed = customIndustry.trim();
    if (trimmed && !(formData.industries || []).includes(trimmed)) {
      setFormData(p => ({ ...p, industries: [...(p.industries || []), trimmed] }));
    }
    setCustomIndustry('');
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed && !(formData.languages || []).includes(trimmed)) {
      setFormData(p => ({ ...p, languages: [...(p.languages || []), trimmed] }));
    }
    setCustomLanguage('');
  };

  const togglePref = pref => setFormData(p => ({ ...p, work_preferences: (p.work_preferences || []).includes(pref) ? p.work_preferences.filter(w => w !== pref) : [...(p.work_preferences || []), pref] }));

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return null;

  const initials = profile.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || 'S';
  const statusConfig = {
    pending: { icon: Clock, banner: 'bg-amber-50 border-amber-200', iconCls: 'text-amber-600', textCls: 'text-amber-800', subCls: 'text-amber-600', label: 'Pending Review', desc: 'Your profile is being reviewed by our team' },
    approved: { icon: CheckCircle, banner: 'bg-green-50 border-green-200', iconCls: 'text-green-600', textCls: 'text-green-800', subCls: 'text-green-600', label: 'Profile Approved', desc: 'Your candidate profile is live and visible to recruiters' },
    rejected: { icon: AlertCircle, banner: 'bg-red-50 border-red-200', iconCls: 'text-red-600', textCls: 'text-red-800', subCls: 'text-red-600', label: 'Not Approved', desc: profile.suspension_reason || 'Contact support for more information' },
    suspended: { icon: AlertCircle, banner: 'bg-orange-50 border-orange-200', iconCls: 'text-orange-600', textCls: 'text-orange-800', subCls: 'text-orange-600', label: 'Account Suspended', desc: profile.suspension_reason || 'Contact support for more information' },
    banned: { icon: AlertCircle, banner: 'bg-zinc-100 border-zinc-300', iconCls: 'text-zinc-800', textCls: 'text-zinc-900', subCls: 'text-zinc-700', label: 'Account Banned', desc: profile.suspension_reason || 'Contact support for more information' },
  };
  const sc = statusConfig[profile.status] || statusConfig.pending;
  const StatusIcon = sc.icon;
  const showApprovalStatusBanner = !skipApprovalGates || profile.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors select-none">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white">My Profile ✨</h1>
              <p className="text-white/80 mt-1">How recruiters see you as a candidate</p>
            </div>
          </div>
          {!editing
            ? <Button onClick={() => setEditing(true)} className="bg-white text-[#3D87AA] hover:bg-white/90 font-bold"><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            : <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); setFormData(profile); }} className="bg-white/20 border-white/30 text-white hover:bg-white/30"><X className="w-4 h-4 mr-2" />Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-white text-[#3D87AA] hover:bg-white/90 font-bold"><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
              </div>
          }
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 -mt-8">

      {showApprovalStatusBanner && (
      <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${sc.banner}`}>
        <StatusIcon className={`w-5 h-5 flex-shrink-0 ${sc.iconCls}`} />
        <div><p className={`font-semibold text-sm ${sc.textCls}`}>{sc.label}</p><p className={`text-xs ${sc.subCls}`}>{sc.desc}</p></div>
      </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] p-8">
          <div className="w-20 h-20 mb-4 border-4 border-white/30 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{initials}</span>
          </div>
          {editing
            ? <Input value={formData.full_name || ''} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className="text-white bg-white/20 border-white/30 text-xl font-bold placeholder-white/50 mb-2" />
            : <div><p className="text-xl font-bold text-white">{profile.full_name?.split(' ')[0]}</p><p className="text-white/90 font-semibold">{profile.full_name?.split(' ').slice(1).join(' ')}</p></div>
          }
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {profile.education_level && (
              <EducationLevelBadge level={profile.education_level} variant="full" className="bg-white/90 border-white/40" />
            )}
            <p className="text-white/70">{profile.university} · {profile.major}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { label: 'University', field: 'university', icon: GraduationCap, placeholder: 'Harvard University' },
              { label: 'Major', field: 'major', icon: null, placeholder: 'Computer Science' },
            ].map(({ label, field, icon: Icon, placeholder }) => (
              <div key={field}>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</Label>
                {editing
                  ? <Input value={formData[field] || ''} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))} className="mt-1.5 bg-white text-slate-800" placeholder={placeholder} />
                  : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1">{Icon && <Icon className="w-4 h-4 text-slate-400" />}{profile[field] || '—'}</p>
                }
              </div>
            ))}
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graduation Year</Label>
              {editing
                ? <Select value={String(formData.graduation_year || '')} onValueChange={v => setFormData(p => ({ ...p, graduation_year: parseInt(v) }))}><SelectTrigger className="mt-1.5 bg-white text-slate-800"><SelectValue /></SelectTrigger><SelectContent>{GRAD_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium">Class of {profile.graduation_year || '—'}</p>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</Label>
              {editing
                ? <Input value={formData.location || ''} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} className="mt-1.5 bg-white text-slate-800" placeholder="New York, NY" />
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" />{profile.location || '—'}</p>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nationality</Label>
              {editing
                ? <Select value={formData.nationality || ''} onValueChange={v => setFormData(p => ({ ...p, nationality: v }))}><SelectTrigger className="mt-1.5 bg-white text-slate-800"><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium">{profile.nationality || '—'}</p>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Education level</Label>
              {editing
                ? <Select value={formData.education_level || ''} onValueChange={v => setFormData(p => ({ ...p, education_level: v }))}><SelectTrigger className="mt-1.5 bg-white text-slate-800"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EDUCATION_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium">{profile.education_level ? (EDUCATION_LEVELS.find(l => l.value === profile.education_level)?.label || profile.education_level) : '—'}</p>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Degree</Label>
              {editing
                ? <Select value={formData.degree_level || ''} onValueChange={v => setFormData(p => ({ ...p, degree_level: v }))}><SelectTrigger className="mt-1.5 bg-white text-slate-800"><SelectValue placeholder="Select your highest qualification" /></SelectTrigger><SelectContent>{DEGREE_LEVELS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select>
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1"><GraduationCap className="w-4 h-4 text-slate-400" />{degreeLabel(profile.degree_level) || '—'}</p>
              }
            </div>
            </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</Label>
            {editing
              ? <Textarea value={formData.bio || ''} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} className="mt-1.5 resize-none bg-white text-slate-800" rows={3} />
              : <p className="mt-1 text-slate-600 dark:text-slate-300">{profile.bio || 'No bio added yet.'}</p>
            }
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Skills</Label>
            {editing
              ? <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map(skill => <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.skills || []).includes(skill) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{skill}</button>)}
                    {(formData.skills || []).filter(s => !SKILLS.includes(s)).map(skill => (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5BA4C4] text-white">{skill}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())} placeholder="Add a custom skill..." className="h-8 text-sm" />
                    <button type="button" onClick={addCustomSkill} className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all">+ Add</button>
                  </div>
                </div>
              : <div className="flex flex-wrap gap-2">{(profile.skills || []).length > 0 ? profile.skills.map(skill => <span key={skill} className="px-3 py-1 bg-[#EAF5FB] text-[#3D87AA] rounded-full text-sm font-medium">{skill}</span>) : <p className="text-slate-400 text-sm">No skills added yet</p>}</div>
            }
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Industries</Label>
            {editing
              ? <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">{INDUSTRIES.map(ind => <button key={ind} type="button" onClick={() => setFormData(p => ({ ...p, industries: (p.industries || []).includes(ind) ? p.industries.filter(i => i !== ind) : [...(p.industries || []), ind] }))} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.industries || []).includes(ind) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{ind}</button>)}
                    {(formData.industries || []).filter(i => !INDUSTRIES.includes(i)).map(ind => (
                      <button key={ind} type="button" onClick={() => setFormData(p => ({ ...p, industries: p.industries.filter(i => i !== ind) }))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5BA4C4] text-white">{ind}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomIndustry())} placeholder="Add a custom industry..." className="h-8 text-sm" />
                    <button type="button" onClick={addCustomIndustry} className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all">+ Add</button>
                  </div>
                </div>
              : <div className="flex flex-wrap gap-2">{(profile.industries || []).length > 0 ? profile.industries.map(ind => <span key={ind} className="px-3 py-1 bg-[#EAF5FB] text-[#3D87AA] rounded-full text-sm font-medium">{ind}</span>) : <p className="text-slate-400 text-sm">No industries selected</p>}</div>
            }
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Languages</Label>
            {editing
              ? <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">{LANGUAGES.map(lang => <button key={lang} type="button" onClick={() => setFormData(p => ({ ...p, languages: (p.languages || []).includes(lang) ? p.languages.filter(l => l !== lang) : [...(p.languages || []), lang] }))} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.languages || []).includes(lang) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{lang}</button>)}
                    {(formData.languages || []).filter(l => !LANGUAGES.includes(l)).map(lang => (
                      <button key={lang} type="button" onClick={() => setFormData(p => ({ ...p, languages: p.languages.filter(l => l !== lang) }))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5BA4C4] text-white">{lang}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={customLanguage} onChange={e => setCustomLanguage(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomLanguage())} placeholder="Add a custom language..." className="h-8 text-sm" />
                    <button type="button" onClick={addCustomLanguage} className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all">+ Add</button>
                  </div>
                </div>
              : <div className="flex flex-wrap gap-2">{(profile.languages || []).length > 0 ? profile.languages.map(lang => <span key={lang} className="px-3 py-1 bg-[#EAF5FB] text-[#3D87AA] rounded-full text-sm font-medium">{lang}</span>) : <p className="text-slate-400 text-sm">No languages added</p>}</div>
            }
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Work Preferences</Label>
            {editing
              ? <div className="flex flex-wrap gap-2">{WORK_PREFS.map(p => <button key={p.value} type="button" onClick={() => togglePref(p.value)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.work_preferences || []).includes(p.value) ? 'bg-[#3D87AA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{p.label}</button>)}</div>
              : <div className="flex flex-wrap gap-2">{(profile.work_preferences || []).length > 0 ? profile.work_preferences.map(pref => <span key={pref} className="px-3 py-1 bg-[#EAF5FB] text-[#3D87AA] rounded-full text-sm font-medium">{WORK_PREFS.find(p => p.value === pref)?.label || pref}</span>) : <p className="text-slate-400 text-sm">No preferences set</p>}</div>
            }
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
              <Video className="w-3.5 h-3.5" /> 90-Second Intro Video <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </Label>
            {profile.intro_video_url ? (
              <div className="space-y-2">
                <video src={profile.intro_video_url} controls className="w-full rounded-2xl border border-slate-200 max-h-72 bg-black" />
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer text-xs text-[#5BA4C4] hover:underline font-medium">
                    {videoUploading ? 'Uploading…' : 'Replace video'}
                    <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoUpload} disabled={videoUploading} />
                  </label>
                  <button type="button" onClick={handleRemoveVideo} disabled={videoUploading} className="text-xs text-red-500 hover:underline font-medium">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${videoUploading ? 'opacity-60 pointer-events-none' : 'border-[#A8D4E8] bg-[#EAF5FB] hover:bg-[#daeef7]'}`}>
                <Upload className="w-5 h-5 text-[#3D87AA]" />
                <div>
                  <p className="text-sm font-semibold text-[#2d5f7a]">{videoUploading ? 'Uploading…' : 'Upload your 90-second intro'}</p>
                  <p className="text-xs text-slate-500">MP4, MOV or WebM · max 100 MB</p>
                </div>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoUpload} disabled={videoUploading} />
              </label>
            )}
            {videoError && <p className="text-xs text-red-600 mt-2">{videoError}</p>}
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> CV / Resume <span className="text-red-500 ml-0.5">*</span>
            </Label>
            <div className="mt-2">
              {profile.resume_url ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-700 hover:underline flex-1 truncate">View CV</a>
                  <label className="cursor-pointer text-xs text-[#5BA4C4] hover:underline font-medium">
                    Replace
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvUpload} />
                  </label>
                </div>
              ) : (
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${cvUploading ? 'opacity-60 pointer-events-none' : 'border-red-300 bg-red-50 hover:bg-red-100'}`}>
                  <Upload className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-600">{cvUploading ? 'Uploading...' : 'Upload your CV'} <span className="text-red-500">*</span></p>
                    <p className="text-xs text-red-400">PDF, DOC or DOCX • Required</p>
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvUpload} disabled={cvUploading} />
                </label>
              )}
            </div>
          </div>

          {/* Keywords — used by search + swipe ranking */}
          <div>
            {editing ? (
              <KeywordPicker
                value={formData.keywords || []}
                onChange={(v) => setFormData(p => ({ ...p, keywords: v }))}
                label="Keywords"
                description="Pick from the categories or add your own — recruiters and project owners use these to find people like you."
              />
            ) : (
              <>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Keywords
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(profile.keywords || []).length > 0
                    ? profile.keywords.map(k => <span key={k} className="px-3 py-1 bg-[#EAF5FB] text-[#3D87AA] rounded-full text-sm font-medium">{k}</span>)
                    : <p className="text-slate-400 text-sm">No keywords yet. Add some to improve match quality.</p>}
                </div>
              </>
            )}
          </div>

          {/* Portfolio projects — past work attached to this profile */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" /> Portfolio
              </Label>
              <button
                type="button"
                onClick={() => navigate(`${createPageUrl('Projects')}?new=portfolio`)}
                className="text-xs font-semibold text-[#3D87AA] hover:text-[#2d6d8e] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add portfolio project
              </button>
            </div>
            {portfolio.length === 0 ? (
              <p className="text-sm text-slate-400">No portfolio projects yet. Showcase past work to stand out to recruiters.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {portfolio.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`${createPageUrl('Projects')}?id=${p.id}`)}
                    className="text-left bg-slate-50 hover:bg-[#EAF5FB] border border-slate-100 hover:border-[#A8D4E8] rounded-2xl p-4 transition-colors"
                  >
                    <p className="font-semibold text-slate-800 line-clamp-1">{p.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description || '—'}</p>
                    {p.link_url && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] text-[#3D87AA] font-medium">
                        <ExternalLink className="w-3 h-3" /> {p.link_url.replace(/^https?:\/\//, '').slice(0, 40)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LinkedIn</Label>
            {editing
              ? <Input value={formData.linkedin_url || ''} onChange={e => setFormData(p => ({ ...p, linkedin_url: e.target.value }))} className="mt-1.5" placeholder="linkedin.com/in/yourname" />
              : <div className="mt-1">{profile.linkedin_url
                  ? <a href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://${profile.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#5BA4C4] hover:underline"><LinkIcon className="w-4 h-4" />{profile.linkedin_url}</a>
                  : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={linkedinDraft}
                        onChange={(e) => setLinkedinDraft(e.target.value)}
                        placeholder="linkedin.com/in/yourname"
                        className="bg-white text-slate-800 text-sm h-9"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveLinkedin}
                        disabled={savingLinkedin || !linkedinDraft.trim()}
                        className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white"
                      >
                        {savingLinkedin ? 'Saving…' : 'Add'}
                      </Button>
                    </div>
                  )}
                </div>
            }
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</Label>
              {editing
                ? <Input type="email" value={formData.email || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1.5" placeholder="jane@email.com" />
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400" />{profile.email || '—'}</p>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</Label>
              {editing
                ? <Input type="tel" value={formData.phone_number || ''} onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))} className="mt-1.5" placeholder="+1 555 000 0000" />
                : <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400" />{profile.phone_number || '—'}</p>
              }
            </div>
          </div>


        </div>
      </div>
    {/* Delete Account */}
    <div className="mt-8 mb-8 bg-white dark:bg-slate-800 rounded-3xl border border-red-100 dark:border-red-900/40 shadow-sm overflow-hidden">
      <div className="p-6">
        <h3 className="text-base font-bold text-red-700 mb-1 flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete Account</h3>
        <p className="text-sm text-slate-500 mb-4">Permanently delete your profile and all data. This cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors select-none" style={{ minHeight: 44 }}>
            Delete My Account
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Are you absolutely sure?</p>
            <p className="text-xs text-red-600">Your profile will be permanently removed from CareerConnect.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors select-none" style={{ minHeight: 44 }}>Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deletingAccount} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 select-none" style={{ minHeight: 44 }}>
                {deletingAccount ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
    );
    }