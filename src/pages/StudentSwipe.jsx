import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { X, Star, Users, MessageCircle } from 'lucide-react';
import MobileSelect from '../components/layout/MobileSelect';
import { motion, AnimatePresence } from 'framer-motion';
import StudentSwipeCard from '../components/students/StudentSwipeCard';
import { useDemoPreview } from '@/lib/DemoPreviewContext';
import { sortByKeywordRelevance } from '@/lib/keywordScore';

// Recruiter preference for whether/how to see high-school candidates.
// Persisted in localStorage so the choice sticks between sessions.
const EDU_FILTER_KEY = 'cc.recruiterEduFilter';
const EDU_FILTER_OPTIONS = [
  { value: 'any', label: 'Everyone' },
  { value: 'exclude_high_school', label: 'University only (hide high school)' },
  { value: 'high_school_only', label: 'High school only' },
];
const matchesEduFilter = (student, mode) => {
  if (mode === 'high_school_only') {
    return student.education_level === 'high_school' || student.education_level === 'both';
  }
  if (mode === 'exclude_high_school') {
    return student.education_level !== 'high_school';
  }
  return true;
};

export default function StudentSwipe() {
  const { skipApprovalGates } = useDemoPreview();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [students, setStudents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ university: '', major: '', location: '', skill: '', gradYear: '' });
  const [eduFilter, setEduFilter] = useState(() => {
    if (typeof window === 'undefined') return 'any';
    return window.localStorage.getItem(EDU_FILTER_KEY) || 'any';
  });
  const cardRef = useRef();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [rp, myJobs] = await Promise.all([
      base44.entities.RecruiterProfile.filter({ created_by: u.email }),
      base44.entities.Job.filter({ created_by: u.email, status: 'active' })
    ]);
    setProfile(rp[0] || null);
    setJobs(myJobs);
    const firstJobId = myJobs.length > 0 ? myJobs[0].id : null;
    if (firstJobId) setSelectedJobId(firstJobId);
    await loadStudentsForJob(firstJobId, u.email);
    setLoading(false);
  };

  const loadStudentsForJob = async (jobId, recruiterEmail, activeFilters, activeEduFilter) => {
    setLoadingStudents(true);
    const email = recruiterEmail || user?.email;
    const f = activeFilters || filters;
    const edu = activeEduFilter ?? eduFilter;

    const allStudentsPromise = base44.entities.StudentProfile.filter({ status: 'approved' });
    const shortlistsPromise = jobId
      ? base44.entities.Shortlist.filter({ created_by: email, job_id: jobId })
      : Promise.resolve([]);

    const [allStudents, myShortlists] = await Promise.all([allStudentsPromise, shortlistsPromise]);

    const shortlistedEmails = new Set(myShortlists.map(s => s.student_email));
    // If no job selected, show all approved students (no shortlist exclusion)
    let unseenStudents = jobId
      ? allStudents.filter(s => !shortlistedEmails.has(s.created_by))
      : allStudents;

    // Apply filters
    if (f.university) unseenStudents = unseenStudents.filter(s => s.university?.toLowerCase().includes(f.university.toLowerCase()));
    if (f.major) unseenStudents = unseenStudents.filter(s => s.major?.toLowerCase().includes(f.major.toLowerCase()));
    if (f.location) unseenStudents = unseenStudents.filter(s => s.location?.toLowerCase().includes(f.location.toLowerCase()));
    if (f.skill) unseenStudents = unseenStudents.filter(s => (s.skills || []).some(sk => sk.toLowerCase().includes(f.skill.toLowerCase())));
    if (f.gradYear) unseenStudents = unseenStudents.filter(s => String(s.graduation_year) === String(f.gradYear));
    unseenStudents = unseenStudents.filter(s => matchesEduFilter(s, edu));

    // Keyword-relevance ranking: when a job is selected, rank candidates by
    // how well their keywords/skills match the job's keywords/required_skills.
    const selectedJob = jobId ? jobs.find(j => j.id === jobId) : null;
    if (selectedJob) {
      const jobKeywords = [
        ...(selectedJob.keywords || []),
        ...(selectedJob.required_skills || []),
      ];
      if (jobKeywords.length > 0) {
        unseenStudents = sortByKeywordRelevance(
          unseenStudents,
          (s) => [...(s.keywords || []), ...(s.skills || [])],
          jobKeywords,
        );
      }
    }

    setStudents(unseenStudents);
    setShortlists(myShortlists);
    setCurrentIndex(0);
    setSwipeCount(0);
    setLoadingStudents(false);
  };

  const handleJobChange = async (jobId) => {
    const id = jobId === 'none' ? null : jobId;
    setSelectedJobId(id || '');
    await loadStudentsForJob(id, user.email);
  };

  const handleEduFilterChange = async (value) => {
    setEduFilter(value);
    if (typeof window !== 'undefined') window.localStorage.setItem(EDU_FILTER_KEY, value);
    await loadStudentsForJob(selectedJobId || null, user?.email, filters, value);
  };

  const handleSwipe = async (direction) => {
    const student = students[currentIndex];
    if (!student) return;
    const studentEmail = student.created_by;
    setSwipeCount(c => c + 1);

    if (direction === 'right' && selectedJobId) {
      // Shortlist the student for the selected job
      await base44.entities.Shortlist.create({ student_email: studentEmail, job_id: selectedJobId });
      // Check if student already swiped right on this job
      const swipes = await base44.entities.Swipe.filter({ created_by: studentEmail, job_id: selectedJobId, direction: 'right' });
      if (swipes.length > 0) {
        const existing = await base44.entities.Match.filter({ student_email: studentEmail, job_id: selectedJobId });
        if (existing.length === 0) {
          const job = jobs.find(j => j.id === selectedJobId);
          await base44.entities.Match.create({
            student_email: studentEmail,
            recruiter_email: user.email,
            job_id: selectedJobId,
            job_title: job?.title || '',
            company: job?.company || ''
          });
          setMatchedStudent(student);
        }
      }
    }
    setCurrentIndex(i => i + 1);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  if (!skipApprovalGates && profile?.status !== 'approved') return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-sm">
        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Account Pending Approval</h2>
        <p className="text-slate-500">You'll be able to browse candidates once your profile is approved.</p>
      </div>
    </div>
  );

  // No early return for no jobs — recruiters can still browse all students

  const visibleStudents = students.slice(currentIndex, currentIndex + 3);
  const isDone = currentIndex >= students.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white p-4">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="pt-4 mb-5">
          <h1 className="text-2xl font-black text-slate-900">Find Talent ⚡</h1>
          <p className="text-slate-500 text-sm mt-0.5">Swipe right to shortlist, left to pass</p>
        </div>

        {/* Job selector */}
        <div className="mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shortlisting for</p>
          <MobileSelect
            value={selectedJobId || 'none'}
            onValueChange={handleJobChange}
            placeholder="Browse all candidates (no job selected)"
            options={[
              { value: 'none', label: 'Browse all candidates' },
              ...jobs.map(job => ({ value: job.id, label: `${job.title} · ${job.company}` }))
            ]}
            className="border-0 p-0 h-auto font-semibold text-slate-800 text-base shadow-none"
          />
        </div>

        {/* Education-level filter (recruiter opt-in / opt-out of HS candidates) */}
        <div className="mb-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Show candidates from</p>
          <MobileSelect
            value={eduFilter}
            onValueChange={handleEduFilterChange}
            options={EDU_FILTER_OPTIONS}
            className="border-0 p-0 h-auto font-semibold text-slate-800 text-sm shadow-none"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-500 text-sm">{Math.max(0, students.length - currentIndex)} candidates remaining</p>
          <div className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-sm font-semibold">
            {swipeCount} reviewed
          </div>
        </div>

        {/* Card stack */}
        <div className="relative h-[560px] mb-8">
          {loadingStudents ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isDone ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">All caught up!</h3>
                <p className="text-slate-500 text-sm mb-6">You've reviewed all available candidates</p>
                <Link to={createPageUrl('RecruiterDashboard')}>
                  <Button className="bg-[#5BA4C4] hover:bg-[#3D87AA]">Back to Dashboard</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {visibleStudents.slice(1).reverse().map((student, i) => (
                <div key={student.id} className="absolute inset-x-0" style={{ top: `${(visibleStudents.slice(1).length - i - 1) * 10}px`, transform: `scale(${1 - (visibleStudents.slice(1).length - i - 1) * 0.04})`, zIndex: i }}>
                  <div className="bg-white rounded-3xl shadow-lg h-[520px] opacity-60" />
                </div>
              ))}
              {visibleStudents[0] && (
                <div className="absolute inset-x-0 z-10" style={{ top: `${Math.min(visibleStudents.length - 1, 2) * 10}px` }}>
                  <StudentSwipeCard ref={cardRef} student={visibleStudents[0]} isTop={true} onSwipe={handleSwipe} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Buttons */}
        {!isDone && !loadingStudents && (
          <div className="flex items-center justify-center gap-5">
            <button onClick={() => cardRef.current?.swipeLeft()}
              className="flex items-center gap-2 bg-white border-2 border-red-200 text-red-500 font-bold text-base px-8 py-4 rounded-2xl hover:bg-red-50 hover:border-red-400 hover:scale-105 transition-all shadow-md">
              <X className="w-5 h-5" /> No
            </button>
            <button onClick={() => cardRef.current?.swipeRight()}
              className="flex items-center gap-2 bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-base px-8 py-4 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-violet-500/30">
              <Star className="w-5 h-5" /> Yes
            </button>
          </div>
        )}
      </div>

      {/* Match Modal */}
      <AnimatePresence>
        {matchedStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5 } }} exit={{ scale: 0.5, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">It's a Match!</h2>
              <p className="text-slate-500 mb-1"><strong>{matchedStudent.full_name}</strong> already swiped right on your job</p>
              <p className="font-bold text-violet-600 text-lg mb-6">{jobs.find(j => j.id === selectedJobId)?.title}</p>
              <div className="space-y-3">
                <Link to={createPageUrl('Messages')} onClick={() => setMatchedStudent(null)}>
                  <Button className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA]"><MessageCircle className="w-4 h-4 mr-2" />Send a Message</Button>
                </Link>
                <Button variant="outline" onClick={() => setMatchedStudent(null)} className="w-full">Keep Swiping</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}