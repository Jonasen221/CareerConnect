import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { GraduationCap, Briefcase, ArrowRight, ArrowLeft, UserSearch, School, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// "Build your profile" / pitch-video onboarding is disabled for now: as soon
// as the user picks a role (and, for students, their education level) we stub
// out a minimal approved profile so they get straight into the app. They can
// still fill in the rest later from their profile page.
export default function Onboarding() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  // 'role' -> pick role; 'edu' -> student-only education level question.
  const [step, setStep] = useState('role');

  useEffect(() => {
    base44.auth.me()
      .then(setAuthUser)
      .catch(() => base44.auth.redirectToLogin());
  }, []);

  const createStudentProfile = async (educationLevel) => {
    if (!authUser) return;
    setSubmitting(true);
    setError('');
    try {
      const fullName = (authUser.full_name || '').trim();
      const email = (authUser.email || '').trim();
      await base44.entities.StudentProfile.create({
        full_name: fullName,
        email,
        status: 'approved',
        education_level: educationLevel,
      });
      navigate(createPageUrl('StudentDashboard'));
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const createRecruiterProfile = async (role) => {
    if (!authUser) return;
    setSubmitting(true);
    setError('');
    try {
      const fullName = (authUser.full_name || '').trim();
      const email = (authUser.email || '').trim();
      await base44.entities.RecruiterProfile.create({
        full_name: fullName,
        email,
        status: 'approved',
        is_contact_point: role === 'contact_point',
      });
      navigate(createPageUrl('RecruiterDashboard'));
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSelectRole = (role) => {
    if (!authUser || submitting) return;
    setError('');
    if (role === 'student') {
      setStep('edu');
      return;
    }
    createRecruiterProfile(role);
  };

  const roleCards = [
    {
      role: 'student',
      icon: GraduationCap,
      title: 'Candidate',
      blurb: 'Looking for internships, projects, and entry-level opportunities to kickstart my career',
      accent: 'hover:border-[#5BA4C4] hover:shadow-[#5BA4C4]/10',
      iconBg: 'bg-[#EAF5FB] group-hover:bg-[#A8D4E8]/40',
      iconColor: 'text-[#5BA4C4]',
      ctaColor: 'text-[#5BA4C4]',
    },
    {
      role: 'recruiter',
      icon: Briefcase,
      title: 'Recruiter',
      blurb: 'Looking to discover and hire early-career talent from top universities',
      accent: 'hover:border-[#3D87AA] hover:shadow-[#3D87AA]/10',
      iconBg: 'bg-[#EAF5FB] group-hover:bg-[#A8D4E8]/40',
      iconColor: 'text-[#3D87AA]',
      ctaColor: 'text-[#3D87AA]',
    },
    {
      role: 'contact_point',
      icon: UserSearch,
      title: 'Contact Point',
      blurb: 'A company representative who can scout and refer promising candidates',
      accent: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-50 group-hover:bg-emerald-100',
      iconColor: 'text-emerald-600',
      ctaColor: 'text-emerald-600',
    },
  ];

  const eduCards = [
    {
      value: 'high_school',
      icon: School,
      title: 'High school',
      blurb: 'Looking for internships, projects, and learning resources.',
    },
    {
      value: 'university',
      icon: BookOpen,
      title: 'University / College',
      blurb: 'Looking for internships, entry-level roles, and project collaborations.',
    },
    {
      value: 'both',
      icon: Layers,
      title: 'Both',
      blurb: "I'm finishing high school and starting university soon.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAF5FB] via-white to-[#EAF5FB] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#5BA4C4]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A8D4E8]/15 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#5BA4C4] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#5BA4C4]/30">
            <span className="text-white font-bold text-xl">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">CareerConnect</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === 'role' && (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Who are you?</h2>
                <p className="text-slate-500 mt-2">Pick one to jump straight into the app — you can fill in the rest later.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {roleCards.map(({ role, icon: Icon, title, blurb, accent, iconBg, iconColor, ctaColor }) => (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    disabled={submitting || !authUser}
                    className={`group p-8 bg-white rounded-3xl border-2 border-slate-200 ${accent} hover:shadow-xl transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mb-5 transition-colors`}>
                      <Icon className={`w-7 h-7 ${iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{blurb}</p>
                    <div className={`mt-5 flex items-center gap-1 ${ctaColor} text-sm font-semibold`}>
                      {submitting && role !== 'student' ? 'Setting up…' : 'Get started'} <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-6 text-center text-sm text-red-500 font-medium">{error}</p>
              )}
            </motion.div>
          )}

          {step === 'edu' && (
            <motion.div
              key="edu-select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => { setStep('role'); setError(''); }}
                disabled={submitting}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Where are you in your studies?</h2>
                <p className="text-slate-500 mt-2">This helps recruiters and project owners surface the right opportunities for you.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {eduCards.map(({ value, icon: Icon, title, blurb }) => (
                  <button
                    key={value}
                    onClick={() => createStudentProfile(value)}
                    disabled={submitting}
                    className="group p-8 bg-white rounded-3xl border-2 border-slate-200 hover:border-[#5BA4C4] hover:shadow-xl hover:shadow-[#5BA4C4]/10 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-14 h-14 bg-[#EAF5FB] group-hover:bg-[#A8D4E8]/40 rounded-2xl flex items-center justify-center mb-5 transition-colors">
                      <Icon className="w-7 h-7 text-[#5BA4C4]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{blurb}</p>
                    <div className="mt-5 flex items-center gap-1 text-[#5BA4C4] text-sm font-semibold">
                      {submitting ? 'Setting up…' : 'Continue'} <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-6 text-center text-sm text-red-500 font-medium">{error}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
