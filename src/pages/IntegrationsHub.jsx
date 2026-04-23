import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Lock, Users, BarChart2, BookOpen, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function IntegrationsHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  // Calendar form
  const [calForm, setCalForm] = useState({ title: '', description: '', date: '', time: '', location: '', duration_minutes: 60 });
  const [calSaving, setCalSaving] = useState(false);

  // Block time form
  const [blockForm, setBlockForm] = useState({ title: 'Busy', date: '', start_time: '', end_time: '', reason: '' });
  const [blockSaving, setBlockSaving] = useState(false);

  // Notion form
  const [notionForm, setNotionForm] = useState({ student_email: '', database_id: '' });
  const [notionSaving, setNotionSaving] = useState(false);

  // Analytics stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      if (u.role !== 'admin') { navigate('/'); return; }
      setUser(u);
      loadStats();
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [students, recruiters, jobs, matches, swipes, events, messages] = await Promise.all([
        base44.entities.StudentProfile.list(),
        base44.entities.RecruiterProfile.list(),
        base44.entities.Job.list(),
        base44.entities.Match.list(),
        base44.entities.Swipe.list(),
        base44.entities.Event.list(),
        base44.entities.Message.list(),
      ]);

      const rightSwipes = swipes.filter(s => s.direction === 'right');
      const leftSwipes = swipes.filter(s => s.direction === 'left');
      
      // Job engagement by job
      const jobEngagement = {};
      swipes.forEach(s => {
        if (!jobEngagement[s.job_id]) jobEngagement[s.job_id] = { right: 0, left: 0 };
        jobEngagement[s.job_id][s.direction]++;
      });

      // Match rate
      const matchRate = swipes.length > 0 ? ((matches.length / rightSwipes.length) * 100).toFixed(1) : 0;

      setStats({
        students: students.length,
        approvedStudents: students.filter(s => s.status === 'approved').length,
        recruiters: recruiters.length,
        activeJobs: jobs.filter(j => j.status === 'active').length,
        totalMatches: matches.length,
        totalSwipes: swipes.length,
        rightSwipes: rightSwipes.length,
        leftSwipes: leftSwipes.length,
        matchRate,
        events: events.length,
        messages: messages.length,
        topSkills: getTopSkills(students),
        topUniversities: getTopUniversities(students),
        jobEngagement: Object.entries(jobEngagement).sort((a, b) => (b[1].right + b[1].left) - (a[1].right + a[1].left)).slice(0, 5),
        jobs,
      });
    } catch (e) {}
    setStatsLoading(false);
  };

  const getTopSkills = (students) => {
    const skillCount = {};
    students.forEach(s => (s.skills || []).forEach(skill => { skillCount[skill] = (skillCount[skill] || 0) + 1; }));
    return Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  };

  const getTopUniversities = (students) => {
    const uniCount = {};
    students.forEach(s => { if (s.university) uniCount[s.university] = (uniCount[s.university] || 0) + 1; });
    return Object.entries(uniCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const showToast = (msg, success = true) => {
    setToastMsg({ msg, success });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAddToCalendar = async () => {
    if (!calForm.title || !calForm.date) return alert('Please fill in title and date');
    setCalSaving(true);
    try {
      const res = await base44.functions.invoke('addToGoogleCalendar', calForm);
      if (res.data?.success) {
        showToast('Event added to Google Calendar!');
        setCalForm({ title: '', description: '', date: '', time: '', location: '', duration_minutes: 60 });
      } else {
        showToast(res.data?.error || 'Failed to add event', false);
      }
    } catch (e) { showToast(e.message, false); }
    setCalSaving(false);
  };

  const handleBlockTime = async () => {
    if (!blockForm.date || !blockForm.start_time || !blockForm.end_time) return alert('Please fill date, start and end time');
    setBlockSaving(true);
    try {
      const res = await base44.functions.invoke('blockGmailCalendar', blockForm);
      if (res.data?.success) {
        showToast('Time blocked on calendar!');
        setBlockForm({ title: 'Busy', date: '', start_time: '', end_time: '', reason: '' });
      } else {
        showToast(res.data?.error || 'Failed to block time', false);
      }
    } catch (e) { showToast(e.message, false); }
    setBlockSaving(false);
  };

  const handleSyncToNotion = async () => {
    if (!notionForm.student_email || !notionForm.database_id) return alert('Please fill in student email and Notion database ID');
    setNotionSaving(true);
    try {
      const res = await base44.functions.invoke('syncToNotion', notionForm);
      if (res.data?.success) {
        showToast('Student synced to Notion!');
      } else {
        showToast(res.data?.error || 'Failed to sync', false);
      }
    } catch (e) { showToast(e.message, false); }
    setNotionSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${toastMsg.success ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toastMsg.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMsg.msg}
        </div>
      )}

      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white">Integrations Hub 🔗</h1>
          <p className="text-white/80 mt-1">Google Calendar, Notion, Analytics & more</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-12">
        <Tabs defaultValue="calendar">
          <TabsList className="bg-white shadow-sm border border-slate-100 mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
            <TabsTrigger value="block">🔒 Block Time</TabsTrigger>
            <TabsTrigger value="notion">📝 Notion</TabsTrigger>
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          </TabsList>

          {/* GOOGLE CALENDAR TAB */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Calendar className="w-5 h-5 text-[#5BA4C4]" /> Add Event to Google Calendar
                </div>
                <p className="text-sm text-slate-500">Add networking events, interviews, or any event to your Google Calendar.</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Event Title *</Label>
                    <Input className="mt-1.5" placeholder="Interview with Google" value={calForm.title} onChange={e => setCalForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Location</Label>
                    <Input className="mt-1.5" placeholder="Zoom / Office / Online" value={calForm.location} onChange={e => setCalForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Date *</Label>
                    <Input type="date" className="mt-1.5" value={calForm.date} onChange={e => setCalForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Time</Label>
                    <Input type="time" className="mt-1.5" value={calForm.time} onChange={e => setCalForm(p => ({ ...p, time: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Duration (mins)</Label>
                    <Input type="number" className="mt-1.5" value={calForm.duration_minutes} onChange={e => setCalForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea className="mt-1.5 resize-none" rows={3} placeholder="Add details..." value={calForm.description} onChange={e => setCalForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <Button onClick={handleAddToCalendar} disabled={calSaving} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                  {calSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : <><Calendar className="w-4 h-4 mr-2" />Add to Google Calendar</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BLOCK TIME TAB */}
          <TabsContent value="block">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Lock className="w-5 h-5 text-[#5BA4C4]" /> Block Time on Calendar
                </div>
                <p className="text-sm text-slate-500">Block time slots so no one can book meetings with you during those hours.</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <Label className="text-sm font-semibold">Block Title</Label>
                  <Input className="mt-1.5" placeholder="Busy / Focus Time / Interview" value={blockForm.title} onChange={e => setBlockForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Date *</Label>
                    <Input type="date" className="mt-1.5" value={blockForm.date} onChange={e => setBlockForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Start Time *</Label>
                    <Input type="time" className="mt-1.5" value={blockForm.start_time} onChange={e => setBlockForm(p => ({ ...p, start_time: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">End Time *</Label>
                    <Input type="time" className="mt-1.5" value={blockForm.end_time} onChange={e => setBlockForm(p => ({ ...p, end_time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Reason (private)</Label>
                  <Input className="mt-1.5" placeholder="Interview prep / Deep work" value={blockForm.reason} onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="p-3 bg-[#EAF5FB] rounded-lg text-sm text-[#3D87AA]">
                  🔒 This will mark the time as <strong>Busy</strong> on your Google Calendar, blocking anyone from booking meetings with you during this time.
                </div>
                <Button onClick={handleBlockTime} disabled={blockSaving} className="bg-slate-800 hover:bg-slate-900 text-white">
                  {blockSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Blocking...</> : <><Lock className="w-4 h-4 mr-2" />Block This Time</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTION TAB */}
          <TabsContent value="notion">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <BookOpen className="w-5 h-5 text-[#5BA4C4]" /> Sync Student to Notion
                </div>
                <p className="text-sm text-slate-500">Track student progress, matches, XP and career stats in your Notion database.</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <Label className="text-sm font-semibold">Student Email *</Label>
                  <Input className="mt-1.5" type="email" placeholder="student@university.edu" value={notionForm.student_email} onChange={e => setNotionForm(p => ({ ...p, student_email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Notion Database ID *</Label>
                  <Input className="mt-1.5" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={notionForm.database_id} onChange={e => setNotionForm(p => ({ ...p, database_id: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">Find this in your Notion database URL: notion.so/your-workspace/<strong>DATABASE_ID</strong></p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  ⚠️ Make sure your Notion database has these properties: <strong>Name</strong> (title), <strong>Email</strong> (email), <strong>University</strong>, <strong>Major</strong>, <strong>Status</strong> (select), <strong>Matches</strong>, <strong>Swipes</strong>, <strong>XP</strong>, <strong>Credits</strong>, <strong>Level</strong>, <strong>Graduation Year</strong>, <strong>Skills</strong> (all text/number unless noted).
                </div>
                <Button onClick={handleSyncToNotion} disabled={notionSaving} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                  {notionSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : <><BookOpen className="w-4 h-4 mr-2" />Sync to Notion</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            {statsLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5BA4C4]" /></div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Students', value: stats.students, sub: `${stats.approvedStudents} approved`, bg: 'bg-[#EAF5FB]', border: 'border-[#A8D4E8]/40', text: 'text-[#2d5f7a]', sub2: 'text-[#5BA4C4]', num: 'text-[#1e4f6a]' },
                    { label: 'Active Jobs', value: stats.activeJobs, sub: 'Currently open', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700', sub2: 'text-slate-400', num: 'text-slate-800' },
                    { label: 'Total Matches', value: stats.totalMatches, sub: `${stats.matchRate}% match rate`, bg: 'bg-emerald-50', border: 'border-emerald-200/50', text: 'text-emerald-700', sub2: 'text-emerald-500', num: 'text-emerald-800' },
                    { label: 'Total Swipes', value: stats.totalSwipes, sub: `${stats.rightSwipes} right / ${stats.leftSwipes} left`, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', sub2: 'text-slate-400', num: 'text-slate-800' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 shadow-sm`}>
                      <p className={`text-3xl font-black ${s.num}`}>{s.value}</p>
                      <p className={`text-sm font-bold mt-1 ${s.text}`}>{s.label}</p>
                      <p className={`text-xs mt-0.5 ${s.sub2}`}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Engagement breakdown */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#5BA4C4]" />Top Skills (Student Filters)</h3>
                      <div className="space-y-3">
                        {stats.topSkills.map(([skill, count]) => (
                          <div key={skill} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700 w-36 truncate">{skill}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                              <div className="bg-[#5BA4C4] h-2.5 rounded-full" style={{ width: `${Math.min(100, (count / stats.students) * 100)}%` }} />
                            </div>
                            <span className="text-sm font-bold text-slate-600 w-6 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#5BA4C4]" />Top Universities</h3>
                      <div className="space-y-2">
                        {stats.topUniversities.map(([uni, count]) => (
                          <div key={uni} className="flex items-center justify-between p-3 bg-[#EAF5FB] rounded-xl border border-[#A8D4E8]/30">
                            <span className="text-sm font-semibold text-slate-800 truncate">{uni}</span>
                            <span className="text-sm font-bold text-[#3D87AA] ml-2 flex-shrink-0">{count} students</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Job Engagement */}
                <Card className="bg-white border border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#5BA4C4]" />Job Posting Engagement (Top 5)</h3>
                    <div className="space-y-3">
                      {stats.jobEngagement.map(([jobId, eng]) => {
                        const job = stats.jobs.find(j => j.id === jobId);
                        const total = eng.right + eng.left;
                        const rate = total > 0 ? ((eng.right / total) * 100).toFixed(0) : 0;
                        return (
                          <div key={jobId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm">{job?.title || 'Unknown Job'}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{job?.company}</p>
                            </div>
                            <div className="flex gap-3 flex-shrink-0 text-sm">
                              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">👍 {eng.right}</span>
                              <span className="flex items-center gap-1 font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">👎 {eng.left}</span>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${rate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{rate}% like</span>
                          </div>
                        );
                      })}
                      {stats.jobEngagement.length === 0 && <p className="text-slate-400 text-center py-8">No swipe data yet</p>}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={loadStats} className="text-[#3D87AA] border-[#A8D4E8]">
                    <BarChart2 className="w-4 h-4 mr-2" />Refresh Stats
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}