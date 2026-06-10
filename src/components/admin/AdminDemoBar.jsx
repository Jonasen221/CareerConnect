import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDemoPreview } from '@/lib/DemoPreviewContext';
import { createPageUrl } from '@/utils';
import { pagesConfig } from '@/pages.config';
import { ChevronRight, Eye, LayoutGrid, UserCog } from 'lucide-react';

const MODES = [
  { id: 'off', label: 'Admin' },
  { id: 'student', label: 'Candidate UI' },
  { id: 'recruiter', label: 'Recruiter UI' },
];

/** Tailwind width / horizontal padding — keep in sync with Layout */
export const ADMIN_DEMO_RAIL_WIDTH_CLASS = 'w-56';
export const ADMIN_DEMO_LAYOUT_PADDING_CLASS = 'pr-56';

/** Quick links to every app screen (for live demos). Fixed vertical rail on the right. */
export default function AdminDemoBar() {
  const { user } = useAuth();
  const { previewMode, setPreviewMode } = useDemoPreview();
  const [open, setOpen] = useState(false);

  if (user?.role !== 'admin') return null;

  const pageKeys = Object.keys(pagesConfig.Pages).sort((a, b) => a.localeCompare(b));

  return (
    <div
      className={`fixed right-0 bottom-0 top-14 z-[100] lg:top-0 ${ADMIN_DEMO_RAIL_WIDTH_CLASS} flex flex-col border-l border-amber-200/80 bg-amber-50/98 backdrop-blur-md text-amber-950 shadow-[-4px_0_20px_rgba(0,0,0,0.06)]`}
      style={{ paddingRight: 'env(safe-area-inset-right, 0px)' }}
    >
      <div className="p-2 border-b border-amber-200/80 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 mb-2">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          Demo
        </div>
        <div className="flex flex-col rounded-lg border border-amber-300/80 bg-white/90 p-1 shadow-sm gap-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPreviewMode(m.id === 'off' ? 'off' : m.id)}
              className={`px-2 py-1.5 rounded-md text-[11px] font-semibold text-left transition-colors ${
                (m.id === 'off' && previewMode === 'off') ||
                (m.id === 'student' && previewMode === 'student') ||
                (m.id === 'recruiter' && previewMode === 'recruiter')
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-2 w-full flex items-center justify-between gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-50"
        >
          <span className="flex items-center gap-1 min-w-0">
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Jump to…</span>
          </span>
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Screen list opens as a panel to the left of the rail */}
      {open && (
        <div
          className="fixed z-[101] right-56 top-14 w-[min(calc(100vw-14rem-2rem),22rem)] max-h-[min(85vh,calc(100vh-4rem))] overflow-y-auto rounded-l-xl border border-amber-200 bg-white shadow-xl sm:top-16"
        >
          <div className="px-3 py-2 border-b border-amber-100 bg-amber-50/90">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/90">All screens</p>
          </div>
          <div className="px-2 py-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {pageKeys.map((key) => (
              <Link
                key={key}
                to={createPageUrl(key)}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-950 truncate"
              >
                {key}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-400 hover:bg-amber-50"
            >
              /login
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-400 hover:bg-amber-50"
            >
              /signup
            </Link>
          </div>
          <p className="px-3 pb-2 text-[10px] text-slate-500 flex items-start gap-1">
            <UserCog className="w-3 h-3 shrink-0 mt-0.5" />
            Data still uses your admin account; empty areas are normal unless you have test profiles.
          </p>
        </div>
      )}

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[99] bg-black/15"
          aria-label="Close screen list"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
