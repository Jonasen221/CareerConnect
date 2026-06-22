import React, { forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { MapPin, GraduationCap, Linkedin, Briefcase, Globe } from 'lucide-react';
import EducationLevelBadge from '../students/EducationLevelBadge';
import { VerifiedStudentPill } from '../admin/StatusPill';

const GRADIENTS = [
  'from-violet-600 via-purple-600 to-indigo-700',
  'from-emerald-600 via-teal-600 to-cyan-700',
  'from-orange-500 via-amber-500 to-yellow-600',
  'from-rose-500 via-pink-600 to-purple-700',
  'from-blue-600 via-indigo-600 to-violet-700',
];

const PersonSwipeCard = forwardRef(({ person, onSwipe, isTop }, ref) => {
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
    },
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

  const initials = person.full_name?.split(' ')
    .map((n) => n?.[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
  const colorIndex = (person.full_name?.charCodeAt(0) || 0) % GRADIENTS.length;
  const subtitle = person.kind === 'student'
    ? [person.major, person.university].filter(Boolean).join(' · ')
    : [person.title, person.company].filter(Boolean).join(' · ');

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      style={{ x, rotate }}
      animate={controls}
      onDragEnd={handleDragEnd}
      className={`absolute w-full rounded-3xl overflow-hidden shadow-2xl bg-white select-none ${
        isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
    >
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-8 left-8 z-20 border-4 border-green-500 text-green-500 font-bold text-xl px-3 py-1 rounded-xl -rotate-12 bg-white/90"
      >
        CONNECT ✓
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-8 right-8 z-20 border-4 border-red-500 text-red-500 font-bold text-xl px-3 py-1 rounded-xl rotate-12 bg-white/90"
      >
        PASS ✗
      </motion.div>

      <div className={`bg-gradient-to-br ${GRADIENTS[colorIndex]} p-8 pb-12`}>
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/30 overflow-hidden">
          {person.photo_url ? (
            <img src={person.photo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : person.company_logo_url ? (
            <img src={person.company_logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className="text-white font-black text-3xl">{initials}</span>
          )}
        </div>
        <h2 className="text-2xl font-black text-white leading-tight">{person.full_name}</h2>
        {subtitle && (
          <div className="flex items-center gap-2 mt-1.5">
            {person.kind === 'student' ? (
              <GraduationCap className="w-4 h-4 text-white/60" />
            ) : (
              <Briefcase className="w-4 h-4 text-white/60" />
            )}
            <span className="text-white/80 font-medium text-sm">{subtitle}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">
            {person.kind === 'student' ? 'Candidate' : 'Recruiter'}
          </span>
          {person.kind === 'student' && person.education_level && (
            <EducationLevelBadge level={person.education_level} className="bg-white/90 border-white/30" />
          )}
          {person.location && (
            <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
              <MapPin className="w-3 h-3" />
              {person.location}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {person.kind === 'student' && person.verified_student && <VerifiedStudentPill />}

        {person.headline && (
          <p className="text-slate-700 font-semibold text-base leading-snug">{person.headline}</p>
        )}
        {person.bio && (
          <p className="text-slate-600 text-sm leading-relaxed line-clamp-5">{person.bio}</p>
        )}

        {Array.isArray(person.skills) && person.skills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {person.skills.slice(0, 10).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(person.keywords) && person.keywords.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {person.keywords.slice(0, 12).map((k) => (
                <span key={k} className="px-2 py-0.5 rounded-full bg-[#EAF5FB] text-[#3D87AA] text-xs">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          {person.linkedin_url && (
            <a
              href={person.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#3D87AA] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          )}
          {person.company_website && (
            <a
              href={person.company_website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#3D87AA] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PersonSwipeCard.displayName = 'PersonSwipeCard';

export default PersonSwipeCard;
