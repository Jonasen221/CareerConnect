import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Plus, Lock, Globe, CheckCircle, X, Pencil, Download, CalendarPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDemoPreview } from '@/lib/DemoPreviewContext';

const EVENT_TYPES = [{ value: "panel", label: "Panel" }, { value: "company_visit", label: "Company Visit" }, { value: "career_fair", label: "Career Fair" }, { value: "workshop", label: "Workshop" }, { value: "networking", label: "Networking" }, { value: "other", label: "Other" }];
const TYPE_STYLE = { panel: 'bg-[#EAF5FB] text-[#3D87AA]', company_visit: 'bg-[#EAF5FB] text-[#2d6d8e]', career_fair: 'bg-[#d4ead4] text-[#2d6e2d]', workshop: 'bg-[#fef3cd] text-[#7a5c1e]', networking: 'bg-[#fde4e4] text-[#7a2d2d]', other: 'bg-[#E8E4DF] text-[#7A7870]' };

export default function EventsPage() {
  const { previewMode, skipProfileGates } = useDemoPreview();
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [invites, setInvites] = useState([]);
  const [gameProgress, setGameProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingToGCal, setAddingToGCal] = useState(null);
  const [formData, setFormData] = useState({ title: '', company: '', description: '', event_type: 'panel', access_type: 'open', date: '', time: '', end_time: '', location: '', max_attendees: '' });

  useEffect(() => {loadData();}, [previewMode]);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [sp, rp] = await Promise.all([
    base44.entities.StudentProfile.filter({ created_by: u.email }),
    base44.entities.RecruiterProfile.filter({ created_by: u.email })]
    );
    let type = u.role === 'admin' ? 'admin' : sp.length > 0 ? 'student' : rp.length > 0 ? 'recruiter' : null;
    if (u.role === 'admin' && previewMode === 'student') type = 'student';
    if (u.role === 'admin' && previewMode === 'recruiter') type = 'recruiter';
    if (u.role === 'admin' && previewMode === 'off') type = 'admin';
    setUserType(type);

    const [allEvents, myRsvps, myInvites, myProgress] = await Promise.all([
    base44.entities.Event.list('-date'),
    base44.entities.EventRSVP.filter({ created_by: u.email }),
    base44.entities.EventInvite.filter({ student_email: u.email }),
    base44.entities.GameProgress.filter({ created_by: u.email })]
    );
    setEvents(allEvents);
    setRsvps(myRsvps);
    setInvites(myInvites);
    setGameProgress(myProgress[0] || null);
    setLoading(false);
  };

  const XP_PER_RSVP = 200;

  const handleRSVP = async (event) => {
    const existing = rsvps.find((r) => r.event_id === event.id);
    if (existing) {
      setRsvps((prev) => prev.filter((r) => r.event_id !== event.id));
      base44.entities.EventRSVP.delete(existing.id);
    } else {
      const currentXP = gameProgress?.total_xp || 0;
      if (!skipProfileGates && currentXP < XP_PER_RSVP) {
        alert(`You need ${XP_PER_RSVP} XP to RSVP to an event. You have ${currentXP} XP. Play games in Career Arena to earn more XP!`);
        return;
      }
      // Optimistic add
      const optimistic = { id: `opt-${Date.now()}`, event_id: event.id, status: 'going' };
      setRsvps((prev) => [...prev, optimistic]);
      const newXP = currentXP - XP_PER_RSVP;
      setGameProgress((p) => ({ ...p, total_xp: newXP }));
      base44.entities.EventRSVP.create({ event_id: event.id, status: 'going' });
      if (gameProgress?.id) {
        base44.entities.GameProgress.update(gameProgress.id, { total_xp: newXP });
      }
      // Auto-add to Google Calendar
      base44.functions.invoke('addToGoogleCalendar', {
        title: event.title,
        description: `${event.company ? event.company + ' - ' : ''}${event.description || ''}`,
        date: event.date,
        time: event.time || '',
        location: event.location || '',
        duration_minutes: calcDurationMinutes(event.time, event.end_time),
      }).catch(() => {});
    }
  };

  const handleInviteResponse = async (invite, status) => {
    await base44.entities.EventInvite.update(invite.id, { status });
    const updated = await base44.entities.EventInvite.filter({ student_email: user.email });
    setInvites(updated);
  };

  const calcDurationMinutes = (startTime, endTime) => {
    if (!startTime || !endTime) return 120;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 120;
  };

  const addToGoogleCalendar = async (event) => {
    setAddingToGCal(event.id);
    try {
      await base44.functions.invoke('addToGoogleCalendar', {
        title: event.title,
        description: `${event.company ? event.company + ' - ' : ''}${event.description || ''}`,
        date: event.date,
        time: event.time || '',
        location: event.location || '',
        duration_minutes: calcDurationMinutes(event.time, event.end_time),
      });
      alert('Event added to your Google Calendar!');
    } catch (e) { alert('Failed: ' + e.message); }
    setAddingToGCal(null);
  };

  const downloadToCalendar = (event) => {
    const startDateTime = event.date && event.time ?
    new Date(event.date + 'T' + event.time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') :
    new Date(event.date + 'T00:00:00').toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const endStr = event.date && event.end_time ? event.date + 'T' + event.end_time :
      event.date && event.time ? new Date(new Date(event.date + 'T' + event.time).getTime() + 120 * 60000).toISOString() :
      new Date(event.date + 'T02:00:00').toISOString();
    const endDateTime = new Date(endStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareerConnect//Event//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@careerconnect.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
DESCRIPTION:${event.company ? event.company + ' - ' : ''}${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT
END:VCALENDAR`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(icsContent));
    element.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveEvent = async () => {
    setSaving(true);
    const data = { ...formData, company: formData.company || events.find((e) => e.created_by === user.email)?.company || '', max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null };
    if (editingEvent) await base44.entities.Event.update(editingEvent.id, data);else
    await base44.entities.Event.create(data);
    setShowForm(false);setEditingEvent(null);setSaving(false);
    loadData();
  };

  const isRsvped = (eventId) => rsvps.some((r) => r.event_id === eventId);
  const myEvents = events.filter((e) => e.created_by === user?.email);
  const openEvents = events.filter((e) => e.access_type === 'open');
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  const EventCard = ({ event, showRsvp, showManage }) => {
    const typeStyle = TYPE_STYLE[event.event_type] || TYPE_STYLE.other;
    const rsvped = isRsvped(event.id);
    const eventDate = event.date ? new Date(event.date + 'T00:00:00') : null;
    const headerGradient = rsvped
      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
      : 'bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]';
    return (
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${rsvped ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-[#E8E4DF]'}`}>
        <div className={`${headerGradient} p-5`}>
          <div className="flex items-start justify-between mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeStyle}`}>{EVENT_TYPES.find((t) => t.value === event.event_type)?.label || event.event_type}</span>
            <div className="flex items-center gap-2">
              {rsvped && <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold"><CheckCircle className="w-3 h-3" />Going</span>}
              <span className="flex items-center gap-1 text-xs text-white/70">{event.access_type === 'invite_only' ? <><Lock className="w-3 h-3" />Invite Only</> : <><Globe className="w-3 h-3" />Open</>}</span>
            </div>
          </div>
          <h3 className="font-bold text-white text-lg">{event.title}</h3>
          <p className="text-white/80 text-sm">{event.company}</p>
        </div>
        <div className="text-slate-700 p-5 space-y-3">
          <div className="flex flex-wrap gap-3 text-sm text-[#7A7870]">
            {eventDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(eventDate, 'MMM d, yyyy')}{event.time && ` · ${event.time}${event.end_time ? ` – ${event.end_time}` : ''}`}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
            {event.max_attendees && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {event.max_attendees}</span>}
          </div>
          {event.description && <p className="text-[#7A7870] text-sm line-clamp-2">{event.description}</p>}
          <div className="flex gap-2 pt-1 flex-wrap">
            {showRsvp && event.access_type === 'open' &&
              <Button size="sm" onClick={() => handleRSVP(event)} className={`flex-1 min-w-[100px] ${rsvped ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-0' : 'bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]'}`}>
                {rsvped ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Going</> : '⚡ RSVP (200 XP)'}
              </Button>
            }
            <Button size="sm" variant="outline" onClick={() => downloadToCalendar(event)} title="Download .ics">
              <Download className="w-3.5 h-3.5 mr-1.5" />.ics
            </Button>
            <Button size="sm" onClick={() => addToGoogleCalendar(event)} disabled={addingToGCal === event.id} className="bg-white border border-[#A8D4E8] text-[#3D87AA] hover:bg-[#EAF5FB]">
              {addingToGCal === event.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />}Google
            </Button>
            {showManage &&
              <Button size="sm" variant="outline" onClick={() => {setEditingEvent(event);setFormData({ ...event, max_attendees: event.max_attendees || '' });setShowForm(true);}} className="flex-1">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
              </Button>
            }
          </div>
        </div>
      </div>);

  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Events 🎪</h1>
            <p className="text-white/80 mt-1">Panels, career fairs, workshops and more</p>
            {userType === 'student' && <p className="text-white/70 text-sm mt-1">⚡ {gameProgress?.total_xp || 0} XP · Each RSVP costs 200 XP</p>}
          </div>
          {(userType === 'recruiter' || userType === 'admin') &&
          <Button onClick={() => {setEditingEvent(null);setFormData({ title: '', company: '', description: '', event_type: 'panel', access_type: 'open', date: '', time: '', end_time: '', location: '', max_attendees: '' });setShowForm(true);}} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] font-bold">
              <Plus className="w-4 h-4 mr-2" />Create Event
            </Button>
          }
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 -mt-6">

      {userType === 'student' ?
        <Tabs defaultValue="open">
          <TabsList className="bg-white shadow-sm border border-[#E8E4DF] mb-6">
            <TabsTrigger value="open">Open Events</TabsTrigger>
            <TabsTrigger value="invites">My Invites {pendingInvites.length > 0 && <span className="ml-1.5 bg-[#5BA4C4] text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pendingInvites.length}</span>}</TabsTrigger>
            <TabsTrigger value="rsvps">My RSVPs</TabsTrigger>
          </TabsList>
          <TabsContent value="open">
            <div className="grid md:grid-cols-2 gap-4">
              {openEvents.length === 0 ? <div className="col-span-full text-center py-16 text-[#7A7870]">No open events available yet</div> : openEvents.map((e) => <EventCard key={e.id} event={e} showRsvp={true} />)}
            </div>
          </TabsContent>
          <TabsContent value="invites">
            <div className="space-y-4">
              {invites.length === 0 ? <div className="text-center py-16 text-[#7A7870]">No invites yet</div> : invites.map((invite) => {
                const event = events.find((e) => e.id === invite.event_id);
                if (!event) return null;
                return (
                  <div key={invite.id} className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm p-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[#2E3F4F]">{event.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${invite.status === 'pending' ? 'bg-[#fef3cd] text-[#7a5c1e]' : invite.status === 'accepted' ? 'bg-[#d4ead4] text-[#2d6e2d]' : 'bg-[#fde4e4] text-[#7a2d2d]'}`}>{invite.status}</span>
                      </div>
                      <p className="text-[#7A7870] text-sm">{event.company} · {event.date}</p>
                    </div>
                    {invite.status === 'pending' &&
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleInviteResponse(invite, 'declined')} className="text-red-600 border-red-200 hover:bg-red-50"><X className="w-3.5 h-3.5 mr-1" />Decline</Button>
                        <Button size="sm" onClick={() => handleInviteResponse(invite, 'accepted')} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]"><CheckCircle className="w-3.5 h-3.5 mr-1" />Accept</Button>
                      </div>
                    }
                  </div>);

              })}
            </div>
          </TabsContent>
          <TabsContent value="rsvps">
            <div className="grid md:grid-cols-2 gap-4">
              {rsvps.length === 0 ? <div className="col-span-full text-center py-16 text-[#7A7870]">You haven't RSVP'd to any events yet</div> :
              rsvps.map((rsvp) => {const event = events.find((e) => e.id === rsvp.event_id);return event ? <EventCard key={rsvp.id} event={event} showRsvp={true} /> : null;})}
            </div>
          </TabsContent>
        </Tabs> :

        <Tabs defaultValue="all">
          <TabsList className="bg-white shadow-sm border border-[#E8E4DF] mb-6">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="mine">My Events</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="grid md:grid-cols-2 gap-4">
              {events.length === 0 ? <div className="col-span-full text-center py-16 text-[#7A7870]">No events yet</div> : events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </TabsContent>
          <TabsContent value="mine">
            <div className="grid md:grid-cols-2 gap-4">
              {myEvents.length === 0 ? <div className="col-span-full text-center py-16 text-[#7A7870]">You haven't created any events yet</div> : myEvents.map((e) => <EventCard key={e.id} event={e} showManage={true} />)}
            </div>
          </TabsContent>
        </Tabs>
        }

      <Dialog open={showForm} onOpenChange={(v) => {if (!v) {setShowForm(false);setEditingEvent(null);}}}>
        <DialogContent className="bg-slate-50 text-slate-600 p-6 fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-sm font-semibold text-[#2E3F4F]">Event Title *</Label><Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="mt-1.5" placeholder="Summer Internship Info Session" /></div>
            <div><Label className="text-sm font-semibold text-[#2E3F4F]">Company</Label><Input value={formData.company} onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))} className="mt-1.5" placeholder="Acme Corp" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm font-semibold text-[#2E3F4F]">Type</Label><Select value={formData.event_type} onValueChange={(v) => setFormData((p) => ({ ...p, event_type: v }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-sm font-semibold text-[#2E3F4F]">Access</Label><Select value={formData.access_type} onValueChange={(v) => setFormData((p) => ({ ...p, access_type: v }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="invite_only">Invite Only</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-sm font-semibold text-[#2E3F4F]">Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-sm font-semibold text-[#2E3F4F]">Start Time</Label><Input type="time" value={formData.time} onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-sm font-semibold text-[#2E3F4F]">End Time</Label><Input type="time" value={formData.end_time || ''} onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label className="text-sm font-semibold text-[#2E3F4F]">Location</Label><Input value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} className="mt-1.5" placeholder="New York, NY or Zoom link" /></div>
            <div><Label className="text-sm font-semibold text-[#2E3F4F]">Max Attendees</Label><Input type="number" value={formData.max_attendees} onChange={(e) => setFormData((p) => ({ ...p, max_attendees: e.target.value }))} className="mt-1.5" placeholder="50" /></div>
            <div><Label className="text-sm font-semibold text-[#2E3F4F]">Description</Label><Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="mt-1.5 resize-none" rows={3} placeholder="Tell candidates about this event..." /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {setShowForm(false);setEditingEvent(null);}} className="bg-red-50 text-red-800 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9 flex-1">Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={saving || !formData.title} className="flex-1 bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">{saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>);

}