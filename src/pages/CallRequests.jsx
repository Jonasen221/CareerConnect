import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, X, Calendar, Clock, MessageCircle, Building2, Link as LinkIcon, CalendarPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CallRequests() {
  const [user, setUser] = useState(null);
  const [callRequests, setCallRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({ meeting_link: '' });
  const [saving, setSaving] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const requests = await base44.entities.CallRequest.filter({ student_email: u.email });
    setCallRequests(requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  const handleAccept = async (request) => {
    setSelectedRequest(request);
    setFormData({ meeting_link: '' });
    setShowResponseModal(true);
  };

  const handleDecline = async (request) => {
    if (confirm('Are you sure you want to decline this call request?')) {
      await base44.entities.CallRequest.update(request.id, { status: 'declined' });
      loadData();
    }
  };

  const handleAddToCalendar = async (request) => {
    setAddingToCalendar(request.id);
    try {
      await base44.functions.invoke('addToGoogleCalendar', {
        title: `Interview with ${request.recruiter_name} - ${request.company}`,
        description: `Meeting link: ${request.meeting_link}\n\nJob: ${request.job_title || ''}\nMessage: ${request.message || ''}`,
        date: request.scheduled_date || request.proposed_date,
        time: request.scheduled_time || request.proposed_time,
        location: request.meeting_link,
        duration_minutes: 60,
      });
      alert('Added to your Google Calendar!');
    } catch (e) { alert('Failed to add to calendar: ' + e.message); }
    setAddingToCalendar(null);
  };

  const handleConfirmAccept = async () => {
    if (!formData.meeting_link.trim()) {
      alert('Please add a meeting link');
      return;
    }

    setSaving(true);
    await base44.entities.CallRequest.update(selectedRequest.id, {
      status: 'scheduled',
      scheduled_date: selectedRequest.proposed_date,
      scheduled_time: selectedRequest.proposed_time,
      meeting_link: formData.meeting_link
    });
    setShowResponseModal(false);
    loadData();
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  const pending = callRequests.filter((r) => r.status === 'pending');
  const scheduled = callRequests.filter((r) => r.status === 'scheduled');
  const completed = callRequests.filter((r) => r.status === 'completed');

  const RequestCard = ({ request, showActions = false }) => {
    const isPending = request.status === 'pending';
    const isScheduled = request.status === 'scheduled';

    return (
      <Card className="border-[#E8E4DF]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-slate-800">{request.recruiter_name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                request.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                request.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                'bg-red-100 text-red-700'}`
                }>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-600 flex items-center gap-1"><Building2 className="w-4 h-4" />{request.company}</p>
              {request.job_title && <p className="text-sm text-slate-600">{request.job_title}</p>}
            </div>
          </div>

          {request.message &&
          <div className="bg-slate-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" />Message</p>
              <p className="text-sm text-slate-700">{request.message}</p>
            </div>
          }

          <div className="space-y-2 mb-4 text-sm">
            {request.proposed_date &&
            <p className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                {format(new Date(request.proposed_date), 'MMM d, yyyy')}
                {request.proposed_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{request.proposed_time}</span>}
              </p>
            }
            {request.meeting_link && isScheduled &&
            <p className="flex items-center gap-2 text-slate-600">
                <LinkIcon className="w-4 h-4" />
                <a href={request.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[#5BA4C4] hover:underline truncate">
                  {request.meeting_link}
                </a>
              </p>
            }
            {isScheduled && (
              <Button size="sm" variant="outline" onClick={() => handleAddToCalendar(request)} disabled={addingToCalendar === request.id} className="mt-1 text-[#3D87AA] border-[#A8D4E8] hover:bg-[#EAF5FB]">
                {addingToCalendar === request.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1" />}
                Add to Google Calendar
              </Button>
            )}
          </div>

          {showActions && isPending &&
          <div className="space-y-2">
              <a
              href="https://www.when2meet.com/?newEvent"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs bg-[#EAF5FB] border border-[#A8D4E8] text-[#3D87AA] px-3 py-2 rounded-lg hover:bg-[#daeef7] transition-colors font-semibold w-full">

                <LinkIcon className="w-3.5 h-3.5" />
                📅 Create a When2Meet to agree on a time
              </a>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDecline(request)} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                  <X className="w-3.5 h-3.5 mr-1" />Decline
                </Button>
                <Button size="sm" onClick={() => handleAccept(request)} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept
                </Button>
              </div>
            </div>
          }
        </CardContent>
      </Card>);

  };

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white">Call Requests 📞</h1>
          <p className="text-white/80 mt-1">Manage recruiter call requests</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-12">
        <Tabs defaultValue="pending">
          <TabsList className="bg-white shadow-sm border border-slate-100 mb-6">
            <TabsTrigger value="pending">Pending {pending.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pending.length}</span>}</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled {scheduled.length > 0 && <span className="ml-1.5 bg-blue-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{scheduled.length}</span>}</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-4">
              {pending.length === 0 ?
              <div className="text-center py-12 text-slate-400">No pending call requests</div> :

              pending.map((request) => <RequestCard key={request.id} request={request} showActions={true} />)
              }
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <div className="space-y-4">
              {scheduled.length === 0 ?
              <div className="text-center py-12 text-slate-400">No scheduled calls</div> :

              scheduled.map((request) => <RequestCard key={request.id} request={request} />)
              }
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completed.length === 0 ?
              <div className="text-center py-12 text-slate-400">No completed calls yet</div> :

              completed.map((request) => <RequestCard key={request.id} request={request} />)
              }
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Accept Call Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-600 mb-1">From</p>
              <p className="font-bold text-slate-800">{selectedRequest?.recruiter_name}</p>
              <p className="text-sm text-slate-600">{selectedRequest?.company}</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Meeting Link *</Label>
              <p className="text-xs text-slate-500 mb-2">Zoom, Google Meet, Teams, etc.</p>
              <Input
                type="url"
                placeholder="https://zoom.us/j/..."
                value={formData.meeting_link}
                onChange={(e) => setFormData((p) => ({ ...p, meeting_link: e.target.value }))}
                className="mt-1.5" />

              <div className="mt-2 p-3 bg-[#EAF5FB] border border-[#A8D4E8] rounded-lg">
                <p className="text-xs text-[#3D87AA] font-semibold mb-1">📅 Need to find a time first?</p>
                <p className="text-xs text-slate-600 mb-2">Use When2Meet to share your availability and agree on a time before confirming.</p>
                <a
                  href="https://www.when2meet.com/?newEvent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-white border border-[#A8D4E8] text-[#3D87AA] px-3 py-1.5 rounded-lg hover:bg-[#EAF5FB] transition-colors font-semibold">

                  <LinkIcon className="w-3.5 h-3.5" />
                  Create a When2Meet
                </a>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                ✓ Call scheduled for <strong>{selectedRequest?.proposed_date && format(new Date(selectedRequest.proposed_date), 'MMM d, yyyy')}</strong>
                {selectedRequest?.proposed_time && <strong> at {selectedRequest.proposed_time}</strong>}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowResponseModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleConfirmAccept} disabled={saving} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
                {saving ? 'Confirming...' : 'Confirm & Send Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}