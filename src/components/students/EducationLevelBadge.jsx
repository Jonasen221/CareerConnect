import React from 'react';
import { GraduationCap, School } from 'lucide-react';

// Values: 'high_school' | 'university' | 'both' | null/undefined.
// Renders nothing when the level is unknown.
//
// High-school students get a distinct visual marker so recruiters and other
// users can see at a glance they're not looking for full-time entry-level
// roles — they're after internships, projects, and learning content.
const STYLES = {
  high_school: {
    label: 'HS',
    full: 'High school',
    icon: School,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  university: {
    label: 'Uni',
    full: 'University / College',
    icon: GraduationCap,
    className: 'bg-[#EAF5FB] text-[#3D87AA] border-[#A8D4E8]',
  },
  both: {
    label: 'HS + Uni',
    full: 'High school + University',
    icon: GraduationCap,
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

export default function EducationLevelBadge({
  level,
  variant = 'short',
  className = '',
}) {
  const cfg = STYLES[level];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const text = variant === 'full' ? cfg.full : cfg.label;
  return (
    <span
      title={cfg.full}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold leading-none ${cfg.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

export { STYLES as EDUCATION_LEVEL_STYLES };
