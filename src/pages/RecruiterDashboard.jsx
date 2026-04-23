import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PullToRefresh from '../components/layout/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, Calendar, ArrowRight, Star, Clock, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardCalendar from '../components/calendar/DashboardCalendar';

export default function RecruiterDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ jobs: 0, shortlists: 0, matches: 0, messages: 0 });
  const [recentShortlists, setRecentShortlists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {loadData();}, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const fullName = user?.full_name || 'there';
    const firstName = fullName.split(' ')[0];
    if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
    if (hour >= 17 && hour < 21) return `Good evening, ${firstName}`;
    return `Hey ${firstName}`;
  };

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [profiles, jobs, shortlists, matches, messages] = await Promise.all([
    base44.entities.RecruiterProfile.filter({ created_by: u.email }),
    base44.entities.Job.filter({ created_by: u.email }),
    base44.entities.Shortlist.filter({ created_by: u.email }),
    base44.entities.Match.filter({ recruiter_email: u.email }),
    base44.entities.Message.filter({ receiver_email: u.email, read: false })]
    );
    setProfile(profiles[0] || null);
    setStats({ jobs: jobs.filter((j) => j.status === 'active').length, shortlists: shortlists.length, matches: matches.length, messages: messages.length });
    setRecentShortlists(shortlists.slice(0, 3));
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen bg-[#E8E4DF] dark:bg-slate-900">
      <div className="bg-gradient-to-r from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          {profile?.status === 'pending' &&
            <div className="mb-4 p-3 bg-blue-500/30 border border-blue-200/50 rounded-2xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-white flex-shrink-0" />
              <div><p className="font-semibold text-white text-sm">Account under review</p><p className="text-xs text-white/80">You can still browse and shortlist candidates while we verify your details.</p></div>
            </div>
            }
          {profile?.status === 'rejected' &&
            <div className="mb-4 p-3 bg-red-500/30 border border-red-200/50 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
              <p className="text-white text-sm">Your application was not approved. Contact support.</p>
            </div>
            }
          <h1 className="text-3xl font-black text-white">{getGreeting()} 💼</h1>
          <p className="text-white/80 mt-1">{profile?.company ? `Recruiting for ${profile.company}` : 'Your recruiting dashboard'}</p>
        </div>
      </div>
      <div className="bg-transparent mx-auto px-6 max-w-5xl -mt-8">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
            { label: 'Active Jobs', count: stats.jobs, emoji: '📋', bg: 'from-[#5BA4C4] to-[#4a90b0]', page: 'JobManagement' },
            { label: 'Shortlisted', count: stats.shortlists, emoji: '⭐', bg: 'from-[#4a90b0] to-[#3D87AA]', page: 'StudentSearch' },
            { label: 'Matches', count: stats.matches, emoji: '🤝', bg: 'from-[#3D87AA] to-[#2d6d8e]', page: 'Messages' },
            { label: 'New Messages', count: stats.messages, emoji: '💬', bg: 'from-[#2d6d8e] to-[#1e5070]', page: 'Messages' }].
            map((stat) =>
            <Link key={stat.label} to={createPageUrl(stat.page)}>
            <Card className="border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-5 text-white`}>
                  <div className="text-3xl mb-2">{stat.emoji}</div>
                  <p className="text-3xl font-black">{stat.count}</p>
                  <p className="text-xs text-white/80 mt-0.5 font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
            )}
      </div>

      <div className="mb-6">
        <DashboardCalendar userType="recruiter" userEmail={user?.email} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-slate-800 text-lg font-bold">Recent Shortlists</h2>
              <Link to={createPageUrl('StudentSearch')} className="text-[#5BA4C4] text-sm font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {recentShortlists.length === 0 ?
                <div className="text-center py-8">
                <Star className="w-8 h-8 text-[#8FAFC4] mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No candidates shortlisted yet</p>
                <Link to={createPageUrl('StudentSearch')}><Button size="sm" className="mt-3 bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">Find Talent</Button></Link>
              </div> :
                <div className="space-y-3">
                {recentShortlists.map((s) =>
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-[#EAF5FB] rounded-xl border border-[#A8D4E8]/30">
                    <Avatar className="w-9 h-9"><AvatarFallback className="bg-[#5BA4C4] text-white text-sm font-bold">{s.student_email?.[0]?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-slate-800 text-sm truncate">{s.student_email}</p><p className="text-xs text-slate-500">Shortlisted</p></div>
                    <Star className="w-4 h-4 text-[#5BA4C4] flex-shrink-0" />
                  </div>
                  )}
              </div>
                }
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-slate-800 mb-5 text-lg font-bold">Quick Actions</h2>
            <div className="space-y-3">
              {[
                  { page: 'StudentSearch', icon: Users, title: 'Find Talent', sub: 'Search & filter candidates', bg: 'bg-[#5BA4C4]', from: 'from-[#EAF5FB] to-[#d0eaf6]', hover: 'hover:from-[#d0eaf6] hover:to-[#b8dfef]', text: 'text-[#1e5f7a]', sub2: 'text-[#5BA4C4]', arrow: 'text-[#5BA4C4]' },
                  { page: 'JobManagement', icon: Briefcase, title: 'Post a Job', sub: 'Create new opportunities', bg: 'bg-[#3D87AA]', from: 'from-[#EAF5FB] to-[#d0eaf6]', hover: 'hover:from-[#d0eaf6] hover:to-[#b8dfef]', text: 'text-[#1e5f7a]', sub2: 'text-[#3D87AA]', arrow: 'text-[#3D87AA]' },
                  { page: 'EventsPage', icon: Calendar, title: 'Host an Event', sub: 'Panels, fairs, and more', bg: 'bg-[#2d6d8e]', from: 'from-[#EAF5FB] to-[#d0eaf6]', hover: 'hover:from-[#d0eaf6] hover:to-[#b8dfef]', text: 'text-[#1e5f7a]', sub2: 'text-[#3D87AA]', arrow: 'text-[#3D87AA]' }].
                  map((a) =>
                  <Link key={a.page} to={createPageUrl(a.page)}>
                  <div className={`flex items-center gap-4 p-4 bg-gradient-to-r ${a.from} ${a.hover} rounded-xl transition-colors cursor-pointer`}>
                    <div className={`w-10 h-10 ${a.bg} rounded-xl flex items-center justify-center`}><a.icon className="w-5 h-5 text-white" /></div>
                    <div><p className={`font-semibold ${a.text}`}>{a.title}</p><p className={`text-xs ${a.sub2}`}>{a.sub}</p></div>
                    <ArrowRight className={`w-4 h-4 ${a.arrow} ml-auto`} />
                  </div>
                </Link>
                  )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
    </PullToRefresh>);

}