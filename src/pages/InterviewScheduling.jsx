import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Video, Phone, MapPin, Plus, Trash2, CheckCircle, X, User, Send, Bell } from 'lucide-react';

const locationTypeIcon = { video: Video, phone: Phone, in_person: MapPin };
const locationTypeLabel = { video: 'Video Call', phone: 'Phone Call', in_person: 'In Person' };
const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function InterviewScheduling() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recruiter: send request
  const [showSendRequest, setShowSendRequest] = useState(false);
  const [shortlistedStudents, setShortlistedStudents] = useState([]);
  const [requestForm, setRequestForm] = useState({ student_email: '', student_name: '', job_id: '', slot_ids: [], message: '' });

  // Student: incoming requests
  const [interviewRequests, setInterviewRequests] = useState([]);
  const [selectingRequest, setSelectingRequest] = useState(null);
  const [requestSlots, setRequestSlots] = useState([]);

  const [newSlot, setNewSlot] = useState({
    date: '', time: '', duration_minutes: 30,
    location_type: 'video', meeting_link: '', job_id: '', notes: ''
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);

    const [sp, rp] = await Promise.all([
      base44.entities.StudentProfile.filter({ created_by: u.email }),
      base44.entities.RecruiterProfile.filter({ created_by: u.email })
    ]);

    if (sp.length > 0) {
      setUserType('student');
      setProfile(sp[0]);
      const [myBookings, myRequests] = await Promise.all([
        base44.entities.InterviewBooking.filter({ student_email: u.email }),
        base44.entities.InterviewRequest.filter({ student_email: u.email })
      ]);
      setBookings(myBookings);
      setInterviewRequests(myRequests);
    } else if (rp.length > 0) {
      setUserType('recruiter');
      setProfile(rp[0]);
      const [mySlots, myJobs, myBookings, myShortlists] = await Promise.all([
        base44.entities.InterviewSlot.filter({ recruiter_email: u.email }),
        base44.entities.Job.filter({ created_by: u.email, status: 'active' }),
        base44.entities.InterviewBooking.filter({ recruiter_email: u.email }),
        base44.entities.Shortlist.filter({ created_by: u.email })
      ]);
      setSlots(mySlots.sort((a, b) => a.date.localeCompare(b.date)));
      setJobs(myJobs);
      setBookings(myBookings);
      // Get unique student emails from shortlists
      const uniqueEmails = [...new Set(myShortlists.map(s => s.student_email))];
      setShortlistedStudents(uniqueEmails.map(email => {
        const sl = myShortlists.find(s => s.student_email === email);
        return { email, job_id: sl?.job_id };
      }));
    }
    setLoading(false);
  };

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.time) return;
    setSaving(true);
    const job = jobs.find(j => j.id === newSlot.job_id);
    await base44.entities.InterviewSlot.create({
      ...newSlot,
      duration_minutes: Number(newSlot.duration_minutes),
      recruiter_email: user.email,
      recruiter_name: profile?.full_name || user.full_name,
      company: profile?.company || '',
      job_title: job?.title || '',
      status: 'available'
    });
    setShowAddSlot(false);
    setNewSlot({ date: '', time: '', duration_minutes: 30, location_type: 'video', meeting_link: '', job_id: '', notes: '' });
    setSaving(false);
    loadAll();
  };

  const handleDeleteSlot = async (slotId) => {
    await base44.entities.InterviewSlot.delete(slotId);
    loadAll();
  };

  const handleSendRequest = async () => {
    if (!requestForm.student_email || requestForm.slot_ids.length === 0) return;
    setSaving(true);
    const job = jobs.find(j => j.id === requestForm.job_id);
    await base44.entities.InterviewRequest.create({
      recruiter_email: user.email,
      recruiter_name: profile?.full_name || user.full_name,
      student_email: requestForm.student_email,
      company: profile?.company || '',
      job_id: requestForm.job_id,
      job_title: job?.title || '',
      slot_ids: requestForm.slot_ids,
      message: requestForm.message,
      status: 'pending'
    });
    setShowSendRequest(false);
    setRequestForm({ student_email: '', student_name: '', job_id: '', slot_ids: [], message: '' });
    setSaving(false);
  };

  const handleStudentSelectSlot = async (request, slot) => {
    setSaving(true);
    await Promise.all([
      base44.entities.InterviewBooking.create({
        slot_id: slot.id,
        student_email: user.email,
        student_name: profile?.full_name || user.full_name,
        recruiter_email: request.recruiter_email,
        company: request.company,
        job_title: request.job_title,
        date: slot.date,
        time: slot.time,
        duration_minutes: slot.duration_minutes,
        location_type: slot.location_type,
        meeting_link: slot.meeting_link,
        status: 'confirmed'
      }),
      base44.entities.InterviewSlot.update(slot.id, { status: 'booked' }),
      base44.entities.InterviewRequest.update(request.id, { status: 'accepted', accepted_slot_id: slot.id })
    ]);
    setSelectingRequest(null);
    setRequestSlots([]);
    setSaving(false);
    loadAll();
  };

  const openSelectSlot = async (request) => {
    setSelectingRequest(request);
    const slotData = await Promise.all(request.slot_ids.map(id =>
      base44.entities.InterviewSlot.filter({ id })
    ));
    setRequestSlots(slotData.flat().filter(s => s.status === 'available'));
  };

  const handleDeclineRequest = async (requestId) => {
    await base44.entities.InterviewRequest.update(requestId, { status: 'declined' });
    loadAll();
  };

  const handleCancelBooking = async (booking) => {
    await Promise.all([
      base44.entities.InterviewBooking.update(booking.id, { status: 'cancelled' }),
      base44.entities.InterviewSlot.update(booking.slot_id, { status: 'available' })
    ]);
    loadAll();
  };

  const toggleSlotInRequest = (slotId) => {
    setRequestForm(p => ({
      ...p,
      slot_ids: p.slot_ids.includes(slotId)
        ? p.slot_ids.filter(id => id !== slotId)
        : [...p.slot_ids, slotId]
    }));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── STUDENT VIEW ──
  if (userType === 'student') {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const pendingRequests = interviewRequests.filter(r => r.status === 'pending');

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2E3F4F]">Interviews</h1>
          <p className="text-[#7A7870] mt-1">Manage your interview requests and bookings</p>
        </div>

        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[#8FAFC4] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Interview Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-amber-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#2E3F4F]">{req.company}</p>
                      {req.job_title && <p className="text-sm text-[#7A7870]">{req.job_title}</p>}
                      {req.message && <p className="text-sm text-slate-600 mt-2 italic bg-[#EAF5FB] p-2 rounded border-l-2 border-[#5BA4C4]">"{req.message}"</p>}
                      <p className="text-xs text-[#7A7870] mt-2">{req.slot_ids?.length || 0} available time slot{req.slot_ids?.length !== 1 ? 's' : ''} offered</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(req.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                      <X className="w-3 h-3 mr-1" /> Decline
                    </Button>
                    <Button size="sm" onClick={() => openSelectSlot(req)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]">
                      <Calendar className="w-3 h-3 mr-1" /> Choose a Slot
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {confirmedBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-[#8FAFC4] uppercase tracking-wider mb-3">Upcoming Interviews</h2>
            <div className="space-y-3">
              {confirmedBookings.map(b => {
                const Icon = locationTypeIcon[b.location_type] || Video;
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-[#A8D4E8] p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#EAF5FB] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-[#3D87AA]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#2E3F4F]">{b.company}</p>
                        {b.job_title && <p className="text-sm text-[#7A7870]">{b.job_title}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-[#3D87AA] flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.date)}</span>
                          <span className="text-xs text-[#3D87AA] flex items-center gap-1"><Clock className="w-3 h-3" />{b.time} · {b.duration_minutes} min</span>
                          <span className="text-xs text-[#3D87AA] flex items-center gap-1"><Icon className="w-3 h-3" />{locationTypeLabel[b.location_type]}</span>
                        </div>
                        {b.meeting_link && <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5BA4C4] hover:underline mt-1 block">Join Meeting →</a>}
                      </div>
                    </div>
                    <button onClick={() => handleCancelBooking(b)} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {confirmedBookings.length === 0 && pendingRequests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E4DF]">
            <Calendar className="w-12 h-12 text-[#8FAFC4] mx-auto mb-3" />
            <p className="text-[#7A7870] font-medium">No interviews yet</p>
            <p className="text-sm text-[#8FAFC4] mt-1">Interview requests from recruiters will appear here</p>
          </div>
        )}

        {/* Choose Slot Dialog */}
        <Dialog open={!!selectingRequest} onOpenChange={() => { setSelectingRequest(null); setRequestSlots([]); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Choose Your Interview Slot</DialogTitle></DialogHeader>
            {selectingRequest && (
              <div className="space-y-3">
                <p className="text-sm text-[#7A7870]">Select a time that works for you:</p>
                {requestSlots.length === 0 ? (
                  <p className="text-center text-slate-400 py-6">No available slots found</p>
                ) : (
                  requestSlots.map(slot => {
                    const Icon = locationTypeIcon[slot.location_type] || Video;
                    return (
                      <button key={slot.id} onClick={() => handleStudentSelectSlot(selectingRequest, slot)} disabled={saving}
                        className="w-full text-left p-4 bg-white border-2 border-[#E8E4DF] rounded-xl hover:border-[#5BA4C4] hover:bg-[#EAF5FB] transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#2E3F4F]">{formatDate(slot.date)} at {slot.time}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-[#7A7870] flex items-center gap-1"><Clock className="w-3 h-3" />{slot.duration_minutes} min</span>
                              <span className="text-xs text-[#7A7870] flex items-center gap-1"><Icon className="w-3 h-3" />{locationTypeLabel[slot.location_type]}</span>
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-[#A8D4E8]" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── RECRUITER VIEW ──
  const upcomingSlots = slots.filter(s => s.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const availableSlots = slots.filter(s => s.status === 'available');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2E3F4F]">Interviews</h1>
          <p className="text-[#7A7870] mt-1">Manage slots and send interview requests to candidates</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setShowAddSlot(true)} className="border-[#A8D4E8] text-[#3D87AA]">
            <Plus className="w-4 h-4 mr-1" /> Add Slot
          </Button>
          <Button onClick={() => setShowSendRequest(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA]" disabled={availableSlots.length === 0}>
            <Send className="w-4 h-4 mr-1" /> Send Request
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="mb-6 bg-white border border-slate-100 shadow-sm">
          <TabsTrigger value="bookings" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
            Booked ({confirmedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="slots" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
            My Slots ({upcomingSlots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          {confirmedBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E4DF]">
              <User className="w-12 h-12 text-[#8FAFC4] mx-auto mb-3" />
              <p className="text-[#7A7870] font-medium">No confirmed interviews yet</p>
              <p className="text-sm text-[#8FAFC4] mt-1">Send interview requests to shortlisted candidates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedBookings.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-[#A8D4E8] p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#3D87AA]" />
                      <p className="font-semibold text-[#2E3F4F]">{b.student_name}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#7A7870]">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time}</span>
                    </div>
                  </div>
                  {b.job_title && <p className="text-sm text-[#7A7870] mt-1 ml-6">{b.job_title}</p>}
                  {b.meeting_link && <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5BA4C4] hover:underline mt-1 ml-6 block">Join Meeting →</a>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="slots">
          {upcomingSlots.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E4DF]">
              <Calendar className="w-12 h-12 text-[#8FAFC4] mx-auto mb-3" />
              <p className="text-[#7A7870] font-medium">No slots yet</p>
              <Button onClick={() => setShowAddSlot(true)} className="mt-4 bg-[#5BA4C4] hover:bg-[#3D87AA]"><Plus className="w-4 h-4 mr-1" />Add Slot</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSlots.map(slot => {
                const Icon = locationTypeIcon[slot.location_type] || Video;
                const statusColors = { available: 'bg-green-100 text-green-700', booked: 'bg-[#EAF5FB] text-[#3D87AA]', cancelled: 'bg-slate-100 text-slate-400' };
                return (
                  <div key={slot.id} className="bg-white rounded-2xl border border-[#E8E4DF] p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#5BA4C4]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#2E3F4F]">{formatDate(slot.date)} at {slot.time}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[slot.status]}`}>{slot.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-[#7A7870] flex items-center gap-1"><Clock className="w-3 h-3" />{slot.duration_minutes} min</span>
                          <span className="text-xs text-[#7A7870]">{locationTypeLabel[slot.location_type]}</span>
                          {slot.job_title && <span className="text-xs text-[#7A7870]">· {slot.job_title}</span>}
                        </div>
                      </div>
                    </div>
                    {slot.status === 'available' && (
                      <button onClick={() => handleDeleteSlot(slot.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Slot Dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Interview Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Date *</label>
                <Input type="date" value={newSlot.date} onChange={e => setNewSlot(p => ({ ...p, date: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Time *</label>
                <Input type="time" value={newSlot.time} onChange={e => setNewSlot(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Duration</label>
                <Select value={String(newSlot.duration_minutes)} onValueChange={v => setNewSlot(p => ({ ...p, duration_minutes: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Format</label>
                <Select value={newSlot.location_type} onValueChange={v => setNewSlot(p => ({ ...p, location_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {jobs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Linked Job (optional)</label>
                <Select value={newSlot.job_id} onValueChange={v => setNewSlot(p => ({ ...p, job_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Meeting Link (optional)</label>
              <Input placeholder="https://zoom.us/..." value={newSlot.meeting_link} onChange={e => setNewSlot(p => ({ ...p, meeting_link: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
              <Input placeholder="Any instructions..." value={newSlot.notes} onChange={e => setNewSlot(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={handleAddSlot} disabled={saving || !newSlot.date || !newSlot.time} className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA]">
              {saving ? 'Adding...' : 'Add Slot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Interview Request Dialog */}
      <Dialog open={showSendRequest} onOpenChange={setShowSendRequest}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Send Interview Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Candidate *</label>
              <Select value={requestForm.student_email} onValueChange={v => setRequestForm(p => ({ ...p, student_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a shortlisted candidate..." /></SelectTrigger>
                <SelectContent>
                  {shortlistedStudents.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {jobs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">For Job (optional)</label>
                <Select value={requestForm.job_id} onValueChange={v => setRequestForm(p => ({ ...p, job_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Select Time Slots to Offer * <span className="text-slate-400 font-normal normal-case">(choose one or more)</span></label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-slate-400 py-3">No available slots. Add slots first.</p>
              ) : (
                <div className="space-y-2">
                  {availableSlots.map(slot => {
                    const Icon = locationTypeIcon[slot.location_type] || Video;
                    const selected = requestForm.slot_ids.includes(slot.id);
                    return (
                      <button key={slot.id} type="button" onClick={() => toggleSlotInRequest(slot.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selected ? 'border-[#5BA4C4] bg-[#EAF5FB]' : 'border-slate-200 hover:border-[#A8D4E8]'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#2E3F4F]">{formatDate(slot.date)} at {slot.time}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#7A7870]"><Clock className="w-3 h-3 inline mr-0.5" />{slot.duration_minutes} min</span>
                              <span className="text-xs text-[#7A7870]"><Icon className="w-3 h-3 inline mr-0.5" />{locationTypeLabel[slot.location_type]}</span>
                            </div>
                          </div>
                          {selected && <CheckCircle className="w-5 h-5 text-[#5BA4C4]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Message (optional)</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#5BA4C4]"
                rows={3}
                placeholder="Hi, we'd love to chat with you about this opportunity..."
                value={requestForm.message}
                onChange={e => setRequestForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <Button onClick={handleSendRequest} disabled={saving || !requestForm.student_email || requestForm.slot_ids.length === 0} className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA]">
              <Send className="w-4 h-4 mr-2" />{saving ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}