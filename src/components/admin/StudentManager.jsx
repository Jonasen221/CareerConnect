import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileSelect from '../layout/MobileSelect';
import { Pencil, Trash2, Check, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const EMPTY = { full_name: '', university: '', major: '', graduation_year: '', location: '', status: 'pending' };

function StudentForm({ student, onSave, onCancel }) {
  const [form, setForm] = useState(student || EMPTY);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Full name *" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="text-black" />
        <Input placeholder="University" value={form.university} onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))} className="text-black" />
        <Input placeholder="Major / Course" value={form.major} onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))} className="text-black" />
        <Input placeholder="Graduation year (e.g. 2025)" type="number" value={form.graduation_year} onChange={(e) => setForm((f) => ({ ...f, graduation_year: Number(e.target.value) }))} className="text-black" />
        <Input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="text-black" />
        <MobileSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="Status" options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.full_name} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Check className="w-4 h-4 mr-1" /> Save Candidate
        </Button>
      </div>
    </div>);

}

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  useEffect(() => {load();}, []);

  const load = async () => {
    setLoading(true);
    const s = await base44.entities.StudentProfile.list();
    setStudents(s);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.StudentProfile.update(editing.id, form);
      setEditing(null);
    } else {
      await base44.entities.StudentProfile.create(form);
      setAdding(false);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this candidate profile?')) return;
    await base44.entities.StudentProfile.delete(id);
    load();
  };

  const markIncompleteAsPending = async () => {
    const incompleteStudents = students.filter(s => isProfileIncomplete(s) && s.status !== 'pending');
    if (incompleteStudents.length === 0) {
      alert('No incomplete profiles to update.');
      return;
    }
    if (!confirm(`Mark ${incompleteStudents.length} incomplete profile(s) as pending?`)) return;
    await Promise.all(incompleteStudents.map(s => base44.entities.StudentProfile.update(s.id, { status: 'pending' })));
    load();
  };

  const statusColors = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

  const isProfileIncomplete = (student) => {
    const requiredFields = ['resume_url', 'intro_video_url', 'email', 'phone_number'];
    return requiredFields.some(field => !student[field]);
  };

  const filtered = students.filter((s) =>
    (!search || s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.university?.toLowerCase().includes(search.toLowerCase()) ||
    s.major?.toLowerCase().includes(search.toLowerCase())) &&
    (!showIncompleteOnly || isProfileIncomplete(s))
  );

  if (loading) return <p className="text-slate-400 text-center py-12">Loading candidates...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search by name, university, major…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {!adding &&
        <Button onClick={() => setAdding(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">+ Add Candidate</Button>
        }
        <Button onClick={() => setShowIncompleteOnly(!showIncompleteOnly)} variant="outline" className={`${showIncompleteOnly ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>📋 {showIncompleteOnly ? 'Show All' : 'Show Incomplete Only'}</Button>
        <Button onClick={markIncompleteAsPending} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">⚠ Mark Incomplete as Pending</Button>
      </div>

      {adding && <StudentForm onSave={handleSave} onCancel={() => setAdding(false)} />}

      {filtered.length === 0 && !adding && <p className="text-slate-400 text-center py-12">No candidates found.</p>}

      {filtered.map((s) =>
      <div key={s.id}>
          {editing?.id === s.id ?
        <StudentForm student={editing} onSave={handleSave} onCancel={() => setEditing(null)} /> :

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm font-semibold">
                    {s.full_name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <p className="font-bold text-slate-800">{s.full_name || 'Unnamed'}</p>
                     <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                     {isProfileIncomplete(s) && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Incomplete</span>}
                   </div>
                  <p className="text-sm text-slate-500 truncate">{[s.university, s.major, s.graduation_year ? `Class of ${s.graduation_year}` : null].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)} className="bg-slate-200 text-slate-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)} className="bg-slate-200 text-red-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
        }
        </div>
      )}
    </div>);

}