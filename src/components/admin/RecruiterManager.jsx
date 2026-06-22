import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileSelect from '../layout/MobileSelect';
import { Pencil, Trash2, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusPill, { STATUS_OPTIONS, FlaggedPill } from './StatusPill';
import { logAdminAction } from '@/lib/adminLog';
import { useAuth } from '@/lib/AuthContext';

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const EMPTY = { full_name: '', company: '', title: '', industry: '', company_website: '', status: 'pending' };

function RecruiterForm({ recruiter, onSave, onCancel }) {
  const [form, setForm] = useState(recruiter || EMPTY);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Full name *" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="text-black" />
        <Input placeholder="Company *" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="text-black" />
        <Input placeholder="Job title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="text-black" />
        <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="text-black" />
        <Input placeholder="Company website" value={form.company_website} onChange={(e) => setForm((f) => ({ ...f, company_website: e.target.value }))} className="text-black" />
        <MobileSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="Status" options={STATUS_SELECT_OPTIONS} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.full_name || !form.company} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Check className="w-4 h-4 mr-1" /> Save Recruiter
        </Button>
      </div>
    </div>);

}

export default function RecruiterManager() {
  const { user } = useAuth();
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {load();}, []);

  const load = async () => {
    setLoading(true);
    const r = await base44.entities.RecruiterProfile.list();
    setRecruiters(r);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.RecruiterProfile.update(editing.id, form);
      await logAdminAction(user, {
        action: 'edit_profile',
        target_type: 'recruiter_profile',
        target_id: editing.id,
        target_label: form.full_name || editing.full_name,
        metadata: { source: 'RecruiterManager', status: form.status },
      });
      setEditing(null);
    } else {
      const created = await base44.entities.RecruiterProfile.create(form);
      await logAdminAction(user, {
        action: 'create_profile',
        target_type: 'recruiter_profile',
        target_id: created?.id ?? null,
        target_label: form.full_name,
        metadata: { source: 'RecruiterManager' },
      });
      setAdding(false);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recruiter profile?')) return;
    const target = recruiters.find((r) => r.id === id);
    await base44.entities.RecruiterProfile.delete(id);
    await logAdminAction(user, {
      action: 'delete_profile',
      target_type: 'recruiter_profile',
      target_id: id,
      target_label: target?.full_name ?? '',
    });
    load();
  };

  const filtered = recruiters.filter((r) =>
  !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
  r.company?.toLowerCase().includes(search.toLowerCase()) ||
  r.industry?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-slate-400 text-center py-12">Loading recruiters...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input placeholder="Search by name, company, industry…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {!adding &&
        <Button onClick={() => setAdding(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">+ Add Recruiter</Button>
        }
      </div>

      {adding && <RecruiterForm onSave={handleSave} onCancel={() => setAdding(false)} />}

      {filtered.length === 0 && !adding && <p className="text-slate-400 text-center py-12">No recruiters found.</p>}

      {filtered.map((r) =>
      <div key={r.id}>
          {editing?.id === r.id ?
        <RecruiterForm recruiter={editing} onSave={handleSave} onCancel={() => setEditing(null)} /> :

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm font-semibold">
                    {r.full_name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800">{r.full_name || 'Unnamed'}</p>
                    <StatusPill status={r.status} />
                    {r.flagged && <FlaggedPill />}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{[r.company, r.title, r.industry].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)} className="bg-slate-200 text-slate-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)} className="bg-slate-200 text-red-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
        }
        </div>
      )}
    </div>);

}