import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PullToRefresh from '../components/layout/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Calendar, User, Star, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DashboardCalendar from '../components/calendar/DashboardCalendar';
import AICVReview from '../components/dashboard/AICVReview';
import { useDemoPreview } from '@/lib/DemoPreviewContext';

export default function StudentDashboard() {
  const { skipApprovalGates } = useDemoPreview();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ swipes: 0, matches: 0, events: 0, messages: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [gameProgress, setGameProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiJobs, setAiJobs] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.full_name?.split(' ')[0] || 'there';
    if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
    if (hour >= 17 && hour < 21) return `Good evening, ${firstName}`;
    return `Hey ${firstName}`;
  };

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [profiles, swipes, matches, rsvps, messages, gp, allJobs] = await Promise.all([
      base44.entities.StudentProfile.filter({ created_by: u.email }),
      base44.entities.Swipe.filter({ created_by: u.email }),
      base44.entities.Match.filter({ student_email: u.email }),
      base44.entities.EventRSVP.filter({ created_by: u.email }),
      base44.entities.Message.filter({ receiver_email: u.email, read: false }),
      base44.entities.GameProgress.filter({ created_by: u.email }),
      base44.entities.Job.filter({ status: 'active' }),
    ]);
    let prof = profiles[0] || null;
    setProfile(prof);
    setRecentMatches(matches.slice(0, 3));
    const rightSwipes = swipes.filter(s => s.direction === 'right');
    setStats({ swipes: rightSwipes.length, matches: matches.length, events: rsvps.length, messages: messages.length });
    setGameProgress(gp[0] || null);
    setLoading(false);
    // AI job recommendations - only if CV and video uploaded, and AI features are enabled (after July 1, 2026)
    const aiEnabled = new Date() >= new Date('2026-07-01');
    if (aiEnabled && allJobs.length > 0 && prof && prof.resume_url && prof.intro_video_url) {
      setAiLoading(true);
      const swipedIds = new Set(swipes.map(s => s.job_id));
      const unseenJobs = allJobs.filter(j => !swipedIds.has(j.id)).slice(0, 30);
      
      // Extract keywords from CV to update profile
      if (prof.resume_url && !prof.extracted_keywords) {
        try {
          const cvResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: prof.resume_url,
            json_schema: {
              type: 'object',
              properties: {
                skills: { type: 'array', items: { type: 'string' } },
                experience_keywords: { type: 'array', items: { type: 'string' } }
              }
            }
          });
          if (cvResult.status === 'success' && cvResult.output) {
            const allKeywords = [...(cvResult.output.skills || []), ...(cvResult.output.experience_keywords || [])].filter(k => k);
            if (allKeywords.length > 0) {
              const existingSkills = new Set(prof.skills || []);
              const newSkills = allKeywords.filter(k => !existingSkills.has(k)).slice(0, 10);
              if (newSkills.length > 0) {
                await base44.entities.StudentProfile.update(prof.id, { skills: [...(prof.skills || []), ...newSkills] });
                prof = { ...prof, skills: [...(prof.skills || []), ...newSkills] };
              }
            }
          }
        } catch (e) {
          // Silently fail CV extraction
        }
      }
      
      if (unseenJobs.length > 0) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a career advisor. Based on this student's profile, pick the TOP 3 best-matching jobs and explain why in one short sentence each.

Student Profile:
- Major: ${prof.major || 'Not specified'}
- Skills: ${(prof.skills || []).join(', ') || 'Not specified'}
- Languages: ${(prof.languages || []).join(', ') || 'Not specified'}
- Work Preferences: ${(prof.work_preferences || []).join(', ') || 'Not specified'}
- University: ${prof.university || 'Not specified'}
- Graduation Year: ${prof.graduation_year || 'Not specified'}

Available Jobs (JSON):
${JSON.stringify(unseenJobs.map(j => ({ id: j.id, title: j.title, company: j.company, required_skills: j.required_skills, type: j.type, location: j.location })))}

Return exactly 3 job picks.`,
          response_json_schema: {
            type: 'object',
            properties: {
              picks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    job_id: { type: 'string' },
                    reason: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        const picks = result?.picks || [];
        const enriched = picks.map(p => ({ ...unseenJobs.find(j => j.id === p.job_id), reason: p.reason })).filter(j => j.id);
        setAiJobs(enriched);
      }
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen bg-[#E8E4DF] dark:bg-slate-900">
      {/* Playful header banner */}
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          {!skipApprovalGates && profile?.status === 'pending' && (
            <div className="mb-4 p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-white flex-shrink-0" />
              <div><p className="font-semibold text-white text-sm">Profile under review</p><p className="text-xs text-white/80">Our team is reviewing your application. You'll get full access once approved.</p></div>
            </div>
          )}
          {!skipApprovalGates && profile?.status === 'rejected' && (
            <div className="mb-4 p-3 bg-red-500/30 border border-red-200/50 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
              <p className="text-white text-sm">Your application was not approved. Contact support for more information.</p>
            </div>
          )}
          {!profile && (
            <div className="mb-4 p-3 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3"><User className="w-5 h-5 text-white" /><p className="text-white font-medium text-sm">Complete your profile to get started</p></div>
              <Link to={createPageUrl('Onboarding')}><Button size="sm" className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] font-bold">Set up →</Button></Link>
            </div>
          )}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">{getGreeting()} 👋</h1>
              <p className="text-white/80 mt-1">Here's your job search overview</p>
            </div>
          </div>
          {/* XP Progress bar */}
          {gameProgress && (() => {
            const xpForNextLevel = (gameProgress.level || 1) * 500;
            const xpProgress = Math.min(((gameProgress.total_xp || 0) % 500) / 500 * 100, 100);
            return (
              <div className="mt-4 bg-white/15 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/80 font-semibold">Level {gameProgress.level || 1} → Level {(gameProgress.level || 1) + 1}</span>
                  <span className="text-xs text-white/80">{(gameProgress.total_xp || 0) % 500} / 500 XP</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>
            );
          })()}
          {/* Gaming Stats */}
          <Link to={createPageUrl('CareerGames')} className="flex items-center gap-2 mt-3">
              <div className="bg-white/20 backdrop-blur rounded-2xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-lg font-black text-white leading-none">⭐ {gameProgress?.level || 1}</p>
                <p className="text-xs text-white/70 mt-0.5">level</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-lg font-black text-white leading-none">⚡ {gameProgress?.total_xp || 0}</p>
                <p className="text-xs text-white/70 mt-0.5">XP</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-lg font-black text-white leading-none">🪙 {gameProgress?.credits || 0}</p>
                <p className="text-xs text-white/70 mt-0.5">credits</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-lg font-black text-white leading-none">🔥 {gameProgress?.streak_days || 0}</p>
                <p className="text-xs text-white/70 mt-0.5">streak</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10">
      {/* Progress Tracker */}
      <div className="mb-8 bg-white dark:bg-slate-800 rounded-3xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-6">
        <h2 className="font-black text-[#2E3F4F] dark:text-slate-100 mb-4">📈 Weekly Progress</h2>
        <div className="space-y-4">
          {/* Swipes Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#2E3F4F] dark:text-slate-100">Swipes</p>
              <p className="text-sm font-black text-[#5BA4C4]">{Math.min(stats.swipes, 10)}/10</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#5BA4C4] to-[#4a90b0] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((stats.swipes / 10) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Keep swiping to explore more opportunities! 🎯</p>
          </div>
          
          {/* Booked Meetings Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#2E3F4F] dark:text-slate-100">Booked Meetings</p>
              <p className="text-sm font-black text-[#3D87AA]">{stats.matches}/3</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#3D87AA] to-[#2d6d8e] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((stats.matches / 3) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Great work! Each match gets you closer to your dream role. 🚀</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jobs Applied', count: stats.swipes, emoji: '📨', bg: 'from-[#5BA4C4] to-[#4a90b0]', page: 'JobSwipe' },
          { label: 'Matches', count: stats.matches, emoji: '🤝', bg: 'from-[#3D87AA] to-[#2d6d8e]', page: 'Messages' },
          { label: "Events RSVP'd", count: stats.events, emoji: '🎪', bg: 'from-[#4a90b0] to-[#2d6d8e]', page: 'EventsPage' },
          { label: 'New Messages', count: stats.messages, emoji: '💬', bg: 'from-[#2d6d8e] to-[#1e5070]', page: 'Messages' },
        ].map(stat => (
          <Link key={stat.label} to={createPageUrl(stat.page)}>
            <Card className="border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden">
              <CardContent className="p-5 bg-gradient-to-br text-white" style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}}>
                <div className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-5 text-white`}>
                  <div className="text-3xl mb-2">{stat.emoji}</div>
                  <p className="text-3xl font-black">{stat.count}</p>
                  <p className="text-xs text-white/80 mt-0.5 font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* AI Best Jobs of the Week */}
      <div className="mb-8 bg-white dark:bg-slate-800 rounded-3xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-[#2E3F4F] dark:text-slate-100 flex items-center gap-2">✨ Best Jobs for You This Week</h2>
          <Link to={createPageUrl('JobSwipe')} className="text-[#5BA4C4] text-sm font-medium hover:underline flex items-center gap-1">See all <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {aiLoading ? (
          <div className="flex items-center gap-3 py-6 justify-center">
            <div className="w-5 h-5 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">AI is picking your best matches…</span>
          </div>
        ) : aiJobs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm">{profile && (!profile.resume_url || !profile.intro_video_url) ? 'Upload your CV and intro video to get AI-powered job recommendations.' : 'Complete your profile to get AI-powered job recommendations.'}</p>
            <Link to={createPageUrl('StudentProfilePage')}><Button size="sm" className="mt-3">Update Profile</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {aiJobs.map((job, i) => (
              <Link key={job.id} to={createPageUrl('JobSwipe')}>
                <div className="flex items-start gap-3 p-4 bg-[#EAF5FB] hover:bg-[#d4ecf7] dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-2xl transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#2E3F4F] dark:text-slate-100 text-sm">{job.title}</p>
                    <p className="text-xs text-[#5BA4C4] font-semibold">{job.company}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{job.reason}"</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5BA4C4] flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Career Arena teaser */}
      <Link to={createPageUrl('CareerGames')} className="block mb-8">
        <div className="bg-gradient-to-r from-[#3D87AA] via-[#5BA4C4] to-[#A8D4E8] p-0.5 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="bg-white dark:bg-slate-800 rounded-[22px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏆</span>
              <div>
                <p className="font-black text-slate-800 dark:text-slate-100">Career Arena</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Level {gameProgress?.level || 1} · {gameProgress?.total_xp || 0} XP · Play games, earn credits & unlock career services</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#5BA4C4] flex-shrink-0" />
          </div>
        </div>
      </Link>

      {/* How to Earn Credits */}
      <div className="mb-8 p-5 bg-[#EAF5FB] border border-[#A8D4E8] rounded-3xl">
        <h2 className="font-black text-[#2d5f7a] mb-4 flex items-center gap-2">🪙 Earn Credits & XP</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: '🎮', title: 'Play Games', desc: '100+ XP per game', color: 'from-[#5BA4C4] to-[#4a90b0]' },
            { icon: '📜', title: 'Upload Certificates', desc: '100 XP per cert', color: 'from-[#4a90b0] to-[#3D87AA]' },
            { icon: '⚡', title: 'Daily Streaks', desc: '+50 XP bonus every 7 days', color: 'from-[#3D87AA] to-[#2d6d8e]' },
            { icon: '💰', title: 'Redeem for Services', desc: '€1 credit = 1 XP', color: 'from-[#2d6d8e] to-[#1e5070]' },
          ].map((item, i) => (
            <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 text-white text-center`}>
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-white/80 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-3xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-[#2E3F4F] dark:text-slate-100">Daily Tasks</h2>
          <span className="text-xs text-[#7A7870] dark:text-slate-500">Resets every day</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Play a Career Arena game', emoji: '🎮', page: 'CareerGames', done: gameProgress?.last_activity_date === new Date().toISOString().split('T')[0] },
            { label: 'Swipe on 5 jobs', emoji: '⚡', page: 'JobSwipe', done: stats.swipes > 0 },
            { label: 'Check your messages', emoji: '💬', page: 'Messages', done: stats.messages === 0 },
            { label: 'Browse upcoming events', emoji: '🎪', page: 'EventsPage', done: stats.events > 0 },
          ].map((task, i) => (
            <Link key={i} to={createPageUrl(task.page)}>
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#E8E4DF] dark:hover:bg-slate-700/50 ${task.done ? 'opacity-60' : ''}`}>
                <span className="text-xl">{task.emoji}</span>
                <p className={`flex-1 text-sm font-medium ${task.done ? 'line-through text-[#7A7870]' : 'text-[#2E3F4F] dark:text-slate-300'}`}>{task.label}</p>
                {task.done
                  ? <CheckCircle className="w-5 h-5 text-[#5BA4C4] flex-shrink-0" />
                  : <ArrowRight className="w-4 h-4 text-[#8FAFC4] flex-shrink-0" />}
              </div>
            </Link>
          ))}
        </div>
        {gameProgress?.streak_days > 0 && (
          <div className="mt-3 p-3 bg-[#EAF5FB] border border-[#A8D4E8] rounded-2xl flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <p className="text-sm font-bold text-[#2d5f7a]">{gameProgress.streak_days} day streak! Keep it up — play a game today to continue.</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <AICVReview user={user} profile={profile} />
      </div>

      <div className="mb-6">
        <DashboardCalendar userType="student" userEmail={user?.email} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Recent Matches</h2>
              <Link to={createPageUrl('Messages')} className="text-[#5BA4C4] text-sm font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {recentMatches.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-8 h-8 text-[#8FAFC4] mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No matches yet. Keep swiping!</p>
                <Link to={createPageUrl('JobSwipe')}><Button size="sm" className="mt-3 bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">Explore Jobs</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMatches.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-9 h-9 bg-[#5BA4C4] rounded-xl flex items-center justify-center text-white font-bold text-sm">{m.company?.[0] || '?'}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{m.job_title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{m.company}</p></div>
                    <CheckCircle className="w-4 h-4 text-[#5BA4C4] flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-6">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-5">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { page: 'JobSwipe', icon: Zap, title: 'Explore Jobs', sub: 'Swipe through new opportunities', btn: 'bg-[#5BA4C4]' },
                { page: 'EventsPage', icon: Calendar, title: 'Browse Events', sub: 'Panels, fairs, and more', btn: 'bg-[#3D87AA]' },
                { page: 'StudentProfilePage', icon: User, title: 'Update Profile', sub: 'Keep your profile fresh', btn: 'bg-[#2d6d8e]' },
              ].map(a => (
                <Link key={a.page} to={createPageUrl(a.page)}>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">
                    <div className={`w-10 h-10 ${a.btn} rounded-xl flex items-center justify-center flex-shrink-0`}><a.icon className="w-5 h-5 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.sub}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PullToRefresh>
  );
}