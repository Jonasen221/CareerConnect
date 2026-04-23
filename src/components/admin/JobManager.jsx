import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MobileSelect from '../layout/MobileSelect';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';

const EMPTY = {
  title: '', company: '', location: '', type: 'full_time',
  salary_range: '', description: '', required_skills: [], linkedin_url: '', company_website: '', status: 'active'
};

function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState(job || EMPTY);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setForm((f) => ({ ...f, required_skills: [...(f.required_skills || []), skillInput.trim()] }));
    setSkillInput('');
  };

  const removeSkill = (i) => setForm((f) => ({ ...f, required_skills: f.required_skills.filter((_, idx) => idx !== i) }));

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Job title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Input placeholder="Company *" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
        <Input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <Input placeholder="Salary range (e.g. £40k–£55k)" value={form.salary_range} onChange={(e) => setForm((f) => ({ ...f, salary_range: e.target.value }))} />
        <MobileSelect value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))} placeholder="Job Type" options={[{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }, { value: 'internship', label: 'Internship' }, { value: 'contract', label: 'Contract' }]} />
        <MobileSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="Status" options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }]} />
      </div>
      <Textarea placeholder="Job description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-24" />
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Recruiter LinkedIn URL" value={form.linkedin_url || ''} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} />
        <Input placeholder="Company website URL" value={form.company_website || ''} onChange={(e) => setForm((f) => ({ ...f, company_website: e.target.value }))} />
      </div>
      <div>
        <div className="flex gap-2 mb-2">
          <Input placeholder="Add a required skill" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
          <Button type="button" size="sm" onClick={addSkill} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">Add</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(form.required_skills || []).map((s, i) =>
          <span key={i} className="flex items-center gap-1 bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full text-xs font-semibold">
              {s} <button onClick={() => removeSkill(i)}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title || !form.company} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Check className="w-4 h-4 mr-1" /> Save Job
        </Button>
      </div>
    </div>);

}

export default function JobManager() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {load();}, []);

  const load = async () => {
    setLoading(true);
    const j = await base44.entities.Job.list();
    setJobs(j);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.Job.update(editing.id, form);
      setEditing(null);
    } else {
      await base44.entities.Job.create(form);
      setAdding(false);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    await base44.entities.Job.delete(id);
    load();
  };

  const typeLabels = { full_time: 'Full Time', part_time: 'Part Time', internship: 'Internship', contract: 'Contract' };

  if (loading) return <p className="text-slate-400 text-center py-12">Loading jobs...</p>;

  return (
    <div className="space-y-4">
      {!adding &&
      <Button onClick={() => setAdding(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Plus className="w-4 h-4 mr-2" /> Add Job
        </Button>
      }

      {adding && <JobForm onSave={handleSave} onCancel={() => setAdding(false)} />}

      {jobs.length === 0 && !adding &&
      <p className="text-slate-400 text-center py-12">No jobs yet. Add your first one!</p>
      }

      {jobs.map((job) =>
      <div key={job.id}>
          {editing?.id === job.id ?
        <JobForm job={editing} onSave={handleSave} onCancel={() => setEditing(null)} /> :

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{job.title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{job.status}</span>
                  <span className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full font-semibold">{typeLabels[job.type] || job.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{job.company}{job.location ? ` · ${job.location}` : ''}{job.salary_range ? ` · ${job.salary_range}` : ''}</p>
                {job.required_skills?.length > 0 &&
            <div className="flex flex-wrap gap-1 mt-2">
                    {job.required_skills.map((s, i) => <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
            }
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditing(job)} className="bg-slate-200 text-[#3D87AA] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-[#A8D4E8] hover:bg-[#EAF5FB]"><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(job.id)} className="bg-slate-200 text-red-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
        }
        </div>
      )}
    </div>);

}