import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Save, X, CheckCircle, Clock, AlertCircle, Link as LinkIcon, Building2, ArrowLeft, Trash2, Mail, Phone } from 'lucide-react';

export default function RecruiterProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const u = await base44.auth.me();
    const profiles = await base44.entities.RecruiterProfile.filter({ created_by: u.email });
    if (profiles.length > 0) { setProfile(profiles[0]); setFormData(profiles[0]); }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.RecruiterProfile.update(profile.id, formData);
    setProfile(updated); setEditing(false); setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    await base44.entities.RecruiterProfile.delete(profile.id);
    base44.auth.logout('/');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center"><p className="text-slate-500">No recruiter profile found.</p></div>
    </div>
  );

  const initials = profile.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || 'R';
  const statusConfig = {
    pending: { icon: Clock, banner: 'bg-amber-50 border-amber-200', iconCls: 'text-amber-600', textCls: 'text-amber-800', subCls: 'text-amber-600', label: 'Pending Review', desc: 'Your profile is being reviewed by our team' },
    approved: { icon: CheckCircle, banner: 'bg-green-50 border-green-200', iconCls: 'text-green-600', textCls: 'text-green-800', subCls: 'text-green-600', label: 'Profile Approved', desc: 'Your profile is live and visible to students' },
    rejected: { icon: AlertCircle, banner: 'bg-red-50 border-red-200', iconCls: 'text-red-600', textCls: 'text-red-800', subCls: 'text-red-600', label: 'Not Approved', desc: 'Contact support for more information' },
  };
  const sc = statusConfig[profile.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors select-none">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white">My Profile 💼</h1>
              <p className="text-white/80 mt-1">How students see you</p>
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
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${sc.banner}`}>
          <StatusIcon className={`w-5 h-5 flex-shrink-0 ${sc.iconCls}`} />
          <div><p className={`font-semibold text-sm ${sc.textCls}`}>{sc.label}</p><p className={`text-xs ${sc.subCls}`}>{sc.desc}</p></div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] p-8">
            <Avatar className="w-20 h-20 mb-4 border-4 border-white/30">
              {profile.company_logo_url && <img src={profile.company_logo_url} alt={profile.company} className="w-full h-full object-cover rounded-full" />}
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {editing
              ? <Input value={formData.full_name || ''} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className="text-white bg-white/20 border-white/30 text-xl font-bold placeholder-white/50 mb-2" placeholder="Your name" />
              : <h2 className="text-2xl font-black text-white">{profile.full_name}</h2>
            }
            {editing && (
              <Input
                value={formData.company_logo_url || ''}
                onChange={e => setFormData(p => ({ ...p, company_logo_url: e.target.value }))}
                className="text-white bg-white/20 border-white/30 text-sm placeholder-white/50 mt-2"
                placeholder="Company logo URL"
              />
            )}
            <p className="text-white/70 mt-1">{profile.title} · {profile.company}</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { label: 'Full Name', field: 'full_name', placeholder: 'Jane Smith' },
                { label: 'Job Title', field: 'title', placeholder: 'Head of Talent' },
                { label: 'Company', field: 'company', placeholder: 'Acme Corp' },
                { label: 'Industry', field: 'industry', placeholder: 'Technology' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</Label>
                  {editing
                    ? <Input value={formData[field] || ''} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))} className="mt-1.5" placeholder={placeholder} />
                    : <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1"><Building2 className="w-4 h-4 text-slate-400 shrink-0" />{profile[field] || '—'}</p>
                  }
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</Label>
              {editing
                ? <Textarea value={formData.bio || ''} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} className="mt-1.5 resize-none" rows={3} />
                : <p className="mt-1 text-slate-600 dark:text-slate-400">{profile.bio || 'No bio added yet.'}</p>
              }
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Website</Label>
              {editing
                ? <Input value={formData.company_website || ''} onChange={e => setFormData(p => ({ ...p, company_website: e.target.value }))} className="mt-1.5" placeholder="https://company.com" />
                : <div className="mt-1">{profile.company_website ? <a href={profile.company_website.startsWith('http') ? profile.company_website : `https://${profile.company_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#5BA4C4] hover:underline"><LinkIcon className="w-4 h-4" />{profile.company_website}</a> : <p className="text-slate-400 text-sm">No website added</p>}</div>
              }
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</Label>
                {editing
                  ? <Input type="email" value={formData.email || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1.5" placeholder="you@company.com" />
                  : <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400" />{profile.email || '—'}</p>
                }
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</Label>
                {editing
                  ? <Input type="tel" value={formData.phone_number || ''} onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))} className="mt-1.5" placeholder="+1 555 000 0000" />
                  : <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400" />{profile.phone_number || '—'}</p>
                }
              </div>
            </div>

            {profile.intro_video_url && !editing && (
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">90-Second Pitch</Label>
                <video src={profile.intro_video_url} controls className="w-full rounded-2xl border border-slate-200 max-h-72 bg-black" />
              </div>
            )}
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