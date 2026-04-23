import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileSelect from '../components/layout/MobileSelect';

const JOB_TYPE_OPTIONS = [{ value: "full_time", label: "Full-time" }, { value: "part_time", label: "Part-time" }, { value: "internship", label: "Internship" }, { value: "contract", label: "Contract" }];
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Briefcase, MapPin, DollarSign, Pencil, ChevronDown, ChevronUp, Users, Clock, AlertCircle, FileText, Upload, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const SKILLS = ["Python", "JavaScript", "React", "SQL", "Data Analysis", "Machine Learning", "Finance", "Marketing", "Accounting", "Excel", "Project Management", "Leadership", "Research", "Statistics", "Java", "Product Management", "Sales", "Communication", "Business Development", "Consulting"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Mandarin", "Portuguese", "Italian", "Japanese", "Korean", "Arabic", "Dutch", "Russian", "Swedish"];
const JOB_TYPES = [{ value: "full_time", label: "Full-time" }, { value: "part_time", label: "Part-time" }, { value: "internship", label: "Internship" }, { value: "contract", label: "Contract" }];
const TYPE_STYLE = { full_time: 'bg-[#EAF5FB] text-[#3D87AA]', part_time: 'bg-[#daeef7] text-[#2d6d8e]', internship: 'bg-[#EAF5FB] text-[#5BA4C4]', contract: 'bg-[#d0e8f5] text-[#2E3F4F]' };

const defaultForm = { title: '', description: '', location: '', type: 'internship', salary_range: '', salary_min: '', salary_max: '', required_skills: [], required_languages: [], perks: [], status: 'active', company: '' };

export default function JobManagement() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [applicants, setApplicants] = useState({});

  useEffect(() => {loadData();}, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [profiles, myJobs, myShortlists] = await Promise.all([
    base44.entities.RecruiterProfile.filter({ created_by: u.email }),
    base44.entities.Job.filter({ created_by: u.email }),
    base44.entities.Shortlist.filter({ created_by: u.email })]
    );
    setProfile(profiles[0] || null);
    setJobs(myJobs);
    setShortlists(myShortlists);
    setLoading(false);
  };

  const loadApplicants = async (jobId) => {
    if (applicants[jobId]) return;
    const swipes = await base44.entities.Swipe.filter({ job_id: jobId, direction: 'right' });
    setApplicants((prev) => ({ ...prev, [jobId]: swipes }));
  };

  const toggleExpand = async (jobId) => {
    if (expandedJob === jobId) {setExpandedJob(null);return;}
    setExpandedJob(jobId);
    await loadApplicants(jobId);
  };

  const openCreate = () => {
    setEditingJob(null);
    setFormData({ ...defaultForm, company: profile?.company || '', recruiter_video_url: profile?.intro_video_url || '' });
    setShowForm(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setFormData({ ...job });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editingJob) {
      await base44.entities.Job.update(editingJob.id, formData);
    } else {
      await base44.entities.Job.create(formData);
    }
    setShowForm(false);
    setEditingJob(null);
    setSaving(false);
    loadData();
  };

  const toggleStatus = async (job) => {
    await base44.entities.Job.update(job.id, { status: job.status === 'active' ? 'closed' : 'active' });
    loadData();
  };

  const [customSkill, setCustomSkill] = useState('');
  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !(formData.required_skills || []).includes(trimmed)) {
      setFormData((p) => ({ ...p, required_skills: [...(p.required_skills || []), trimmed] }));
    }
    setCustomSkill('');
  };
  const toggleSkill = (skill) => setFormData((p) => ({ ...p, required_skills: (p.required_skills || []).includes(skill) ? p.required_skills.filter((s) => s !== skill) : [...(p.required_skills || []), skill] }));

  const toggleLanguage = (language) => setFormData((p) => ({ ...p, required_languages: (p.required_languages || []).includes(language) ? p.required_languages.filter((l) => l !== language) : [...(p.required_languages || []), language] }));

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">My Jobs 📋</h1>
            <p className="text-white/80 mt-1">Create and manage your job postings</p>
          </div>
          <Button onClick={openCreate} className="bg-white text-[#3D87AA] hover:bg-white/90 font-bold"><Plus className="w-4 h-4 mr-2" />Post a Job</Button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 -mt-6">

      <div className="space-y-4">
        {jobs.length === 0 &&
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E8E4DF] shadow-sm">
            <Briefcase className="w-12 h-12 text-[#8FAFC4] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2E3F4F] mb-2">No jobs posted yet</h3>
            <p className="text-[#7A7870] text-sm mb-6">Post your first job to start receiving student applications</p>
            <Button onClick={openCreate} className="bg-[#5BA4C4] hover:bg-[#3D87AA]"><Plus className="w-4 h-4 mr-2" />Post a Job</Button>
          </div>
          }

        {jobs.map((job) => {
            const typeStyle = TYPE_STYLE[job.type] || 'bg-slate-100 text-slate-700';
            const jobShortlists = shortlists.filter((s) => s.job_id === job.id);
            const jobApplicants = applicants[job.id] || [];
            const isExpanded = expandedJob === job.id;
            const daysOld = differenceInDays(new Date(), new Date(job.created_date));
            const needsRefresh = daysOld >= 4;
            return (
              <div key={job.id} className={`rounded-2xl border shadow-sm overflow-hidden ${needsRefresh ? 'bg-white border-[#8FAFC4]' : 'bg-white border-[#E8E4DF]'}`}>
               {needsRefresh &&
                <div className="bg-[#EAF5FB] border-b border-[#8FAFC4] px-5 py-3 flex items-start gap-3">
                   <AlertCircle className="w-4 h-4 text-[#5BA4C4] flex-shrink-0 mt-0.5" />
                   <div className="text-sm">
                     <p className="font-semibold text-[#2E3F4F]">Job needs refresh</p>
                     <p className="text-[#7A7870] text-xs mt-0.5">Posted {daysOld} days ago. Consider updating and refreshing on the platform to maintain visibility.</p>
                   </div>
                 </div>
                }
               <div className="p-5">
                 <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-[#2E3F4F]">{job.title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeStyle}`}>{JOB_TYPES.find((t) => t.value === job.type)?.label || job.type}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${job.status === 'active' ? 'bg-[#EAF5FB] text-[#3D87AA]' : 'bg-[#E8E4DF] text-[#7A7870]'}`}>{job.status}</span>
                    </div>
                    <div className="flex gap-3 flex-wrap text-sm text-[#7A7870] items-center">
                       {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                       {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_range}</span>}
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Posted {format(new Date(job.created_date), 'MMM d')}</span>
                     </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(job)} className="bg-slate-200 text-slate-600 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(job)} className="bg-slate-200 text-slate-600 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">
                      {job.status === 'active' ? 'Close' : 'Reopen'}
                    </Button>
                  </div>
                </div>

                {job.description && <p className="text-[#7A7870] text-sm mt-3 line-clamp-2">{job.description}</p>}

                {(job.required_skills || []).length > 0 &&
                   <div className="flex flex-wrap gap-1.5 mt-3">
                     {job.required_skills.map((skill) => <span key={skill} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full">{skill}</span>)}
                   </div>
                   }

                {(job.required_languages || []).length > 0 &&
                   <div className="flex flex-wrap gap-1.5 mt-2">
                     {job.required_languages.map((lang) => <span key={lang} className="text-xs bg-[#E8D5C4] text-[#8B6F47] px-2 py-0.5 rounded-full">{lang}</span>)}
                   </div>
                   }

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E8E4DF]">
                  <button onClick={() => toggleExpand(job.id)} className="flex items-center gap-1.5 text-sm text-[#7A7870] hover:text-[#2E3F4F] transition-colors">
                    <Users className="w-4 h-4" />
                    <span>{jobApplicants.length > 0 ? jobApplicants.length : '?'} applied</span>
                    <span className="text-slate-400">·</span>
                    <span>{jobShortlists.length} shortlisted</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExpanded &&
                <div className="border-t border-[#E8E4DF] bg-[#E8E4DF] p-4">
                  <p className="text-xs font-bold text-[#7A7870] uppercase tracking-wider mb-3">Students who applied ({jobApplicants.length})</p>
                  {jobApplicants.length === 0 ?
                  <p className="text-[#7A7870] text-sm">No students have liked this job yet</p> :
                  <div className="space-y-2">
                        {jobApplicants.map((swipe) =>
                    <div key={swipe.id} className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 bg-[#EAF5FB] rounded-full flex items-center justify-center text-[#3D87AA] text-xs font-bold">{swipe.created_by?.[0]?.toUpperCase()}</div>
                            <span className="text-[#2E3F4F]">{swipe.created_by}</span>
                            {jobShortlists.some((s) => s.student_email === swipe.created_by) && <span className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full border border-[#A8D4E8]">Shortlisted</span>}
                          </div>
                    )}
                      </div>
                  }
                </div>
                }
            </div>);

          })}
      </div>

      {/* Job Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => {if (!v) {setShowForm(false);setEditingJob(null);}}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingJob ? 'Edit Job' : 'Post a New Job'}</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label className="text-sm font-semibold text-slate-700">Job Title *</Label><Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="mt-1.5" placeholder="Software Engineer Intern" /></div>
              <div><Label className="text-sm font-semibold text-slate-700">Company</Label><Input value={formData.company} onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))} className="mt-1.5" placeholder="Acme Corp" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Job Type</Label>
                <MobileSelect value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))} options={JOB_TYPE_OPTIONS} placeholder="Job Type" className="mt-1.5" />
              </div>
              <div><Label className="text-sm font-semibold text-slate-700">Location</Label><Input value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} className="mt-1.5" placeholder="New York, NY / Remote" /></div>
            </div>
            <div><Label className="text-sm font-semibold text-slate-700">Salary Range Description</Label><Input value={formData.salary_range} onChange={(e) => setFormData((p) => ({ ...p, salary_range: e.target.value }))} className="mt-1.5" placeholder="e.g., $25/hr or $60k–$80k" /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label className="text-sm font-semibold text-slate-700">Minimum Salary</Label><Input type="number" value={formData.salary_min} onChange={(e) => setFormData((p) => ({ ...p, salary_min: e.target.value ? parseFloat(e.target.value) : '' }))} className="mt-1.5" placeholder="50000" /></div>
              <div><Label className="text-sm font-semibold text-slate-700">Maximum Salary</Label><Input type="number" value={formData.salary_max} onChange={(e) => setFormData((p) => ({ ...p, salary_max: e.target.value ? parseFloat(e.target.value) : '' }))} className="mt-1.5" placeholder="80000" /></div>
            </div>
            <div><Label className="text-sm font-semibold text-slate-700">Description *</Label><Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="mt-1.5 resize-none" rows={4} placeholder="Describe the role, responsibilities, and what you're looking for..." /></div>

            {/* Job Spec Upload */}
            <div>
              <Label className="text-sm font-semibold text-slate-700">Job Specification <span className="text-slate-400 font-normal">(optional)</span></Label>
              <div className="mt-1.5">
                {formData.job_spec_url ? (
                  <div className="flex items-center gap-3 p-3 bg-[#EAF5FB] border border-[#A8D4E8] rounded-xl">
                    <FileText className="w-5 h-5 text-[#3D87AA] flex-shrink-0" />
                    <a href={formData.job_spec_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#3D87AA] hover:underline flex-1 truncate">View Job Spec</a>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, job_spec_url: '' }))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#5BA4C4] hover:bg-[#EAF5FB] transition-all">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500">{uploadingSpec ? 'Uploading...' : 'Upload PDF or Word doc'}</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploadingSpec}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingSpec(true);
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setFormData(p => ({ ...p, job_spec_url: file_url }));
                        setUploadingSpec(false);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-3 block">Required Skills</Label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((skill) =>
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.required_skills || []).includes(skill) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{skill}</button>
                  )}
                {(formData.required_skills || []).filter(s => !SKILLS.includes(s)).map(skill => (
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5BA4C4] text-white">{skill}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())} placeholder="Add a custom skill..." className="h-8 text-sm" />
                <button type="button" onClick={addCustomSkill} className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all whitespace-nowrap">+ Add</button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-3 block">Required Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((language) =>
                  <button key={language} type="button" onClick={() => toggleLanguage(language)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(formData.required_languages || []).includes(language) ? 'bg-[#8B6F47] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#E8D5C4] hover:text-[#8B6F47]'}`}>{language}</button>
                  )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {setShowForm(false);setEditingJob(null);}} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !formData.title} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">{saving ? 'Saving...' : editingJob ? 'Save Changes' : 'Post Job'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>);

}