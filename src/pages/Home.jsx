import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, Sparkles, Linkedin, ArrowRight, CheckCircle2, Users, Zap, MessageSquare, CalendarCheck, ShieldCheck, CreditCard } from 'lucide-react';

import { Button } from "@/components/ui/button";
import SubscriptionModal from '@/components/subscriptions/SubscriptionModal';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };

const TEAM = [
  { name: 'Tadiwa Ndadzungira', role: 'Chief Marketing & Operations Officer', flag: '🇿🇼', linkedin: 'https://www.linkedin.com/in/tadiwa-mazvita-ndadzungira/', email: 'tadiwandadzungira14@gmail.com', workEmail: 'tw.careerconnect@outlook.com' },
  { name: 'Jonas Neller', role: 'Co-Chief Executive Officer & Chief Financial Officer', flag: '🇩🇪', linkedin: 'https://www.linkedin.com/in/jonas-neller1/', email: 'jonas.neller@gmail.com', workEmail: 'jn.careerconnect@outlook.com' },
  { name: 'Franziska Nickenig', role: 'Chief Executive Officer', flag: '🇩🇪', linkedin: 'https://www.linkedin.com/in/franziskanickenig/', email: 'franziskanickenig@gmail.com', workEmail: 'fn.careerconnect@outlook.com' },
  { name: 'Luisa Barzanallana', role: 'Chief Communication & Socials Officer', flag: '🇪🇸', linkedin: 'https://www.linkedin.com/in/luisa-garcia-b-way/', email: 'lfgbarzanallana@gmail.com', workEmail: 'lg.careerconnect@outlook.com' },
];

const STUDENT_PLANS = [
  {
    name: 'Industry Specific',
    price: '€14.95',
    period: '/mo',
    features: ['Industry-specific job listings', '2 swipes per day', 'Profile visible to matched recruiters', 'Community events'],
    highlight: false,
    badge: null,
  },
  {
    name: 'Global',
    price: '€25.95',
    period: '/mo',
    features: ['All industries access', '3 swipes per day', 'Priority profile review', 'Exclusive events access', 'Direct message priority'],
    highlight: true,
    badge: 'Best Value',
  },
];

const RECRUITER_PLANS = [
  {
    name: 'Industry Specific',
    price: '€14.95',
    period: '/mo',
    features: ['Browse industry-specific talent', '2 swipes per day', 'Post job listings', 'Basic company profile'],
    highlight: false,
    badge: null,
  },
  {
    name: 'Global',
    price: '€25.95',
    period: '/mo',
    features: ['Access all student profiles', '3 swipes per day', 'Priority listing placement', 'Invite-only events access', 'Featured company profile'],
    highlight: true,
    badge: 'Best Value',
  },
];

const FEATURES = [
  { icon: Zap, title: 'Swipe to Apply', desc: 'Browse curated jobs with a swipe. Like what you love, skip the rest — job hunting made effortless.' },
  { icon: Users, title: 'Smart Matching', desc: 'When a recruiter shortlists you and you swipe right — it\'s a mutual match. Start a conversation instantly.' },
  { icon: CalendarCheck, title: 'Exclusive Events', desc: 'Get invited to career fairs, panels, and networking events hosted by top-tier companies.' },
  { icon: MessageSquare, title: 'Clean Messaging', desc: 'Chat only after a mutual match. No cold outreach — your inbox stays relevant and noise-free.' },
  { icon: ShieldCheck, title: 'Vetted Network', desc: 'Every student and recruiter is reviewed by our team. Real people, real opportunities, no spam.' },
  { icon: Briefcase, title: 'Recruiter Tools', desc: 'Post jobs, shortlist candidates, host events, and manage your entire pipeline in one place.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [pricingTab, setPricingTab] = useState('student');
  const [counts, setCounts] = useState({ students: 0, recruiters: 0 });

  useEffect(() => { bootstrap(); }, []);

  const loadCounts = async () => {
    try {
      const [students, recruiters] = await Promise.all([
        base44.entities.StudentProfile.filter({ status: 'approved' }),
        base44.entities.RecruiterProfile.filter({ status: 'approved' }),
      ]);
      setCounts({ students: students.length, recruiters: recruiters.length });
    } catch {
      setCounts({ students: 0, recruiters: 0 });
    }
  };

  const bootstrap = async () => {
    try {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const u = await base44.auth.me();
          setUser(u);
          loadUserAndSub();
          const [sp, rp] = await Promise.all([
            base44.entities.StudentProfile.filter({ created_by: u.email }),
            base44.entities.RecruiterProfile.filter({ created_by: u.email })
          ]);
          if (sp.length > 0) {
            setUserType('student');
          } else if (rp.length > 0) {
            setUserType('recruiter');
          }
        }
      } catch {
        // logged-out or stale session
      }
      try {
        await loadJobs();
      } catch {
        setJobs([]);
      }
      await loadCounts();
    } finally {
      setLoading(false);
    }
  };

  const loadUserAndSub = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const subs = await base44.entities.Subscription.filter({ created_by: u.email });
      setCurrentSubscription(subs[0]?.tier || 'free');
    } catch (e) {}
  };

  const handlePlanClick = (planName) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    const tierMap = { Bronze: 'bronze', Silver: 'silver', Gold: 'gold' };
    setSelectedTier(tierMap[planName]);
    setShowSubscriptionModal(true);
  };

  const loadJobs = async () => {
    const allJobs = await base44.entities.Job.list('-updated_date');
    const active = allJobs.filter(j => j.status === 'active').slice(0, 3);
    setJobs(active);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#EAF5FB]">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.35, duration: 0.7 }} className="text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#5BA4C4]/35">
              <span className="text-white font-bold text-3xl tracking-tight">CC</span>
            </div>
            <motion.div
              className="absolute -inset-1 rounded-3xl border-2 border-[#5BA4C4]/30"
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#2E3F4F] tracking-tight">
              Career<span className="text-[#5BA4C4]">Connect</span>
            </h1>
            <p className="text-[#7A7870] mt-1 text-sm font-medium">Where Talent Meets Opportunity</p>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-2 h-2 bg-[#5BA4C4] rounded-full"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
          ))}
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white overflow-hidden font-sans">

      {/* ── Dashboard Banner for logged-in users ── */}
      {userType && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#5BA4C4] text-white py-3 px-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <span className="font-semibold text-sm">
              {userType === 'student' ? '🎓 Welcome back! Ready to explore jobs?' : '💼 Welcome back! Find your next hire.'}
            </span>
          </div>
          <Button
            onClick={() => navigate(createPageUrl(userType === 'student' ? 'StudentDashboard' : 'RecruiterDashboard'))}
            className="bg-white text-[#3D87AA] hover:bg-[#EAF5FB] h-8 px-4 text-sm font-bold rounded-lg shadow-none"
          >
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className={`fixed left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#A8D4E8]/40 ${userType ? 'top-12' : 'top-0'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#5BA4C4] rounded-lg flex items-center justify-center shadow-md shadow-[#5BA4C4]/25">
              <span className="text-white font-bold text-xs tracking-tight">CC</span>
            </div>
            <span className="text-base font-bold text-[#2E3F4F] tracking-tight">Career<span className="text-[#5BA4C4]">Connect</span></span>
          </div>
          {user ? (
            <Button
              onClick={() => navigate(createPageUrl(userType === 'student' ? 'StudentDashboard' : 'RecruiterDashboard'))}
              className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white rounded-lg h-9 px-5 text-sm font-semibold shadow-none"
            >
              Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-[#2E3F4F] hover:bg-[#3D87AA] text-white rounded-lg h-9 px-5 text-sm font-semibold shadow-none">
              Sign In <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={`${userType ? 'pt-44' : 'pt-32'} pb-24 px-6 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#EAF5FB]/60 via-white to-white pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#5BA4C4]/6 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#A8D4E8]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center">
            <div className="inline-flex items-center gap-2 bg-white text-[#3D87AA] px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-[#A8D4E8]/60 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> The smarter way to find your first job
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#2E3F4F] leading-[1.08] tracking-tight mb-7">
              Where <span className="text-[#5BA4C4]">Talent</span> Meets<br />Opportunity
            </h1>
            <p className="text-lg md:text-xl text-[#7A7870] max-w-xl mx-auto mb-10 leading-relaxed font-normal">
              Swipe-based job matching that connects ambitious students with top recruiters. No cold applying — get discovered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <div className="bg-[#EAF5FB] text-[#2E3F4F] border border-[#A8D4E8] h-12 px-8 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center">
                🎓 I'm a Student
              </div>
              <div className="bg-[#EAF5FB] text-[#2E3F4F] border border-[#A8D4E8] h-12 px-8 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center">
                💼 I'm a Recruiter
              </div>
            </div>
          </motion.div>

          {/* Mock card */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 mx-auto max-w-xs relative">
            <div className="bg-white rounded-3xl shadow-2xl shadow-[#A8D4E8]/30 border border-[#A8D4E8]/30 overflow-hidden">
              <div className="bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] p-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 text-white font-bold text-lg border border-white/20">G</div>
                <h3 className="text-xl font-bold text-white leading-tight">Software Engineer</h3>
                <p className="text-white/75 text-sm mt-1 font-medium">Google · New York, NY</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {['React', 'Python', 'Full-time'].map(t => (
                    <span key={t} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-3 py-1 rounded-full font-semibold">{t}</span>
                  ))}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">Join our team building the next generation of search technology...</p>
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-base hover:border-red-200 hover:text-red-400 transition-all">✕</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-[#5BA4C4] text-white font-bold text-base hover:bg-[#3D87AA] transition-all">♥</button>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-6 -left-16 bg-white rounded-2xl shadow-lg border border-[#A8D4E8]/30 px-3.5 py-2.5 flex items-center gap-2.5 hidden md:flex">
              <span className="text-xl">🎉</span>
              <div><p className="text-xs font-semibold text-[#2E3F4F] leading-none">It's a Match!</p><p className="text-xs text-[#7A7870] mt-0.5">with Stripe Inc.</p></div>
            </motion.div>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-10 -right-16 bg-white rounded-2xl shadow-lg border border-[#A8D4E8]/30 px-3.5 py-2.5 flex items-center gap-2.5 hidden md:flex">
              <span className="text-xl">✅</span>
              <div><p className="text-xs font-semibold text-[#2E3F4F] leading-none">Profile Approved!</p><p className="text-xs text-[#7A7870] mt-0.5">You're live now</p></div>
            </motion.div>
          </motion.div>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#5BA4C4] rounded-full"></span>Vetted students & recruiters</span>
            <span className="hidden sm:block text-slate-200">|</span>
            <span className="hidden sm:block">Hand-reviewed profiles</span>
            <span className="hidden sm:block text-slate-200">|</span>
            <span className="hidden sm:block">Real mutual matching</span>
          </motion.div>

          {/* Live counter */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
            className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 bg-white border border-[#A8D4E8]/50 rounded-2xl px-5 py-3 shadow-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BA4C4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5BA4C4]"></span>
              </div>
              <span className="text-2xl font-black text-[#2E3F4F]">{counts.students}</span>
              <span className="text-sm font-semibold text-[#7A7870]">🎓 Students on platform</span>
            </div>
            <div className="flex items-center gap-3 bg-white border border-[#A8D4E8]/50 rounded-2xl px-5 py-3 shadow-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D87AA] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3D87AA]"></span>
              </div>
              <span className="text-2xl font-black text-[#2E3F4F]">{counts.recruiters}</span>
              <span className="text-sm font-semibold text-[#7A7870]">💼 Recruiters hiring</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-[#EAF5FB]/40">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-4xl font-bold text-[#2E3F4F] tracking-tight mb-4">Everything you need to <span className="text-[#5BA4C4]">succeed</span></h2>
            <p className="text-[#7A7870] text-lg max-w-xl mx-auto">Built for the modern job search — fast, human, and effective.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl p-7 border border-[#A8D4E8]/30 hover:border-[#5BA4C4]/40 hover:shadow-lg transition-all duration-300 group">
                <div className="w-11 h-11 bg-[#EAF5FB] rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#5BA4C4]/10 transition-colors">
                  <f.icon className="w-5 h-5 text-[#5BA4C4]" />
                </div>
                <h3 className="text-base font-semibold text-[#2E3F4F] mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[#7A7870] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-4xl font-bold text-[#2E3F4F] tracking-tight mb-4">How it works</h2>
            <p className="text-[#7A7870] text-lg">From sign-up to your first job in four steps</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { label: 'For Students', color: 'bg-[#5BA4C4]', icon: GraduationCap, steps: [
                { step: '01', title: 'Create your profile', desc: 'Add your skills, university, and career preferences in minutes.' },
                { step: '02', title: 'Get approved', desc: 'Our team personally reviews your profile to ensure quality.' },
                { step: '03', title: 'Swipe through jobs', desc: 'Browse curated opportunities and swipe on the ones you love.' },
                { step: '04', title: 'Match & connect', desc: 'When a recruiter shortlists you and you swipe right — start chatting!' },
              ]},
              { label: 'For Recruiters', color: 'bg-[#3D87AA]', icon: Briefcase, steps: [
                { step: '01', title: 'Set up your account', desc: 'Create your company profile and get verified by our team.' },
                { step: '02', title: 'Post job listings', desc: 'Add roles with required skills, perks, and grad year preferences.' },
                { step: '03', title: 'Find & shortlist talent', desc: 'Browse and swipe on pre-vetted student profiles.' },
                { step: '04', title: 'Match & message', desc: 'When students swipe right on your job — connect and hire!' },
              ]},
            ].map(({ label, color, icon: Icon, steps }) => (
              <motion.div key={label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="bg-[#EAF5FB]/40 rounded-3xl p-8 border border-[#A8D4E8]/30">
                <div className="flex items-center gap-2.5 mb-8">
                  <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-[#2E3F4F] text-sm">{label}</span>
                </div>
                <div className="space-y-6">
                  {steps.map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5`}>{step}</div>
                      <div>
                        <h4 className="font-semibold text-[#2E3F4F] text-sm">{title}</h4>
                        <p className="text-[#7A7870] text-sm mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-6 bg-[#EAF5FB]/40">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-6">
            <div className="inline-block mb-6 p-3.5 bg-[#EAF5FB] border border-[#A8D4E8] rounded-lg">
              <p className="text-[#3D87AA] text-sm font-semibold">🎉 Lucky Customer Phase: FREE Subscriptions (Testing Period)</p>
              <p className="text-[#5BA4C4] text-xs mt-1">Subscriptions are FREE until July 1st, 2027. Early access for testing!</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-bold text-[#2E3F4F] tracking-tight mb-4">Choose your plan</h2>
            <p className="text-[#7A7870] text-lg">Upgrade or cancel anytime — no lock-in.</p>
          </motion.div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white border border-[#A8D4E8]/40 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setPricingTab('student')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pricingTab === 'student' ? 'bg-[#5BA4C4] text-white shadow-sm' : 'text-[#7A7870] hover:text-[#3D87AA]'}`}
              >
                🎓 For Students
              </button>
              <button
                onClick={() => setPricingTab('recruiter')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pricingTab === 'recruiter' ? 'bg-[#3D87AA] text-white shadow-sm' : 'text-[#7A7870] hover:text-[#3D87AA]'}`}
              >
                💼 For Recruiters
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 items-start max-w-3xl mx-auto">
            {(pricingTab === 'student' ? STUDENT_PLANS : RECRUITER_PLANS).map((plan, i) => (
              <motion.div key={`${pricingTab}-${i}`} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl overflow-hidden border transition-all ${plan.highlight ? 'border-[#5BA4C4] shadow-2xl shadow-[#5BA4C4]/15 bg-white' : 'border-[#A8D4E8]/40 bg-white'}`}>
                {plan.badge && (
                  <div className={`text-center py-2 text-xs font-bold tracking-wider uppercase ${plan.highlight ? 'bg-[#5BA4C4] text-white' : 'bg-[#2E3F4F] text-white'}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="p-7">
                  <h3 className="text-xl font-bold text-[#2E3F4F] mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-[#2E3F4F]">{plan.price}</span>
                    <span className="text-[#7A7870] text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-[#7A7870]">
                        <CheckCircle2 className="w-4 h-4 text-[#5BA4C4] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => handlePlanClick(plan.name)}
                    className={`w-full rounded-xl h-10 font-bold text-sm flex items-center justify-center gap-2 ${plan.highlight ? 'bg-[#5BA4C4] hover:bg-[#3D87AA] text-white shadow-lg shadow-[#5BA4C4]/20' : 'bg-[#EAF5FB] hover:bg-[#A8D4E8]/40 text-[#3D87AA] shadow-none'}`}>
                    <CreditCard className="w-4 h-4" />
                    Get Started
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Franzi ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-4">Meet the Founder</p>
              <h2 className="text-4xl font-bold text-[#2E3F4F] tracking-tight mb-5 leading-tight">
                Built by someone who's <span className="text-[#5BA4C4]">been there</span>
              </h2>
              <div className="space-y-4 text-[#7A7870] text-base leading-relaxed">
                <p><strong className="text-[#2E3F4F]">CareerConnect</strong> was founded by <strong className="text-[#2E3F4F]">Franzi</strong>, a career coach and talent strategist who spent years watching brilliant students miss out on great jobs — not because of lack of skill, but lack of visibility.</p>
                <p>Franzi built CareerConnect to bridge that gap: a curated, human-first platform where every student is hand-reviewed and every recruiter is verified.</p>
                <p>With 2+ years in career coaching, Franzi personally oversees every profile and offers 1-on-1 services to help students stand out from day one.</p>
              </div>
              <div className="flex flex-wrap gap-2.5 mt-7">
                {['🎓 2+ years coaching', '🏆 Curated network', '✅ Human-reviewed'].map(tag => (
                  <span key={tag} className="text-xs bg-[#EAF5FB] border border-[#A8D4E8]/40 text-[#3D87AA] px-3.5 py-1.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-gradient-to-br from-[#EAF5FB] to-[#daeef7] rounded-3xl p-8 border border-[#A8D4E8]/30">
                <div className="w-20 h-20 bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-[#5BA4C4]/25 mx-auto">
                  <span className="text-white font-bold text-3xl">F</span>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-[#2E3F4F]">Franziska Nickenig 🇩🇪</h3>
                  <p className="text-[#5BA4C4] font-semibold text-sm mt-1">CEO & Founder, CareerConnect</p>
                  <p className="text-[#7A7870] text-xs mt-1">Career strategist · Talent connector</p>
                  <a href="https://www.linkedin.com/in/franziskanickenig/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-[#0A66C2] text-sm font-semibold hover:underline">
                    <Linkedin className="w-4 h-4" /> Connect on LinkedIn
                  </a>
                </div>
                <div className="space-y-2.5">
                  {[
                    { emoji: '💡', text: 'Personally reviews every student & recruiter profile' },
                    { emoji: '📹', text: 'Watches your intro video to get to know you' },
                    { emoji: '✉️', text: 'Available for 1-on-1 career coaching sessions' },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-[#A8D4E8]/30">
                      <span>{item.emoji}</span>
                      <p className="text-sm text-[#2E3F4F] font-medium">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-[#2d6d8e] to-[#1e5070]">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[#A8D4E8] text-sm font-semibold uppercase tracking-widest mb-3">Premium Services</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">Get an edge before you even apply</h2>
            <p className="text-[#A8D4E8] text-lg max-w-lg mx-auto">Franzi personally reviews your materials and helps you stand out from the crowd.</p>
            </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: 'Package 1',
                price: '€99.95',
                highlight: false,
                includes: ['Call with Team', 'One Pager CV', 'LinkedIn Template', 'Interview Prep Document'],
                time: null,
              },
              {
                name: 'Package 2',
                price: '€139.95',
                highlight: true,
                includes: ['Call with CEO', 'One Pager CV', 'LinkedIn Template', 'Interview Prep Document', '3 Top Recommendations'],
                time: null,
              },
            ].map((pkg, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 border flex flex-col ${pkg.highlight ? 'bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] border-[#5BA4C4]' : 'bg-white/10 border-white/20 hover:bg-white/15'} transition-all`}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">{pkg.name}</p>
                <p className="text-4xl font-black text-white mb-5">{pkg.price}</p>
                <ul className="space-y-2 mb-5 flex-1">
                  {pkg.includes.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/90">
                      <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />{item}
                    </li>
                  ))}
                  {pkg.time && <li className="flex items-center gap-2 text-sm text-white/70 mt-1"><span className="w-4 h-4 flex-shrink-0">⏱</span>{pkg.time}</li>}
                </ul>
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mt-10">
            <p className="text-[#A8D4E8]/70 text-sm mb-5">Earn credits through Career Arena games — then redeem for premium services</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Button onClick={() => base44.auth.redirectToLogin()} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] h-11 px-7 rounded-xl font-bold text-sm">
                🎮 Start Earning Credits
              </Button>
              <a href="https://www.graduatesfirst.com/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border border-white/20 text-white bg-transparent hover:bg-white/10 h-11 px-7 rounded-xl font-bold text-sm">
                  📋 Graduates First ↗
                </Button>
              </a>
              <a href="https://www.coursera.org/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border border-white/20 text-white bg-transparent hover:bg-white/10 h-11 px-7 rounded-xl font-bold text-sm">
                  📚 Coursera ↗
                </Button>
              </a>
              <a href="https://www.datacamp.com/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border border-white/20 text-white bg-transparent hover:bg-white/10 h-11 px-7 rounded-xl font-bold text-sm">
                  📊 DataCamp ↗
                </Button>
              </a>
              <a href="https://www.linkedin.com/learning/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border border-white/20 text-white bg-transparent hover:bg-white/10 h-11 px-7 rounded-xl font-bold text-sm">
                  💼 LinkedIn Learning ↗
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-3">Our Team</p>
            <h2 className="text-4xl font-black text-[#2E3F4F] tracking-tight mb-4">The people behind CareerConnect</h2>
            <p className="text-[#7A7870] text-lg">A passionate international team on a mission to connect talent with opportunity.</p>
          </motion.div>
          <div className="mb-12 rounded-2xl overflow-hidden shadow-lg">
            <img
              src="https://media.base44.com/images/public/6999a5c7bcfe6f91940c0916/c21883e97_Screenshot2026-03-22at153400.png"
              alt="CareerConnect Team"
              className="w-full object-cover max-h-[500px]"
              style={{ objectPosition: '50% 10%' }}
            />
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {TEAM.map((member, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-[#EAF5FB] border border-[#A8D4E8]/40 rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#5BA4C4]/20">
                  <span className="text-white font-black text-lg">{member.name[0]}</span>
                </div>
                <div className="text-xl mb-2">{member.flag}</div>
                <h3 className="text-xs font-bold text-[#2E3F4F] leading-snug">{member.name}</h3>
                <p className="text-xs text-[#5BA4C4] font-medium mt-1 mb-2 leading-snug">{member.role}</p>
                {member.workEmail && (
                  <a href={`mailto:${member.workEmail}`} className="text-xs text-[#7A7870] hover:text-[#3D87AA] hover:underline break-all">{member.workEmail}</a>
                )}
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[#0A66C2] text-xs font-semibold hover:underline">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Jobs ── */}
      {jobs.length > 0 && (
        <section className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
              <p className="text-[#3D87AA] text-sm font-semibold uppercase tracking-widest mb-3">Live Opportunities</p>
              <h2 className="text-4xl font-black text-[#2E3F4F] tracking-tight mb-4">Top jobs on CareerConnect</h2>
              <p className="text-[#7A7870] text-lg">Browse real positions from verified companies</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {jobs.map((job, i) => (
                <motion.div key={job.id} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl border border-[#A8D4E8]/40 hover:border-[#5BA4C4]/60 hover:shadow-lg transition-all overflow-hidden">
                  <div className="bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA] p-5">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-3 border border-white/20">
                      {job.company?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight">{job.title}</h3>
                    <p className="text-white/75 text-sm mt-1">{job.company}</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {job.location && <p className="text-slate-500 text-sm">📍 {job.location}</p>}
                    {job.salary_range && <p className="text-[#5BA4C4] font-semibold text-sm">{job.salary_range}</p>}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-1">
                        {job.required_skills.slice(0, 3).map(skill => (
                          <span key={skill} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2 py-1 rounded-full font-semibold">{skill}</span>
                        ))}
                        {job.required_skills.length > 3 && <span className="text-xs text-slate-400">+{job.required_skills.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center">
              <Button onClick={() => base44.auth.redirectToLogin()} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] h-11 px-8 rounded-xl font-bold text-sm">
                💼 Explore All Jobs & Swipe
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-[#5BA4C4] to-[#2d6e8e]">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-4">Ready to launch your career?</h2>
          <p className="text-white/75 text-lg mb-6">Join students and recruiters already on CareerConnect.</p>
          <a href="https://linktr.ee/officialcareerconnect" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline"
              className="border border-white/20 text-white bg-transparent hover:bg-white/8 h-13 px-10 py-4 rounded-xl font-black text-base shadow-2xl shadow-black/10 transition-all">
              📬 Join our Community ↗
            </Button>
          </a>
          <p className="text-white/60 text-xs">Sign up for our newsletter & WhatsApp community</p>
        </motion.div>
      </section>

      {/* Subscription Modal */}
      <SubscriptionModal 
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        currentTier={currentSubscription}
        onSubscribe={(tier) => {
          setCurrentSubscription(tier);
          setShowSubscriptionModal(false);
        }}
        userType="student"
      />

      {/* ── Footer ── */}
      <footer className="py-10 px-6 bg-[#1e5070]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#5BA4C4] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">CC</span>
            </div>
            <span className="text-white font-bold text-sm">CareerConnect</span>
          </div>
          <p className="text-[#A8D4E8]/60 text-xs">© 2026 CareerConnect · Where talent meets opportunity</p>
          <p className="text-[#A8D4E8]/60 text-xs">
            Support: <a href="mailto:official.careerconnect@gmail.com" className="text-[#A8D4E8] hover:underline">official.careerconnect@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}