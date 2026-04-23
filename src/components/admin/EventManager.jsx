import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MobileSelect from '../layout/MobileSelect';
import { Pencil, Trash2, Plus, Check } from 'lucide-react';

const EMPTY = {
  title: '', company: '', description: '', event_type: 'panel',
  access_type: 'open', date: '', time: '', end_time: '', location: '', max_attendees: ''
};

function EventForm({ event, onSave, onCancel }) {
  const [form, setForm] = useState(event || EMPTY);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Event title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Input placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
        <Input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Start time</label>
          <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">End time</label>
          <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
        </div>
        <Input type="number" placeholder="Max attendees" value={form.max_attendees} onChange={(e) => setForm((f) => ({ ...f, max_attendees: e.target.value }))} />
        <MobileSelect value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))} placeholder="Event Type" options={[{ value: 'panel', label: 'Panel' }, { value: 'company_visit', label: 'Company Visit' }, { value: 'career_fair', label: 'Career Fair' }, { value: 'workshop', label: 'Workshop' }, { value: 'networking', label: 'Networking' }, { value: 'company_webinar', label: 'Company Webinar' }, { value: 'other', label: 'Other' }]} />
        <MobileSelect value={form.access_type} onValueChange={(v) => setForm((f) => ({ ...f, access_type: v }))} placeholder="Access Type" options={[{ value: 'open', label: 'Open' }, { value: 'invite_only', label: 'Invite Only' }]} />
      </div>
      <Textarea placeholder="Event description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-24" />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Check className="w-4 h-4 mr-1" /> Save Event
        </Button>
      </div>
    </div>);

}

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {load();}, []);

  const load = async () => {
    setLoading(true);
    const e = await base44.entities.Event.list();
    setEvents(e);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.Event.update(editing.id, form);
      setEditing(null);
    } else {
      await base44.entities.Event.create(form);
      setAdding(false);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    await base44.entities.Event.delete(id);
    load();
  };

  const typeLabels = { panel: 'Panel', company_visit: 'Company Visit', career_fair: 'Career Fair', workshop: 'Workshop', networking: 'Networking', company_webinar: 'Company Webinar', other: 'Other' };

  if (loading) return <p className="text-slate-400 text-center py-12">Loading events...</p>;

  return (
    <div className="space-y-4">
      {!adding &&
      <Button onClick={() => setAdding(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      }

      {adding && <EventForm onSave={handleSave} onCancel={() => setAdding(false)} />}

      {events.length === 0 && !adding &&
      <p className="text-slate-400 text-center py-12">No events yet. Add your first one!</p>
      }

      {events.map((event) =>
      <div key={event.id}>
          {editing?.id === event.id ?
        <EventForm event={editing} onSave={handleSave} onCancel={() => setEditing(null)} /> :

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{event.title}</p>
                  <span className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full font-semibold">{typeLabels[event.event_type] || event.event_type}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.access_type === 'open' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{event.access_type === 'open' ? 'Open' : 'Invite Only'}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{event.company}{event.location ? ` · ${event.location}` : ''}{event.date ? ` · ${event.date}` : ''}</p>
                {event.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{event.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditing(event)} className="bg-slate-200 text-slate-600 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(event.id)} className="bg-slate-200 text-red-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
        }
        </div>
      )}
    </div>);

}