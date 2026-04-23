import React, { forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { MapPin, Building2, Linkedin, Globe, FileText } from 'lucide-react';

const typeConfig = {
  full_time: { label: 'Full-time', cls: 'bg-blue-100 text-blue-700' },
  part_time: { label: 'Part-time', cls: 'bg-amber-100 text-amber-700' },
  internship: { label: 'Internship', cls: 'bg-green-100 text-green-700' },
  contract: { label: 'Contract', cls: 'bg-purple-100 text-purple-700' },
};

const SwipeCard = forwardRef(({ job, onSwipe, isTop }, ref) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -30], [1, 0]);
  const controls = useAnimation();

  useImperativeHandle(ref, () => ({
    swipeRight: async () => {
      await controls.start({ x: 600, rotate: 15, opacity: 0, transition: { duration: 0.35 } });
      onSwipe('right');
    },
    swipeLeft: async () => {
      await controls.start({ x: -600, rotate: -15, opacity: 0, transition: { duration: 0.35 } });
      onSwipe('left');
    }
  }));

  const handleDragEnd = async (_, info) => {
    if (info.offset.x > 100) {
      await controls.start({ x: 600, rotate: 15, opacity: 0, transition: { duration: 0.35 } });
      onSwipe('right');
    } else if (info.offset.x < -100) {
      await controls.start({ x: -600, rotate: -15, opacity: 0, transition: { duration: 0.35 } });
      onSwipe('left');
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    }
  };

  const type = typeConfig[job.type] || { label: job.type || '', cls: 'bg-slate-100 text-slate-700' };

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      style={{ x, rotate }}
      animate={controls}
      onDragEnd={handleDragEnd}
      className={`absolute w-full rounded-3xl overflow-hidden shadow-2xl bg-white select-none ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
    >
      {/* Swipe indicators */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 z-20 border-4 border-green-500 text-green-500 font-bold text-xl px-3 py-1 rounded-xl -rotate-12 bg-white/90">
        LIKE ✓
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 z-20 border-4 border-red-500 text-red-500 font-bold text-xl px-3 py-1 rounded-xl rotate-12 bg-white/90">
        PASS ✗
      </motion.div>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] p-8 pb-10">
        <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/20">
          {job.company_logo_url
            ? <img src={job.company_logo_url} alt={job.company} className="w-12 h-12 object-contain rounded-xl" />
            : <span className="text-white font-bold text-2xl">{job.company?.[0]?.toUpperCase() || '?'}</span>
          }
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">{job.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <Building2 className="w-4 h-4 text-white/60" />
          <span className="text-white/80 font-medium">{job.company}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${type.cls}`}>{type.label}</span>
          {job.location && (
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <MapPin className="w-3 h-3" /> {job.location}
            </span>
          )}
          {job.salary_range && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full font-semibold">
              💰 {job.salary_range}
            </span>
          )}
        </div>

        {job.description && <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{job.description}</p>}

        {job.required_skills?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Skills Required</p>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map(skill => (
                <span key={skill} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2.5 py-1 rounded-full font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {job.required_languages?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Languages Required</p>
            <div className="flex flex-wrap gap-1.5">
              {job.required_languages.map(lang => (
                <span key={lang} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">🌐 {lang}</span>
              ))}
            </div>
          </div>
        )}

        {job.perks?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Perks</p>
            <div className="flex flex-wrap gap-1.5">
              {job.perks.map(perk => (
                <span key={perk} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">✓ {perk}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recruiter pitch video */}
        {job.recruiter_video_url && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recruiter Pitch 🎥</p>
            <video src={job.recruiter_video_url} controls className="w-full rounded-xl border border-slate-200 max-h-48 bg-black" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {/* LinkedIn / website */}
        <div className="flex gap-3 pt-1">
          {job.linkedin_url && (
            <a href={job.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[#0A66C2] text-xs font-semibold hover:underline">
              <Linkedin className="w-3.5 h-3.5" /> Recruiter LinkedIn
            </a>
          )}
          {job.company_website && (
            <a href={job.company_website.startsWith('http') ? job.company_website : `https://${job.company_website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold hover:underline">
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {job.job_spec_url && (
            <a href={job.job_spec_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[#3D87AA] text-xs font-semibold hover:underline">
              <FileText className="w-3.5 h-3.5" /> Job Spec
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';
export default SwipeCard;