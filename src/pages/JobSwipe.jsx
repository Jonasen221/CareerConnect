import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, X, Star, Bookmark, Zap, Play, BarChart2, CheckCircle } from 'lucide-react';
import JobCompare from '../components/jobs/JobCompare';
import { Link, Navigate } from 'react-router-dom';
import PullToRefresh from '../components/layout/PullToRefresh';
import AIJobMatcher from '../components/jobs/AIJobMatcher';
import { useDemoPreview } from '@/lib/DemoPreviewContext';

const SUBSCRIPTION_LIVE = new Date() >= new Date('2026-09-01');
const FREE_DAILY_SWIPES = 3;
/** When subscriptions enforce limits, match marketed tiers (student job swipe). */
const TIER_DAILY_SWIPES_LIVE = { free: 2, bronze: 2, silver: 3, gold: 10 };

const SwipeCard = React.forwardRef(({ job, onSwipe, profile }, ref) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const startXRef = useRef(0);

  const handleStart = (clientX) => {
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    setDragX(clientX - startXRef.current);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragX) > 80) {
      onSwipe(dragX > 0 ? 'right' : 'left');
    }
    setDragX(0);
  };

  return (
    <div
      ref={ref}
      onMouseDown={e => handleStart(e.clientX)}
      onMouseMove={e => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={e => handleStart(e.touches[0].clientX)}
      onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
      onTouchEnd={handleEnd}
      className="cursor-grab active:cursor-grabbing"
      style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`, transition: isDragging ? 'none' : 'transform 0.3s' }}>

      <Card className="border border-[#8FAFC4]/40 shadow-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-br from-[#E8E4DF] to-[#EAF5FB] h-48 flex items-center justify-center">
          {job.company_logo_url ?
          <img src={job.company_logo_url} alt={job.company} className="h-24 w-24 object-contain" /> :
          <div className="w-24 h-24 bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {job.company?.[0] || '?'}
            </div>
          }
        </div>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-[#2E3F4F]">{job.title}</h3>
            <p className="text-[#5BA4C4] font-semibold text-sm mt-1">{job.company}</p>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-[#7A7870]"><span>📍</span><span>{job.location}</span></div>
            <div className="flex items-center gap-2 text-sm text-[#7A7870]"><span>💼</span><span className="capitalize">{job.type?.replace('_', ' ')}</span></div>
            {job.salary_range && <div className="flex items-center gap-2 text-sm text-[#7A7870]"><span>💰</span><span>{job.salary_range}</span></div>}
          </div>
          {job.required_skills?.length > 0 &&
          <div className="mb-4">
              <p className="text-xs text-[#3D87AA] font-semibold mb-2 uppercase tracking-wide">Skills</p>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.slice(0, 5).map((skill, i) =>
              <span key={i} className="bg-[#EAF5FB] text-[#3D87AA] text-xs px-3 py-1 rounded-full font-medium border border-[#A8D4E8]/40">{skill}</span>
              )}
              </div>
            </div>
          }
          {job.description && <p className="text-xs text-[#7A7870] line-clamp-2 leading-relaxed">{job.description}</p>}
          {job.recruiter_video_url && (
            <div className="mt-3">
              {showVideo ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video src={job.recruiter_video_url} controls autoPlay className="w-full h-full object-contain" />
                  <button onClick={e => { e.stopPropagation(); setShowVideo(false); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setShowVideo(true); }}
                  className="w-full flex items-center gap-2 bg-[#EAF5FB] border border-[#A8D4E8] text-[#3D87AA] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#daeef7] transition-colors">
                  <Play className="w-4 h-4" /> Watch Role Video
                </button>
              )}
            </div>
          )}
          {profile && <AIJobMatcher job={job} profile={profile} />}
        </CardContent>
      </Card>
    </div>);

});

export default function JobSwipe() {
  const { previewMode, skipProfileGates } = useDemoPreview();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [_swipes, setSwipes] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [todaySwipes, setTodaySwipes] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [previewMode]);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [studentProfiles, recruiterProfiles, allJobs, userSwipes, savedJobs, subs] = await Promise.all([
    base44.entities.StudentProfile.filter({ created_by: u.email }),
    base44.entities.RecruiterProfile.filter({ created_by: u.email }),
    base44.entities.Job.filter({ status: 'active' }),
    base44.entities.Swipe.filter({ created_by: u.email }),
    base44.entities.Shortlist.filter({ student_email: u.email }),
    base44.entities.Subscription.filter({ created_by: u.email })]
    );

    if (u.role === 'admin' && previewMode === 'student') {
      setUserType('student');
      const sp = studentProfiles[0];
      setProfile(
        sp ||
        (skipProfileGates
          ? { id: 'preview', major: '', skills: [], resume_url: 'demo', intro_video_url: 'demo' }
          : null)
      );
      setJobs(allJobs);
      if (SUBSCRIPTION_LIVE) {
        const rawSub = subs[0] || { tier: 'free' };
        const sub = { ...rawSub, daily_swipes: TIER_DAILY_SWIPES_LIVE[rawSub.tier] ?? 2 };
        setSubscription(sub);
      } else {
        setSubscription({ tier: 'free', daily_swipes: FREE_DAILY_SWIPES });
      }
      const today = new Date().toISOString().split('T')[0];
      const todayCount = userSwipes.filter((s) => s.created_date?.startsWith(today)).length;
      setTodaySwipes(todayCount);
      setRecruiterProfile(null);
    } else if (u.role === 'admin' && previewMode === 'recruiter') {
      setUserType('recruiter');
      const rp = recruiterProfiles[0];
      const recruiterJobs = rp ? allJobs.filter((j) => j.created_by === u.email) : allJobs;
      setRecruiterProfile(rp || (skipProfileGates ? { id: 'preview', company: 'Demo Company' } : null));
      setJobs(recruiterJobs.length > 0 ? recruiterJobs : allJobs);
      setProfile(null);
      setSubscription(null);
    } else if (studentProfiles.length > 0) {
      setUserType('student');
      setProfile(studentProfiles[0]);
      setJobs(allJobs);

      // If subscriptions are live, use tier-based limits; otherwise flat 3/day for everyone
      if (SUBSCRIPTION_LIVE) {
        const rawSub = subs[0] || { tier: 'free' };
        const sub = { ...rawSub, daily_swipes: TIER_DAILY_SWIPES_LIVE[rawSub.tier] ?? 2 };
        setSubscription(sub);
      } else {
        setSubscription({ tier: 'free', daily_swipes: FREE_DAILY_SWIPES });
      }

      const today = new Date().toISOString().split('T')[0];
      const todayCount = userSwipes.filter((s) => s.created_date?.startsWith(today)).length;
      setTodaySwipes(todayCount);
      setRecruiterProfile(null);
    } else if (recruiterProfiles.length > 0) {
      setUserType('recruiter');
      setRecruiterProfile(recruiterProfiles[0]);
      const recruiterJobs = allJobs.filter((j) => j.created_by === u.email);
      setJobs(recruiterJobs);
      setProfile(null);
      setSubscription(null);
    } else {
      setUserType(null);
      setProfile(null);
      setRecruiterProfile(null);
      setJobs([]);
      setSubscription(null);
    }

    setSwipes(userSwipes);
    setSaved(savedJobs);
    setLoading(false);
  };

  const handleSwipe = async (direction) => {
    const job = jobs[currentIndex];
    if (!job) return;

    // Check swipe limit for students
    if (userType === 'student' && subscription) {
      const limit = subscription.daily_swipes === -1 ? Infinity : (subscription.daily_swipes || FREE_DAILY_SWIPES);
      if (todaySwipes >= limit) return;
    }

    // Optimistic update
    setSwipes((prev) => [...prev, { job_id: job.id, direction }]);
    setCurrentIndex((prev) => prev + 1);
    setTodaySwipes((prev) => prev + 1);

    // Fire-and-forget API call (skip when using a local demo stub row)
    const skipPersist =
      (userType === 'student' && profile?.id === 'preview') ||
      (userType === 'recruiter' && recruiterProfile?.id === 'preview');
    if (!skipPersist) {
      base44.entities.Swipe.create({ job_id: job.id, direction });
    }
  };

  const toggleSave = async () => {
    const job = jobs[currentIndex];
    if (!job) return;

    const skipPersistShortlist = profile?.id === 'preview';
    if (alreadySaved) {
      // Optimistic
      setSaved((prev) => prev.filter((s) => s.job_id !== job.id));
      if (!skipPersistShortlist && alreadySaved.id && !String(alreadySaved.id).startsWith('optimistic-')) {
        base44.entities.Shortlist.delete(alreadySaved.id);
      }
    } else {
      // Optimistic
      const optimistic = { job_id: job.id, student_email: user.email, id: `optimistic-${Date.now()}` };
      setSaved((prev) => [...prev, optimistic]);
      if (!skipPersistShortlist) {
        base44.entities.Shortlist.create({ student_email: user.email, job_id: job.id });
      }
    }
  };

  const toggleCompare = (id) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  if (user?.role === 'admin' && previewMode === 'off' && userType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#EAF5FB]">
        <p className="text-[#3D87AA] text-center max-w-sm font-medium">
          Use the <strong>Demo</strong> bar at the bottom and choose <strong>Candidate UI</strong> or <strong>Recruiter UI</strong> to explore job swiping as that role.
        </p>
      </div>
    );
  }

  if (!skipProfileGates && userType === 'student' && !profile) {
    return (
      <div className="min-h-screen bg-[#EAF5FB] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#3D87AA] mb-4 font-medium">Complete your profile to start exploring jobs</p>
          <Link to={createPageUrl('Onboarding')}><Button className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">Complete Profile</Button></Link>
        </div>
      </div>);
  }

  if (!skipProfileGates && userType === 'student' && profile && (!profile.resume_url || !profile.intro_video_url)) {
    return (
      <div className="min-h-screen bg-[#EAF5FB] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-[#2E3F4F] mb-2">Complete Your Profile First</h2>
          <p className="text-[#7A7870] mb-4">You need to add the following before you can explore jobs:</p>
          <div className="space-y-2 mb-6 text-left">
            {!profile.resume_url && (
              <div className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium">
                <span>📄</span> CV / Resume not uploaded
              </div>
            )}
            {!profile.intro_video_url && (
              <div className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium">
                <span>🎬</span> 90-second pitch video missing
              </div>
            )}
          </div>
          <Link to={createPageUrl('StudentProfilePage')}><Button className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">Complete My Profile</Button></Link>
        </div>
      </div>);
  }

  if (!skipProfileGates && userType === 'recruiter' && !recruiterProfile) {
    return (
      <div className="min-h-screen bg-[#EAF5FB] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#3D87AA] mb-4 font-medium">Complete your profile to view jobs</p>
          <Link to={createPageUrl('Onboarding')}><Button className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]">Complete Profile</Button></Link>
        </div>
      </div>);

  }

  const currentJob = jobs[currentIndex];
  const isSaved = saved.some((s) => s.job_id === currentJob?.id);

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="bg-transparent p-6 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{userType === 'recruiter' ? 'My Active Jobs' : 'Explore Jobs ⚡'}</h1>
            {userType === 'recruiter' && recruiterProfile && <p className="text-sm text-[#8FAFC4] mt-1 font-medium">{recruiterProfile.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            {userType === 'student' && (
              <>
                {compareMode && compareIds.length >= 2 && (
                  <Button size="sm" onClick={() => setShowCompare(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white text-xs">
                    <BarChart2 className="w-3.5 h-3.5 mr-1" />Compare ({compareIds.length})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setCompareMode(m => !m); setCompareIds([]); }}
                  className={`text-xs ${compareMode ? 'border-[#5BA4C4] text-[#3D87AA] bg-[#EAF5FB]' : ''}`}>
                  <BarChart2 className="w-3.5 h-3.5 mr-1" />{compareMode ? 'Cancel' : 'Compare'}
                </Button>
              </>
            )}
            {userType === 'student' && subscription &&
              <div className="text-sm bg-white border border-[#A8D4E8] text-[#3D87AA] px-4 py-2 rounded-full font-semibold flex items-center gap-2 shadow-sm">
                <Zap className="w-4 h-4 text-[#5BA4C4]" />
                <span>{todaySwipes}/{subscription.daily_swipes === -1 ? '∞' : (subscription.daily_swipes || FREE_DAILY_SWIPES)}</span>
              </div>
            }
          </div>
        </div>

        {userType === 'student' && subscription && subscription.daily_swipes !== -1 && todaySwipes >= (subscription.daily_swipes || FREE_DAILY_SWIPES) && currentIndex < jobs.length &&
          <div className="mb-6 p-4 bg-[#EAF5FB] border border-[#8FAFC4] rounded-2xl flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#5BA4C4] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#2E3F4F]">Daily Swipe Limit Reached</p>
              <p className="text-sm text-[#7A7870] mt-1">You've used all {subscription.daily_swipes || FREE_DAILY_SWIPES} swipes for today. Come back tomorrow!</p>
            </div>
          </div>
          }

        {showCompare && userType === 'student' && (
          <JobCompare jobs={jobs.filter(j => compareIds.includes(j.id))} onClose={() => setShowCompare(false)} />
        )}

        {compareMode && userType === 'student' && (
          <div className="mb-4 flex flex-wrap gap-2">
            {jobs.map(j => {
              const sel = compareIds.includes(j.id);
              return (
                <button key={j.id} onClick={() => toggleCompare(j.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    sel ? 'bg-[#5BA4C4] text-white border-[#3D87AA]' : 'bg-white text-[#7A7870] border-slate-200 hover:border-[#5BA4C4]'
                  }`}>
                  {sel && <CheckCircle className="w-3 h-3" />}
                  {j.title} · {j.company}
                </button>
              );
            })}
            <p className="w-full text-xs text-[#7A7870] mt-1">Select 2–4 jobs to compare side-by-side</p>
          </div>
        )}

        {currentIndex < jobs.length ?
          <>
            <div className="mb-6">
              <SwipeCard ref={cardRef} job={currentJob} onSwipe={handleSwipe} profile={userType === 'student' ? profile : null} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => handleSwipe('left')}
                className="w-16 h-16 rounded-full bg-white border-2 border-[#8FAFC4] hover:bg-[#E8E4DF] hover:border-[#5BA4C4] flex items-center justify-center transition-all hover:scale-110 shadow-md"
                title="Pass">

                <X className="w-7 h-7 text-[#7A7870]" />
              </button>

              <button
                onClick={toggleSave}
                className={`w-16 h-16 rounded-full ${isSaved ? 'bg-[#EAF5FB] border-2 border-[#5BA4C4]' : 'bg-white border-2 border-[#A8D4E8] hover:bg-[#EAF5FB]'} flex items-center justify-center transition-all hover:scale-110 shadow-md`}
                title="Save Job">

                <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-[#5BA4C4] text-[#5BA4C4]' : 'text-[#8FAFC4]'}`} />
              </button>

              <button
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-white border-2 border-[#5BA4C4] hover:bg-[#EAF5FB] hover:border-[#3D87AA] flex items-center justify-center transition-all hover:scale-110 shadow-md"
                title="Like">

                <Heart className="w-7 h-7 text-[#5BA4C4] fill-[#5BA4C4]" />
              </button>

              <button
                onClick={() => {handleSwipe('right');}}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] flex items-center justify-center transition-all hover:scale-110 shadow-md hover:shadow-[#5BA4C4]/40"
                title="Super Career">

                <Star className="w-7 h-7 text-white fill-white" />
              </button>
            </div>

            <div className="text-center text-sm text-[#5BA4C4] font-medium">
              <p>← Pass &nbsp; • &nbsp; 🔖 Save &nbsp; • &nbsp; ❤️ Like &nbsp; • &nbsp; ⭐ Super Career →</p>
            </div>
          </> :
          <Navigate to={createPageUrl('Home') + '?show=landing'} />
          }



      </div>
    </div>
    </PullToRefresh>);

}