import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileSelect from '../components/layout/MobileSelect';
import { GraduationCap, Briefcase, CheckCircle, ArrowRight, ArrowLeft, UserSearch } from 'lucide-react';
import VideoUpload from '../components/onboarding/VideoUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X as XIcon } from 'lucide-react';

const SKILLS = [
"Python", "JavaScript", "React", "SQL", "Data Analysis", "Machine Learning",
"Finance", "Marketing", "Accounting", "Excel", "Project Management",
"Leadership", "Research", "Statistics", "Java", "Product Management",
"Sales", "Communication", "Business Development", "Consulting"];

const WORK_PREFS = [
{ value: "full_time", label: "Full-time" }, { value: "part_time", label: "Part-time" },
{ value: "internship", label: "Internship" }, { value: "remote", label: "Remote" },
{ value: "hybrid", label: "Hybrid" }, { value: "on_site", label: "On-site" }];

const GRAD_YEARS = Array.from({ length: 41 }, (_, i) => 1990 + i);
const GRAD_MONTHS = [
{ value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
{ value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
{ value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
{ value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }];

const LANGUAGES = [
"English", "Spanish", "Mandarin", "Hindi", "French", "Arabic", "Portuguese", "Russian",
"Japanese", "German", "Korean", "Italian", "Dutch", "Swedish", "Polish", "Turkish",
"Greek", "Vietnamese", "Thai", "Hebrew", "Tagalog", "Bengali", "Urdu"];

const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Consulting", "Media", "Manufacturing", "Retail", "Education", "Government", "Non-profit", "Energy", "Real Estate", "Telecommunications", "Transportation", "Hospitality", "Agriculture", "Construction", "Law"];

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Switzerland", "Singapore", "Japan", "China", "India", "Brazil", "Mexico", "South Korea"];


const variants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 }
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pitchVideoUrl, setPitchVideoUrl] = useState('');

  const [cvUrl, setCvUrl] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvFileName, setCvFileName] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [studentData, setStudentData] = useState({
    full_name: '', university: '', major: '', graduation_year: '', graduation_month: '',
    bio: '', skills: [], languages: [], location: '', nationality: '', industries: [], linkedin_url: '', email: '', phone_number: '', work_preferences: [], intro_video_url: '', resume_url: ''
  });
  const [recruiterData, setRecruiterData] = useState({
    full_name: '', company: '', title: '', industry: '', company_website: '', bio: '', email: '', phone_number: '', is_contact_point: false, intro_video_url: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u.full_name) {
        const parts = u.full_name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const selectRole = (r) => {
    setRole(r);
    setRecruiterData((p) => ({ ...p, is_contact_point: r === 'contact_point' }));
    setStep(2);
  };

  const handleVideoContinue = () => {
    if (!pitchVideoUrl) {
      setErrors({ pitch_video: 'Please upload your 30-90 second pitch video to continue' });
      return;
    }
    setErrors({});
    // Store pitch video as intro_video_url
    setStudentData(p => ({ ...p, intro_video_url: pitchVideoUrl }));
    setRecruiterData(p => ({ ...p, intro_video_url: pitchVideoUrl }));
    setStep(3);
  };

  const [customSkill, setCustomSkill] = useState('');

  const toggleSkill = (skill) => setStudentData((p) => ({
    ...p, skills: p.skills.includes(skill) ? p.skills.filter((s) => s !== skill) : [...p.skills, skill]
  }));

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !studentData.skills.includes(trimmed)) {
      setStudentData((p) => ({ ...p, skills: [...p.skills, trimmed] }));
    }
    setCustomSkill('');
  };
  const toggleLanguage = (language) => setStudentData((p) => ({
    ...p, languages: p.languages.includes(language) ? p.languages.filter((l) => l !== language) : [...p.languages, language]
  }));
  const togglePref = (pref) => setStudentData((p) => ({
    ...p, work_preferences: p.work_preferences.includes(pref) ? p.work_preferences.filter((w) => w !== pref) : [...p.work_preferences, pref]
  }));

  const handleCvUpload = async (file) => {
    if (!file) return;
    setCvUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCvUrl(file_url);
    setCvFileName(file.name);
    setStudentData(p => ({ ...p, resume_url: file_url }));
    setErrors(e => ({ ...e, cv: undefined }));
    setCvUploading(false);
  };

  const validateStudent = () => {
    const e = {};
    if (!firstName.trim()) e.first_name = 'Required';
    if (!lastName.trim()) e.last_name = 'Required';
    if (!studentData.university.trim()) e.university = 'Required';
    if (!studentData.major.trim()) e.major = 'Required';
    if (!studentData.graduation_year) e.graduation_year = 'Required';
    if (!studentData.graduation_month) e.graduation_month = 'Required';
    if (!studentData.location.trim()) e.location = 'Required';
    if (!studentData.nationality.trim()) e.nationality = 'Required';
    if (studentData.industries.length === 0) e.industries = 'Select at least one industry';
    if (!studentData.linkedin_url.trim()) e.linkedin_url = 'Required';
    if (!studentData.email.trim()) e.email = 'Required';
    if (!studentData.phone_number.trim()) e.phone_number = 'Required';
    if (!studentData.bio.trim()) e.bio = 'Required';
    if (!studentData.resume_url) e.cv = 'Please upload your CV';
    if (studentData.skills.length === 0) e.skills = 'Select at least one skill';
    if (studentData.languages.length === 0) e.languages = 'Select at least one language';
    if (studentData.work_preferences.length === 0) e.work_preferences = 'Select at least one preference';
    return e;
  };

  const validateRecruiter = () => {
    const e = {};
    if (!firstName.trim()) e.first_name = 'Required';
    if (!lastName.trim()) e.last_name = 'Required';
    if (!recruiterData.title.trim()) e.title = 'Required';
    if (!recruiterData.company.trim()) e.company = 'Required';
    if (!recruiterData.industry.trim()) e.industry = 'Required';
    if (!recruiterData.company_website.trim()) e.company_website = 'Required';
    if (!recruiterData.bio.trim()) e.bio = 'Required';
    if (!recruiterData.email.trim()) e.email = 'Required';
    if (!recruiterData.phone_number.trim()) e.phone_number = 'Required';
    return e;
  };

  const handleSubmit = async () => {
    const validationErrors = role === 'student' ? validateStudent() : validateRecruiter();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    await base44.auth.updateMe({ full_name: fullName });
    if (role === 'student') {
      await base44.entities.StudentProfile.create({
        ...studentData,
        full_name: fullName,
        ...studentData,
        graduation_year: parseInt(studentData.graduation_year) || null,
        graduation_month: studentData.graduation_month ? parseInt(studentData.graduation_month) : null,
        status: 'pending'
      });
    } else {
      await base44.entities.RecruiterProfile.create({ ...recruiterData, full_name: fullName, status: 'pending' });
    }
    setSubmitting(false);
    setStep(4);
  };

  const isRecruiterType = role === 'recruiter' || role === 'contact_point';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAF5FB] via-white to-[#EAF5FB] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#5BA4C4]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A8D4E8]/15 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#5BA4C4] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#5BA4C4]/30">
            <span className="text-white font-bold text-xl">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">CareerConnect</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 &&
          <motion.div key="step1" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Who are you?</h2>
                <p className="text-slate-500 mt-2">Tell us how you'll be using CareerConnect</p>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                <button onClick={() => selectRole('student')} className="group p-8 bg-white rounded-3xl border-2 border-slate-200 hover:border-[#5BA4C4] hover:shadow-xl hover:shadow-[#5BA4C4]/10 transition-all text-left">
                  <div className="w-14 h-14 bg-[#EAF5FB] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#A8D4E8]/40 transition-colors">
                    <GraduationCap className="w-7 h-7 text-[#5BA4C4]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Candidate</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Looking for internships and entry-level opportunities to kickstart my career</p>
                  <div className="mt-5 flex items-center gap-1 text-[#5BA4C4] text-sm font-semibold">Get started <ArrowRight className="w-4 h-4" /></div>
                </button>
                <button onClick={() => selectRole('recruiter')} className="group p-8 bg-white rounded-3xl border-2 border-slate-200 hover:border-[#3D87AA] hover:shadow-xl hover:shadow-[#3D87AA]/10 transition-all text-left">
                  <div className="w-14 h-14 bg-[#EAF5FB] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#A8D4E8]/40 transition-colors">
                    <Briefcase className="w-7 h-7 text-[#3D87AA]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Recruiter</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Looking to discover and hire early-career talent from top universities</p>
                  <div className="mt-5 flex items-center gap-1 text-[#3D87AA] text-sm font-semibold">Get started <ArrowRight className="w-4 h-4" /></div>
                </button>
                <button onClick={() => selectRole('contact_point')} className="group p-8 bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors">
                    <UserSearch className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Contact Point</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">A company representative who can scout and refer promising candidates</p>
                  <div className="mt-5 flex items-center gap-1 text-emerald-600 text-sm font-semibold">Get started <ArrowRight className="w-4 h-4" /></div>
                </button>
              </div>
            </motion.div>
          }

          {step === 2 &&
          <motion.div key="step2video" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <button onClick={() => { setStep(1); setErrors({}); }} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="mb-7">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#3D87AA] bg-[#EAF5FB] px-3 py-1 rounded-full">Step 1 of 2</span>
                  <h2 className="text-2xl font-bold text-slate-800 mt-3">Record your 30-90 second pitch 🎥</h2>
                  <p className="text-slate-500 text-sm mt-1">Introduce yourself in 30-90 seconds — this is the first thing your potential match will see. Be yourself!</p>
                </div>
                <div className="space-y-5">
                  <div className="p-4 bg-[#EAF5FB] border border-[#A8D4E8] rounded-2xl space-y-2 text-sm text-[#2d5f7a]">
                    <p className="font-semibold">💡 What to include in your pitch:</p>
                    <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                      <li>Who you are and your background</li>
                      <li>What you're passionate about</li>
                      <li>What kind of opportunity you're looking for</li>
                      <li>Why CareerConnect is right for you</li>
                    </ul>
                  </div>
                  <VideoUpload
                    value={pitchVideoUrl}
                    onChange={(v) => { setPitchVideoUrl(v); setErrors({}); }}
                    label="30-90 second pitch video"
                    description="Keep it between 30-90 seconds. Tell us who you are, what drives you, and what you're looking for."
                  />
                  {errors.pitch_video && <p className="text-sm text-red-500 font-medium">{errors.pitch_video}</p>}
                  <Button onClick={handleVideoContinue} className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] text-white py-6 text-base font-semibold rounded-xl">
                    Continue to Profile →
                  </Button>
                </div>
              </div>
            </motion.div>
          }

          {step === 3 && role === 'student' &&
          <motion.div key="step3s" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="mb-7">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#3D87AA] bg-[#EAF5FB] px-3 py-1 rounded-full">Step 2 of 2 · Candidate Profile</span>
                  <h2 className="text-2xl font-bold text-slate-800 mt-3">Build your profile</h2>
                  <p className="text-slate-500 text-sm mt-1">This will be reviewed by our team and shared with recruiters</p>
                </div>
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">👀 What recruiters will see</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-amber-800">
                    <span>✓ Name &amp; photo</span>
                    <span>✓ University &amp; major</span>
                    <span>✓ Graduation date</span>
                    <span>✓ Location</span>
                    <span>✓ Skills &amp; languages</span>
                    <span>✓ Work preferences</span>
                    <span>✓ Bio</span>
                    <span>✓ LinkedIn &amp; pitch video</span>
                    <span>✓ CV / resume</span>
                    <span className="text-amber-500">✗ Phone &amp; email (hidden)</span>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">First Name *</Label>
                       <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="Jane" />
                       {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
                     </div>
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">Last Name *</Label>
                       <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="Smith" />
                       {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
                     </div>
                   </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">Location *</Label>
                      <Input value={studentData.location} onChange={(e) => setStudentData((p) => ({ ...p, location: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="New York, NY" />
                      {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                    </div>
                    <div>
                       <Label className="text-sm font-semibold text-slate-700">Nationality *</Label>
                      <MobileSelect
                      value={studentData.nationality}
                      onValueChange={(v) => setStudentData((p) => ({ ...p, nationality: v }))}
                      placeholder="Select nationality"
                      options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                      className={`mt-1.5 ${errors.nationality ? 'border-red-400' : ''}`} />
                      {errors.nationality && <p className="text-xs text-red-500 mt-1">{errors.nationality}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">University *</Label>
                      <Input value={studentData.university} onChange={(e) => setStudentData((p) => ({ ...p, university: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Harvard University" />
                      {errors.university && <p className="text-xs text-red-500 mt-1">{errors.university}</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Major *</Label>
                      <Input value={studentData.major} onChange={(e) => setStudentData((p) => ({ ...p, major: e.target.value }))} className="bg-transparent text-slate-500 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Computer Science" />
                      {errors.major && <p className="text-xs text-red-500 mt-1">{errors.major}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Graduation Month *</Label>
                      <MobileSelect
                      value={studentData.graduation_month}
                      onValueChange={(v) => setStudentData((p) => ({ ...p, graduation_month: v }))}
                      placeholder="Select month"
                      options={GRAD_MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                      className={`mt-1.5 ${errors.graduation_month ? 'border-red-400' : ''}`} />

                      {errors.graduation_month && <p className="text-xs text-red-500 mt-1">{errors.graduation_month}</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Graduation Year *</Label>
                      <MobileSelect
                      value={studentData.graduation_year}
                      onValueChange={(v) => setStudentData((p) => ({ ...p, graduation_year: v }))}
                      placeholder="Select year"
                      options={GRAD_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                      className={`mt-1.5 ${errors.graduation_year ? 'border-red-400' : ''}`} />

                      {errors.graduation_year && <p className="text-xs text-red-500 mt-1">{errors.graduation_year}</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">LinkedIn URL *</Label>
                    <Input value={studentData.linkedin_url} onChange={(e) => setStudentData((p) => ({ ...p, linkedin_url: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="linkedin.com/in/jane" />
                    {errors.linkedin_url && <p className="text-xs text-red-500 mt-1">{errors.linkedin_url}</p>}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Email *</Label>
                      <Input type="email" value={studentData.email} onChange={(e) => setStudentData((p) => ({ ...p, email: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="jane@email.com" />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Phone Number *</Label>
                      <Input type="tel" value={studentData.phone_number} onChange={(e) => setStudentData((p) => ({ ...p, phone_number: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="+1 555 000 0000" />
                      {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Short Bio *</Label>
                    <Textarea value={studentData.bio} onChange={(e) => setStudentData((p) => ({ ...p, bio: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-2 text-base rounded-md flex min-h-[60px] w-full border border-input shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none" rows={3} placeholder="Tell recruiters about yourself..." />
                    {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Skills *</Label>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS.map((skill) =>
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${studentData.skills.includes(skill) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{skill}</button>
                    )}
                      {studentData.skills.filter(s => !SKILLS.includes(s)).map(skill => (
                        <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5BA4C4] text-white">{skill}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={customSkill}
                        onChange={e => setCustomSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                        placeholder="Add a custom skill..."
                        className="h-8 text-sm"
                      />
                      <button type="button" onClick={addCustomSkill} className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all">+ Add</button>
                    </div>
                    {errors.skills && <p className="text-xs text-red-500 mt-2">{errors.skills}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Industries *</Label>
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRIES.map((ind) =>
                    <button key={ind} type="button" onClick={() => setStudentData(p => ({ ...p, industries: p.industries.includes(ind) ? p.industries.filter(i => i !== ind) : [...p.industries, ind] }))} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${studentData.industries.includes(ind) ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{ind}</button>
                    )}
                    </div>
                    {errors.industries && <p className="text-xs text-red-500 mt-2">{errors.industries}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Languages *</Label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((language) =>
                    <button key={language} type="button" onClick={() => toggleLanguage(language)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${studentData.languages.includes(language) ? 'bg-[#3D87AA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{language}</button>
                    )}
                    </div>
                    {errors.languages && <p className="text-xs text-red-500 mt-2">{errors.languages}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Work Preferences *</Label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_PREFS.map((p) =>
                    <button key={p.value} type="button" onClick={() => togglePref(p.value)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${studentData.work_preferences.includes(p.value) ? 'bg-[#3D87AA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}>{p.label}</button>
                    )}
                    </div>
                    {errors.work_preferences && <p className="text-xs text-red-500 mt-2">{errors.work_preferences}</p>}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Upload CV *</Label>
                    {cvUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700 font-medium flex-1 truncate">{cvFileName}</span>
                        <button type="button" onClick={() => { setCvUrl(''); setCvFileName(''); setStudentData(p => ({ ...p, resume_url: '' })); }} className="text-slate-400 hover:text-red-500">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${errors.cv ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-[#5BA4C4] hover:bg-[#EAF5FB]'}`}>
                        {cvUploading ? (
                          <div className="flex items-center gap-2 text-[#5BA4C4]">
                            <div className="w-5 h-5 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Click to upload your CV</span>
                            <span className="text-xs text-slate-400">PDF, DOC, DOCX (max 10MB)</span>
                          </>
                        )}
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && handleCvUpload(e.target.files[0])} />
                      </label>
                    )}
                    {errors.cv && <p className="text-xs text-red-500 mt-1">{errors.cv}</p>}
                  </div>

                  {Object.keys(errors).length > 0 &&
                <p className="text-sm text-red-500 font-medium">Please fill in all required fields above.</p>
                }
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] py-6 text-base font-semibold rounded-xl">
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </div>
              </div>
            </motion.div>
          }

          {step === 3 && isRecruiterType &&
          <motion.div key="step3r" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="mb-7">
                  {role === 'contact_point' ?
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Step 2 of 2 · Contact Point Profile</span> :
                <span className="text-xs font-bold uppercase tracking-widest text-[#3D87AA] bg-[#EAF5FB] px-3 py-1 rounded-full">Step 2 of 2 · Recruiter Profile</span>
                }
                  <h2 className="text-2xl font-bold text-slate-800 mt-3">{role === 'contact_point' ? 'Tell us about you' : 'Tell us about you'}</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {role === 'contact_point' ?
                  "You'll be able to browse and refer candidates — no job postings needed" :
                  "We'll verify your details before granting access"}
                  </p>
                  {role === 'contact_point' &&
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                      <UserSearch className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-emerald-700">As a <strong>Contact Point</strong>, you can scout talent and pass candidates to your hiring team — without managing job listings yourself.</p>
                    </div>
                }
                </div>
                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">First Name *</Label>
                       <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="John" />
                       {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
                     </div>
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">Last Name *</Label>
                       <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="Smith" />
                       {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
                     </div>
                   </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-semibold text-slate-700">Your Title *</Label>
                      <Input value={recruiterData.title} onChange={(e) => setRecruiterData((p) => ({ ...p, title: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Talent Acquisition Manager" />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Company *</Label>
                      <Input value={recruiterData.company} onChange={(e) => setRecruiterData((p) => ({ ...p, company: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Acme Corp" />
                      {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Industry *</Label>
                      <Input value={recruiterData.industry} onChange={(e) => setRecruiterData((p) => ({ ...p, industry: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Technology" />
                      {errors.industry && <p className="text-xs text-red-500 mt-1">{errors.industry}</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Company Website *</Label>
                    <Input value={recruiterData.company_website} onChange={(e) => setRecruiterData((p) => ({ ...p, company_website: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="https://acmecorp.com" />
                    {errors.company_website && <p className="text-xs text-red-500 mt-1">{errors.company_website}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">About You *</Label>
                    <Textarea value={recruiterData.bio} onChange={(e) => setRecruiterData((p) => ({ ...p, bio: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-2 text-base rounded-md flex min-h-[60px] w-full border border-input shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none" rows={3} placeholder="Tell us about your recruiting focus..." />
                    {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio}</p>}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Email *</Label>
                      <Input type="email" value={recruiterData.email} onChange={(e) => setRecruiterData((p) => ({ ...p, email: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="you@company.com" />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Phone Number *</Label>
                      <Input type="tel" value={recruiterData.phone_number} onChange={(e) => setRecruiterData((p) => ({ ...p, phone_number: e.target.value }))} className="bg-transparent text-slate-600 mt-1.5 px-3 py-1 text-base rounded-md flex h-9 w-full border border-input shadow-sm transition-colors md:text-sm" placeholder="+1 555 000 0000" />
                      {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
                    </div>
                  </div>
                  {Object.keys(errors).length > 0 &&
                <p className="text-sm text-red-500 font-medium">Please fill in all required fields above.</p>
                }
                  <Button onClick={handleSubmit} disabled={submitting}
                className={`w-full py-6 text-base font-semibold rounded-xl ${role === 'contact_point' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8]'}`}>
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </div>
              </div>
            </motion.div>
          }

          {step === 4 &&
          <motion.div key="step4" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Application Submitted!</h2>
                <p className="text-slate-500 leading-relaxed max-w-sm mx-auto">Your profile is under review. Our team typically responds within 1–2 business days.</p>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600">🔔 You'll receive an email once your account is approved</div>
                <Button onClick={() => navigate('/')} className={`mt-6 ${role === 'contact_point' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#5BA4C4] hover:bg-[#3D87AA] text-white'}`}>
                  Go to Home →
                </Button>
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>);

}