import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Zap, Users, Briefcase, Calendar, MessageCircle, User, X, ChevronRight, FolderKanban, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { FEATURE_PROJECTS } from '@/lib/featureFlags';

const MAIN_TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'RecruiterDashboard' },
  { label: 'Swipe', icon: Zap, page: 'StudentSwipe' },
  { label: 'Connect', icon: Sparkles, page: 'Connect' },
  { label: 'Messages', icon: MessageCircle, page: 'Messages' },
];

const MORE_ITEMS = [
  { label: 'Find Talent', icon: Users, page: 'StudentSearch' },
  { label: 'My Jobs', icon: Briefcase, page: 'JobManagement' },
  ...(FEATURE_PROJECTS ? [{ label: 'Projects', icon: FolderKanban, page: 'Projects' }] : []),
  { label: 'Events', icon: Calendar, page: 'EventsPage' },
  { label: 'My Profile', icon: User, page: 'RecruiterProfilePage' },
  { label: 'Settings', icon: SettingsIcon, page: 'Settings' },
];

const scrollPositions = {};

export default function RecruiterBottomTabNav({ currentPageName, bottomOffsetPx = 0 }) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const handleTabPress = (page) => {
    const main = document.querySelector('main');
    if (main) scrollPositions[currentPageName] = main.scrollTop;
    setShowMore(false);
    navigate(createPageUrl(page));
  };

  const isMoreActive = MORE_ITEMS.some(i => i.page === currentPageName);

  return (
    <>
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="absolute left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shadow-xl rounded-t-2xl p-4"
            style={{ bottom: `calc(56px + env(safe-area-inset-bottom, 0px) + ${bottomOffsetPx}px)` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">More</span>
              <button onClick={() => setShowMore(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-1">
              {MORE_ITEMS.map(({ label, icon: Icon, page }) => {
                const isActive = currentPageName === page;
                return (
                  <button key={page} onClick={() => handleTabPress(page)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-[#EAF5FB] text-[#3D87AA]' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="w-5 h-5" />
                    {label}
                    <ChevronRight className="w-4 h-4 ml-auto text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center justify-around select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          bottom: bottomOffsetPx,
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {MAIN_TABS.map(({ label, icon: Icon, page }) => {
          const isActive = currentPageName === page;
          return (
            <button key={page} onClick={() => handleTabPress(page)}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors bg-transparent border-0 min-h-[44px] h-14 ${isActive ? 'text-[#5BA4C4]' : 'text-slate-400 dark:text-slate-500'}`}
              style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
        <button onClick={() => setShowMore(v => !v)}
          className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors bg-transparent border-0 min-h-[44px] h-14 ${isMoreActive || showMore ? 'text-[#5BA4C4]' : 'text-slate-400 dark:text-slate-500'}`}
          style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }}>
          <div className="flex flex-col gap-[3px] items-center justify-center w-5 h-5">
            <span className={`block w-4 h-0.5 rounded-full transition-colors ${isMoreActive || showMore ? 'bg-[#5BA4C4]' : 'bg-slate-400'}`} />
            <span className={`block w-4 h-0.5 rounded-full transition-colors ${isMoreActive || showMore ? 'bg-[#5BA4C4]' : 'bg-slate-400'}`} />
            <span className={`block w-4 h-0.5 rounded-full transition-colors ${isMoreActive || showMore ? 'bg-[#5BA4C4]' : 'bg-slate-400'}`} />
          </div>
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>
    </>
  );
}