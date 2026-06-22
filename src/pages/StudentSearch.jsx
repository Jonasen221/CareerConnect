import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MobileSelect from '../components/layout/MobileSelect';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, Filter, GraduationCap, MapPin, Link as LinkIcon, CheckCircle, ChevronDown, Phone, Sparkles, FileText, X, Video, BarChart2 } from 'lucide-react';
import CandidateCompare from '../components/candidates/CandidateCompare';
import CallRequestForm from '../components/recruiters/CallRequestForm';
import EducationLevelBadge from '../components/students/EducationLevelBadge';
import { sortByKeywordRelevance } from '@/lib/keywordScore';

export default function StudentSearch() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [filters, setFilters] = useState({ university: '', major: '', grad_year: '', skills: [], education_levels: [] });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [shortlistJobId, setShortlistJobId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState(false);
  const [newMatchId, setNewMatchId] = useState(null);
  const [showCallRequestForm, setShowCallRequestForm] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [sendingCallRequest, setSendingCallRequest] = useState(false);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [studentBookings, setStudentBookings] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [allStudents, myJobs, myShortlists, recruiterProfiles, allBookings] = await Promise.all([
      base44.entities.StudentProfile.filter({ status: 'approved' }),
      base44.entities.Job.filter({ created_by: u.email, status: 'active' }),
      base44.entities.Shortlist.filter({ created_by: u.email }),
      base44.entities.RecruiterProfile.filter({ created_by: u.email }),
      base44.entities.CreditRedemption.list('-updated_date', 1000)
    ]);
    setStudents(allStudents);
    setJobs(myJobs);
    setShortlists(myShortlists);
    setRecruiterProfile(recruiterProfiles[0] || null);
    
    // Build map of student emails to booking status
    const bookingMap = {};
    allBookings.forEach(b => {
      if (b.created_by) bookingMap[b.created_by] = true;
    });
    setStudentBookings(bookingMap);
    
    setLoading(false);
  };

  const handleSendCallRequest = async (formData) => {
    if (!selectedStudent) return;
    setSendingCallRequest(true);
    
    try {
      await base44.entities.CallRequest.create({
        student_email: selectedStudent.created_by,
        recruiter_email: user.email,
        recruiter_name: recruiterProfile?.full_name || user.full_name || '',
        company: recruiterProfile?.company || '',
        job_title: formData.job_title,
        proposed_date: formData.proposed_date,
        proposed_time: formData.proposed_time,
        message: formData.message,
      });
      setShowCallRequestForm(false);
      setSelectedStudent(null);
      alert('Call request sent!');
    } catch (error) {
      alert('Error sending call request');
    }
    setSendingCallRequest(false);
  };

  const selectedJob = jobs.find(j => j.id === shortlistJobId);
  const jobSkills = selectedJob?.required_skills || [];
  const activeSkillFilters = filters.skills;

  const filteredStudents = (() => {
    const passed = students.filter(s => {
      if (filters.university && !s.university?.toLowerCase().includes(filters.university.toLowerCase())) return false;
      if (filters.major && !s.major?.toLowerCase().includes(filters.major.toLowerCase())) return false;
      if (filters.grad_year && s.graduation_year !== parseInt(filters.grad_year)) return false;
      if (activeSkillFilters.length > 0 && !activeSkillFilters.every(sk => (s.skills || []).includes(sk))) return false;
      if (filters.education_levels.length > 0 && !filters.education_levels.includes(s.education_level)) return false;
      if (selectedJob?.preferred_majors?.length > 0 && filters.major === '' && !selectedJob.preferred_majors.some(m => s.major?.toLowerCase().includes(m.toLowerCase()))) return false;
      if (selectedJob?.grad_year_min && s.graduation_year && s.graduation_year < selectedJob.grad_year_min) return false;
      if (selectedJob?.grad_year_max && s.graduation_year && s.graduation_year > selectedJob.grad_year_max) return false;
      return true;
    });
    // Rank by keyword relevance to the selected job when one is picked.
    if (!selectedJob) return passed;
    const jobKeywords = [
      ...(selectedJob.keywords || []),
      ...(selectedJob.required_skills || []),
    ];
    if (jobKeywords.length === 0) return passed;
    return sortByKeywordRelevance(
      passed,
      (s) => [...(s.keywords || []), ...(s.skills || [])],
      jobKeywords,
    );
  })();

  const toggleEducationLevelFilter = (value) => {
    setFilters(p => ({
      ...p,
      education_levels: p.education_levels.includes(value)
        ? p.education_levels.filter(v => v !== value)
        : [...p.education_levels, value],
    }));
  };

  const toggleSkillFilter = (skill) => {
    setFilters(p => ({
      ...p,
      skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill]
    }));
  };

  const runAIMatch = async () => {
    if (!shortlistJobId || students.length === 0) return;
    setAiMatching(true);
    setAiResults(null);
    const job = jobs.find(j => j.id === shortlistJobId);
    const candidateList = students.map(s => ({
      id: s.id,
      name: s.full_name,
      university: s.university,
      major: s.major,
      graduation_year: s.graduation_year,
      location: s.location,
      skills: s.skills || [],
      languages: s.languages || [],
      work_preferences: s.work_preferences || [],
      bio: s.bio || '',
      has_cv: !!s.resume_url,
    }));
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a talent acquisition expert. Given a job posting and a list of candidates, rank the TOP 5 best-fit candidates.

JOB:
Title: ${job.title}
Company: ${job.company || ''}
Type: ${job.type}
Location: ${job.location || 'Any'}
Description: ${job.description || ''}
Required Skills: ${(job.required_skills || []).join(', ') || 'None specified'}
Required Languages: ${(job.required_languages || []).join(', ') || 'None specified'}
Grad Year Range: ${job.grad_year_min || 'Any'} - ${job.grad_year_max || 'Any'}

CANDIDATES:
${JSON.stringify(candidateList, null, 2)}

Return the top 5 candidates ranked by fit. For each, give a match_score (0-100), a 1-sentence reason, and key matching strengths.`,
      response_json_schema: {
        type: 'object',
        properties: {
          ranked_candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                match_score: { type: 'number' },
                reason: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });
    setAiResults(result.ranked_candidates || []);
    setAiMatching(false);
  };

  const isShortlisted = (studentEmail, jobId) => shortlists.some(sl => sl.student_email === studentEmail && sl.job_id === jobId);

  const handleShortlist = async (student) => {
    if (!shortlistJobId) return;
    setShortlisting(true);
    const studentEmail = student.created_by;
    const existing = shortlists.find(sl => sl.student_email === studentEmail && sl.job_id === shortlistJobId);

    if (existing) {
      await base44.entities.Shortlist.delete(existing.id);
    } else {
      await base44.entities.Shortlist.create({ student_email: studentEmail, job_id: shortlistJobId });
      // Check for match
      const swipes = await base44.entities.Swipe.filter({ created_by: studentEmail, job_id: shortlistJobId, direction: 'right' });
      if (swipes.length > 0) {
        const existingMatches = await base44.entities.Match.filter({ student_email: studentEmail, recruiter_email: user.email, job_id: shortlistJobId });
        if (existingMatches.length === 0) {
          const job = jobs.find(j => j.id === shortlistJobId);
          await base44.entities.Match.create({ student_email: studentEmail, recruiter_email: user.email, job_id: shortlistJobId, job_title: job?.title || '', company: job?.company || '' });
          setNewMatchId(student.id);
          setTimeout(() => setNewMatchId(null), 3000);
        }
      }
    }
    const updated = await base44.entities.Shortlist.filter({ created_by: user.email });
    setShortlists(updated);
    setShortlisting(false);
  };

  const aiScoreMap = {};
  if (aiResults) aiResults.forEach(r => { aiScoreMap[r.id] = r.match_score; });

  const toggleCompare = (id) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const StudentCard = ({ student }) => {
    const initials = student.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
    const isShort = shortlistJobId ? isShortlisted(student.created_by, shortlistJobId) : false;
    const isMatch = newMatchId === student.id;
    const inCompare = compareIds.includes(student.id);
    const hasBooking = studentBookings[student.created_by];
    return (
      <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${isMatch ? 'border-[#5BA4C4] ring-2 ring-[#EAF5FB]' : inCompare ? 'border-[#5BA4C4] ring-2 ring-[#5BA4C4]/20' : 'border-[#E8E4DF]'}`}>
        <div className="bg-gradient-to-br from-[#2E3F4F] to-[#3D87AA] p-5">
           {compareMode && (
             <button onClick={() => toggleCompare(student.id)}
               className={`mb-2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                 inCompare ? 'bg-white text-[#3D87AA]' : 'bg-white/20 text-white hover:bg-white/30'
               }`}>
               {inCompare ? <CheckCircle className="w-3 h-3" /> : <BarChart2 className="w-3 h-3" />}
               {inCompare ? 'Selected' : 'Select'}
             </button>
           )}
           {hasBooking && (
             <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-yellow-400/90 text-yellow-900 rounded-full w-fit">
               <Sparkles className="w-3 h-3" /> Priority
             </div>
           )}
           <Avatar className="w-14 h-14 mb-3"><AvatarFallback className="bg-[#5BA4C4] text-white text-lg">{initials}</AvatarFallback></Avatar>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white">{student.full_name}</h3>
            {student.education_level && (
              <EducationLevelBadge level={student.education_level} className="bg-white/90 border-white/30" />
            )}
          </div>
          <p className="text-white/70 text-sm">{student.major}</p>
          <p className="text-white/50 text-xs">{student.university}</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 flex-wrap">
            {student.graduation_year && <span className="text-xs text-[#7A7870] flex items-center gap-1"><GraduationCap className="w-3 h-3" />{student.graduation_year}</span>}
            {student.location && <span className="text-xs text-[#7A7870] flex items-center gap-1"><MapPin className="w-3 h-3" />{student.location}</span>}
          </div>
          {(student.skills || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {student.skills.slice(0, 3).map(s => <span key={s} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full">{s}</span>)}
              {student.skills.length > 3 && <span className="text-xs text-[#7A7870]">+{student.skills.length - 3}</span>}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)} className="flex-1 text-xs">View Profile</Button>
            <Button size="sm" onClick={() => handleShortlist(student)} disabled={!shortlistJobId || shortlisting} className={`flex-1 text-xs ${isShort ? 'bg-[#3D87AA] hover:bg-[#2d6d8e] text-white' : 'bg-[#5BA4C4] hover:bg-[#3D87AA] text-white'}`}>
              <Star className="w-3 h-3 mr-1" />{isShort ? 'Shortlisted' : 'Shortlist'}
            </Button>
          </div>
          {isMatch && <div className="flex items-center gap-1.5 text-[#3D87AA] text-xs font-semibold bg-[#EAF5FB] px-3 py-1.5 rounded-lg border border-[#A8D4E8]"><CheckCircle className="w-3.5 h-3.5" />It's a match!</div>}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-[#2E3F4F]">Find Talent</h1><p className="text-[#7A7870] mt-1">Browse and shortlist candidates for your open roles</p></div>
        <div className="flex items-center gap-2">
          {compareMode && compareIds.length >= 2 && (
            <Button onClick={() => setShowCompare(true)} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white text-sm">
              <BarChart2 className="w-4 h-4 mr-1.5" /> Compare ({compareIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => { setCompareMode(m => !m); setCompareIds([]); }} className={`text-sm ${compareMode ? 'border-[#5BA4C4] text-[#3D87AA] bg-[#EAF5FB]' : ''}`}>
            <BarChart2 className="w-4 h-4 mr-1.5" />{compareMode ? 'Cancel Compare' : 'Compare'}
          </Button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="mb-6 p-4 bg-[#EAF5FB] border border-[#A8D4E8] rounded-2xl flex flex-wrap items-center gap-3">
          <p className="text-[#2d5f7a] font-medium text-sm">Shortlisting for:</p>
          <MobileSelect
            value={shortlistJobId}
            onValueChange={(id) => {
              setShortlistJobId(id);
              setAiResults(null);
              const job = jobs.find(j => j.id === id);
              setFilters(p => ({ ...p, skills: job?.required_skills || [] }));
            }}
            placeholder="Select a job"
            options={jobs.map(job => ({ value: job.id, label: job.title }))}
            className="w-64 bg-white"
          />
          {shortlistJobId && (
            <Button onClick={runAIMatch} disabled={aiMatching} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />{aiMatching ? 'Analysing...' : 'AI Match'}
            </Button>
          )}
          {!shortlistJobId && <p className="text-xs text-[#5BA4C4]">Select a job to auto-filter by required skills</p>}
        </div>
      )}

      <div className="mb-6 bg-white rounded-2xl border border-[#E8E4DF] shadow-sm p-4">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-[#2E3F4F] font-medium text-sm w-full">
          <Filter className="w-4 h-4" /> Filters <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && (
          <div className="space-y-4 mt-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="University..." value={filters.university} onChange={e => setFilters(p => ({ ...p, university: e.target.value }))} />
              <Input placeholder="Major..." value={filters.major} onChange={e => setFilters(p => ({ ...p, major: e.target.value }))} />
              <Input placeholder="Grad year..." value={filters.grad_year} onChange={e => setFilters(p => ({ ...p, grad_year: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7A7870] uppercase tracking-wider mb-2">Education level — tap to toggle</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'high_school', label: 'High school' },
                  { value: 'university', label: 'University / College' },
                  { value: 'both', label: 'Both' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => toggleEducationLevelFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filters.education_levels.includes(opt.value) ? 'bg-[#5BA4C4] text-white' : 'bg-[#EAF5FB] text-[#3D87AA] hover:bg-[#A8D4E8]'}`}>
                    {opt.label}
                  </button>
                ))}
                {filters.education_levels.length > 0 && (
                  <button onClick={() => setFilters(p => ({ ...p, education_levels: [] }))} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8E4DF] text-[#7A7870] hover:bg-[#d0cbc4]">Clear</button>
                )}
              </div>
              <p className="text-xs text-[#7A7870] mt-1.5">Leave empty to see candidates at any level (including those who haven&apos;t specified).</p>
            </div>
            {jobSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#7A7870] uppercase tracking-wider mb-2">Filter by job skills — tap to toggle</p>
                <div className="flex flex-wrap gap-2">
                  {jobSkills.map(skill => (
                    <button key={skill} type="button" onClick={() => toggleSkillFilter(skill)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeSkillFilters.includes(skill) ? 'bg-[#5BA4C4] text-white' : 'bg-[#EAF5FB] text-[#3D87AA] hover:bg-[#A8D4E8]'}`}>
                      {skill}
                    </button>
                  ))}
                  {activeSkillFilters.length > 0 && (
                    <button onClick={() => setFilters(p => ({ ...p, skills: [] }))} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8E4DF] text-[#7A7870] hover:bg-[#d0cbc4]">Clear skills</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {aiResults && (
        <div className="mb-8 bg-white rounded-2xl border border-[#A8D4E8] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#EAF5FB] to-white border-b border-[#A8D4E8]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5BA4C4]" />
              <h2 className="font-bold text-[#2E3F4F] text-base">AI Top Matches</h2>
              <span className="text-xs text-[#7A7870]">for {jobs.find(j => j.id === shortlistJobId)?.title}</span>
            </div>
            <button onClick={() => setAiResults(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-[#E8E4DF]">
            {aiResults.map((res, i) => {
              const student = students.find(s => s.id === res.id);
              const isShort = student && shortlistJobId ? isShortlisted(student.created_by, shortlistJobId) : false;
              return (
                <div key={res.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EAF5FB] flex items-center justify-center text-[#3D87AA] font-bold text-sm">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#2E3F4F]">{res.name}</span>
                      {student?.resume_url && <a href={student.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5BA4C4] hover:underline"><FileText className="w-3 h-3" />View CV</a>}
                    </div>
                    <p className="text-xs text-[#7A7870] mt-0.5">{res.reason}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(res.strengths || []).map(s => <span key={s} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-black text-[#3D87AA]">{res.match_score}</div>
                      <div className="text-xs text-[#7A7870]">score</div>
                    </div>
                    {student && shortlistJobId && (
                      <Button size="sm" onClick={() => handleShortlist(student)} disabled={shortlisting} className={`text-xs ${isShort ? 'bg-[#3D87AA] text-white' : 'bg-[#5BA4C4] hover:bg-[#3D87AA] text-white'}`}>
                        <Star className="w-3 h-3 mr-1" />{isShort ? 'Listed' : 'Shortlist'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm text-[#7A7870] mb-4">{filteredStudents.length} candidate{filteredStudents.length !== 1 ? 's' : ''} found{compareMode ? ` · Select up to 4 to compare` : ''}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(s => <StudentCard key={s.id} student={s} />)}
        {filteredStudents.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Search className="w-12 h-12 text-[#8FAFC4] mx-auto mb-3" />
            <p className="text-[#7A7870] font-medium">No candidates match your filters</p>
          </div>
        )}
      </div>

      {showCompare && (
        <CandidateCompare
          candidates={filteredStudents.filter(s => compareIds.includes(s.id))}
          aiScores={aiScoreMap}
          onClose={() => setShowCompare(false)}
        />
      )}

      <CallRequestForm
        isOpen={showCallRequestForm}
        onClose={() => setShowCallRequestForm(false)}
        student={selectedStudent}
        recruiter={recruiterProfile}
        onSubmit={handleSendCallRequest}
        isLoading={sendingCallRequest}
      />

      <Dialog open={!!selectedStudent} onOpenChange={() => { setSelectedStudent(null); setShowCallRequestForm(false); }}>
         <DialogContent className="max-w-lg">
           {selectedStudent && (
             <>
               <DialogHeader><DialogTitle>Candidate Profile</DialogTitle></DialogHeader>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16"><AvatarFallback className="bg-[#5BA4C4] text-white text-xl">{selectedStudent.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-[#2E3F4F]">{selectedStudent.full_name}</h3>
                    <p className="text-[#7A7870]">{selectedStudent.university}</p>
                    <p className="text-[#7A7870] text-sm">{selectedStudent.major} · Class of {selectedStudent.graduation_year}</p>
                  </div>
                </div>
                {selectedStudent.bio && <p className="text-[#7A7870] text-sm">{selectedStudent.bio}</p>}
                <div className="flex gap-4 text-sm flex-wrap">
                  {selectedStudent.location && <span className="flex items-center gap-1 text-[#7A7870]"><MapPin className="w-4 h-4" />{selectedStudent.location}</span>}
                  {selectedStudent.gpa && <span className="text-[#7A7870]">GPA: {selectedStudent.gpa}</span>}
                </div>
                {(selectedStudent.skills || []).length > 0 && (
                  <div><p className="text-xs font-bold text-[#8FAFC4] uppercase tracking-wider mb-2">Skills</p><div className="flex flex-wrap gap-1.5">{selectedStudent.skills.map(s => <span key={s} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2.5 py-1 rounded-full">{s}</span>)}</div></div>
                )}
                {(selectedStudent.work_preferences || []).length > 0 && (
                  <div><p className="text-xs font-bold text-[#8FAFC4] uppercase tracking-wider mb-2">Work Preferences</p><div className="flex flex-wrap gap-1.5">{selectedStudent.work_preferences.map(p => <span key={p} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2.5 py-1 rounded-full capitalize">{p.replace('_', ' ')}</span>)}</div></div>
                )}
                {selectedStudent.linkedin_url && <a href={selectedStudent.linkedin_url.startsWith('http') ? selectedStudent.linkedin_url : `https://${selectedStudent.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#5BA4C4] hover:underline text-sm"><LinkIcon className="w-4 h-4" />View LinkedIn</a>}
                {selectedStudent.resume_url && (
                  <a href={selectedStudent.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#5BA4C4] hover:underline text-sm font-medium">
                    <FileText className="w-4 h-4" /> View CV / Resume
                  </a>
                )}
                {selectedStudent.intro_video_url && (
                  <div>
                    <p className="text-xs font-bold text-[#8FAFC4] uppercase tracking-wider mb-2 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> 90-Second Pitch</p>
                    <video src={selectedStudent.intro_video_url} controls className="w-full rounded-xl border border-slate-200 max-h-56 bg-black" />
                  </div>
                )}
                <div className="flex gap-2">
                  {shortlistJobId && (
                    <Button onClick={() => { handleShortlist(selectedStudent); setSelectedStudent(null); }} disabled={shortlisting} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
                      <Star className="w-4 h-4 mr-2" />{isShortlisted(selectedStudent.created_by, shortlistJobId) ? 'Shortlisted' : 'Shortlist'}
                    </Button>
                  )}
                  <Button onClick={() => setShowCallRequestForm(true)} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
                    <Phone className="w-4 h-4 mr-2" />Request Call
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}