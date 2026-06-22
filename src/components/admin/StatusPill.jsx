import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
  Ban,
  Flag,
  ShieldCheck,
} from 'lucide-react';

/**
 * STATUS_STYLES — central registry so every admin surface paints the same
 * colors for the same status. Add new statuses here, not in callsites.
 */
export const STATUS_STYLES = {
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    Icon: CheckCircle2,
  },
  pending: {
    label: 'Pending review',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    Icon: Clock,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    Icon: XCircle,
  },
  suspended: {
    label: 'Suspended',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    Icon: PauseCircle,
  },
  banned: {
    label: 'Banned',
    bg: 'bg-zinc-900',
    text: 'text-zinc-50',
    border: 'border-zinc-800',
    Icon: Ban,
  },
};

export const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

export function getStatusStyle(status) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

export default function StatusPill({ status, size = 'sm', className = '' }) {
  const style = getStatusStyle(status);
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${style.bg} ${style.text} ${style.border} ${padding} font-semibold ${className}`}
    >
      <style.Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      {style.label}
    </span>
  );
}

export function FlaggedPill({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-pink-100 text-pink-700 border-pink-200 px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <Flag className="w-3 h-3" />
      Flagged
    </span>
  );
}

export function VerifiedStudentPill({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-sky-100 text-sky-700 border-sky-200 px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <ShieldCheck className="w-3 h-3" />
      Verified student
    </span>
  );
}
