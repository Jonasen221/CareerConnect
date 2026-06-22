import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { MapPin, GraduationCap, Linkedin, BookOpen, Play, X, FileText } from 'lucide-react';
import EducationLevelBadge from './EducationLevelBadge';

const StudentSwipeCard = forwardRef(({ student, onSwipe, isTop }, ref) => {
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

  const [showVideo, setShowVideo] = useState(false);
  const initials = student.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';

  const gradientColors = [
    'from-violet-600 via-purple-600 to-indigo-700',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-orange-500 via-amber-500 to-yellow-600',
    'from-rose-500 via-pink-600 to-purple-700',
    'from-blue-600 via-indigo-600 to-violet-700',
  ];
  const colorIndex = (student.full_name?.charCodeAt(0) || 0) % gradientColors.length;

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
        SHORTLIST ✓
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 z-20 border-4 border-red-500 text-red-500 font-bold text-xl px-3 py-1 rounded-xl rotate-12 bg-white/90">
        PASS ✗
      </motion.div>

      {/* Header */}
      <div className={`bg-gradient-to-br ${gradientColors[colorIndex]} p-8 pb-12`}>
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/30">
          {student.photo_url
            ? <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover rounded-2xl" />
            : <span className="text-white font-black text-3xl">{initials}</span>
          }
        </div>
        <h2 className="text-2xl font-black text-white leading-tight">{student.full_name}</h2>
        <div className="flex items-center gap-2 mt-1.5">
          <BookOpen className="w-4 h-4 text-white/60" />
          <span className="text-white/80 font-medium text-sm">{student.major} · {student.university}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {student.education_level && (
            <EducationLevelBadge level={student.education_level} className="bg-white/90 border-white/30" />
          )}
          {student.location && (
            <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
              <MapPin className="w-3 h-3" />{student.location}
            </span>
          )}
          {student.graduation_year && (
            <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
              <GraduationCap className="w-3 h-3" />Class of {student.graduation_year}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {student.intro_video_url && (
          <div>
            {showVideo ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video src={student.intro_video_url} controls autoPlay className="w-full h-full object-contain" />
                <button onClick={e => { e.stopPropagation(); setShowVideo(false); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setShowVideo(true); }}
                className="w-full flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-100 transition-colors">
                <Play className="w-4 h-4" /> Watch Intro Video
              </button>
            )}
          </div>
        )}

        {student.bio && <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{student.bio}</p>}

        {(student.interests || []).length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interested In</p>
            <div className="flex flex-wrap gap-1.5">
              {student.interests.map(interest => (
                <span key={interest} className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {(student.skills || []).length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {student.skills.slice(0, 5).map(skill => (
                <span key={skill} className="text-xs bg-[#EAF5FB] text-[#3D87AA] px-2.5 py-1 rounded-full font-medium">{skill}</span>
              ))}
              {student.skills.length > 5 && <span className="text-xs text-slate-400">+{student.skills.length - 5} more</span>}
            </div>
          </div>
        )}

        {(student.work_preferences || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {student.work_preferences.map(p => (
              <span key={p} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium capitalize">✓ {p.replace('_', ' ')}</span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {student.linkedin_url && (
            <a
              href={student.linkedin_url.startsWith('http') ? student.linkedin_url : `https://${student.linkedin_url}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[#0A66C2] text-xs font-semibold hover:underline"
            >
              <Linkedin className="w-3.5 h-3.5" />LinkedIn
            </a>
          )}
          {student.resume_url && (
            <a
              href={student.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold hover:underline"
            >
              <FileText className="w-3.5 h-3.5" />View CV
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
});

StudentSwipeCard.displayName = 'StudentSwipeCard';
export default StudentSwipeCard;