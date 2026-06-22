import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Zap, Users, Briefcase, Calendar, MessageCircle, User, LogOut, Shield, Menu, X, Star, Phone, ArrowLeft, FolderKanban } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomTabNav from './components/layout/BottomTabNav';
import RecruiterBottomTabNav from './components/layout/RecruiterBottomTabNav';
import { ADMIN_DEMO_LAYOUT_PADDING_CLASS } from '@/components/admin/AdminDemoBar';
import { useDemoPreview } from '@/lib/DemoPreviewContext';
import { FEATURE_PROJECTS } from '@/lib/featureFlags';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { previewMode } = useDemoPreview();
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const applyTheme = (e) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      applyTheme(mq);
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, []);

  // Public marketing / signup flows: do not call auth+API here. Running
  // `loadUser` on `Home` used to 401 and `redirectToLogin`, which could bounce
  // guests (and appeared as an infinite "loading" state when redirects fought
  // the Home spinner).
  const publicSkipAuth = ['Home', 'Onboarding'];

  const loadUser = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (u.role === 'admin') { setUserType('admin'); return; }
      const [sp, rp] = await Promise.all([
        base44.entities.StudentProfile.filter({ created_by: u.email }),
        base44.entities.RecruiterProfile.filter({ created_by: u.email })
      ]);
      if (sp.length > 0) { setUserType('student'); if (sp[0].photo_url) setUser(prev => ({ ...prev, photo_url: sp[0].photo_url })); }
      else if (rp.length > 0) setUserType('recruiter');
      else setUserType('none'); // no profile yet - send to onboarding
      const unread = await base44.entities.Message.filter({ receiver_email: u.email, read: false });
      setUnreadCount(unread.length);
    } catch (e) {
      // Not authenticated — send the user to the login page instead of
      // leaving them stuck on a loading spinner.
      if (e?.status === 401 || /not authenticated/i.test(e?.message || '')) {
        if (location.pathname === '/login' || location.pathname === '/signup') return;
        base44.auth.redirectToLogin();
        return;
      }
      setUserType('none');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (publicSkipAuth.includes(currentPageName)) return;
    loadUser();
  }, [currentPageName, loadUser]);

  const studentNav = [
          { label: 'Dashboard', icon: LayoutDashboard, page: 'StudentDashboard' },
          { label: 'Explore Jobs', icon: Zap, page: 'JobSwipe' },
          ...(FEATURE_PROJECTS ? [{ label: 'Projects', icon: FolderKanban, page: 'Projects' }] : []),
          { label: 'Career Arena', icon: Star, page: 'CareerGames' },
          { label: 'Call Requests', icon: Phone, page: 'CallRequests' },
          { label: 'Interviews', icon: Calendar, page: 'InterviewScheduling' },
          { label: 'My Profile', icon: User, page: 'StudentProfilePage' },
          { label: 'Events', icon: Calendar, page: 'EventsPage' },
          { label: 'Messages', icon: MessageCircle, page: 'Messages', badge: unreadCount },
        ];
  const recruiterNav = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'RecruiterDashboard' },
    { label: 'Swipe Talent', icon: Zap, page: 'StudentSwipe' },
    { label: 'Find Talent', icon: Users, page: 'StudentSearch' },
    { label: 'My Jobs', icon: Briefcase, page: 'JobManagement' },
    ...(FEATURE_PROJECTS ? [{ label: 'Projects', icon: FolderKanban, page: 'Projects' }] : []),
    { label: 'Interviews', icon: Calendar, page: 'InterviewScheduling' },
    { label: 'Events', icon: Calendar, page: 'EventsPage' },
    { label: 'Messages', icon: MessageCircle, page: 'Messages', badge: unreadCount },
    { label: 'My Profile', icon: User, page: 'RecruiterProfilePage' },
  ];
  const adminNav = [
    { label: 'Admin', icon: Shield, page: 'AdminDashboard' },
    { label: 'Integrations', icon: Zap, page: 'IntegrationsHub' },
  ];

  const effectiveUserType =
    user?.role === 'admin' && (previewMode === 'student' || previewMode === 'recruiter')
      ? previewMode
      : userType;

  const navItems = effectiveUserType === 'student' ? studentNav : effectiveUserType === 'recruiter' ? recruiterNav : effectiveUserType === 'admin' ? adminNav : [];

  const navigate = useNavigate();

  // Pages that are "root" tabs — no back button shown
  const rootPages = ['StudentDashboard', 'RecruiterDashboard', 'AdminDashboard', 'JobSwipe', 'EventsPage', 'Messages', 'CareerGames', 'StudentSearch', 'JobManagement', 'StudentSwipe', 'RecruiterProfilePage', 'StudentProfilePage', 'CallRequests', 'InterviewScheduling', 'Projects'];
  const isSubPage = !rootPages.includes(currentPageName);

  const noLayout = ['Home', 'Onboarding'];
  if (noLayout.includes(currentPageName)) return <>{children}</>;

  // User is authenticated but hasn't created a student/recruiter profile yet —
  // send them through the onboarding flow.
  if (userType === 'none') {
    return <Navigate to={createPageUrl('Onboarding')} replace />;
  }

  if (!userType) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-[#5BA4C4] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  const isStudentPage = effectiveUserType === 'student';
  const isRecruiterPage = effectiveUserType === 'recruiter';

  const initials = user?.full_name?.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const typeBadge = effectiveUserType === 'student' ? 'bg-[#EAF5FB] text-[#3D87AA]' : effectiveUserType === 'recruiter' ? 'bg-[#EAF5FB] text-[#3D87AA]' : 'bg-slate-50 text-slate-700';
  const typeLabel = effectiveUserType === 'student' ? '🎓 Candidate' : effectiveUserType === 'recruiter' ? '💼 Recruiter' : '⚙ Admin';

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = currentPageName === item.page;
    return (
      <Link to={createPageUrl(item.page)} onClick={() => setMobileOpen(false)}
        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-[#5BA4C4] text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-[#EAF5FB] dark:hover:bg-slate-700 hover:text-[#3D87AA]'}`}>
        <div className="flex items-center gap-3"><Icon className="w-4 h-4" />{item.label}</div>
        {item.badge > 0 && <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>}
      </Link>
    );
  };

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 ${user?.role === 'admin' ? ADMIN_DEMO_LAYOUT_PADDING_CLASS : ''}`}>
      <style>{`
        :root {
          --brand: #5BA4C4;
          --brand-dark: #3D87AA;
          --brand-light: #EAF5FB;
          --brand-mid: #A8D4E8;
        }
        body {
          overscroll-behavior: none;
          padding-top: env(safe-area-inset-top, 0px);
        }
        @media (prefers-color-scheme: dark) {
          html { color-scheme: dark; }
        }
        button, [role="tab"], [role="button"] {
          -webkit-user-select: none;
          user-select: none;
        }
        svg {
          -webkit-user-select: none;
          user-select: none;
          pointer-events: none;
          -webkit-touch-callout: none;
        }
        img, svg {
          -webkit-touch-callout: none;
          -webkit-user-drag: none;
          user-drag: none;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        button, a, [role="button"], [role="tab"] {
          -webkit-touch-callout: none;
        }
      `}</style>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 fixed h-full z-20">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <Link to={createPageUrl('Home') + '?show=landing'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#5BA4C4] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <div><span className="text-base font-bold text-slate-800 dark:text-slate-100">Career</span><span className="text-base font-bold text-[#5BA4C4]">Connect</span></div>
          </Link>
        </div>
        {effectiveUserType && <div className="px-6 pt-4 pb-1"><span className={`text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-lg ${typeBadge}`}>{typeLabel}</span></div>}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => <NavItem key={item.page} item={item} />)}
        </nav>
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-1 mb-2">
              <Avatar className="w-9 h-9">
            {user?.photo_url && <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />}
            <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2d5f7a] dark:text-slate-100 truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={() => base44.auth.logout()} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-4 py-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
        {isSubPage ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#3D87AA] font-semibold text-sm min-w-[44px] min-h-[44px] -ml-1 px-1"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        ) : (
          <Link to={createPageUrl('Home') + '?show=landing'} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5BA4C4] rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">CC</span></div>
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">CareerConnect</span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            {user?.photo_url && <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />}
            <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
            {mobileOpen ? <X className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/20" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-4 shadow-lg" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1">{navItems.map(item => <NavItem key={item.page} item={item} />)}</nav>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => base44.auth.logout()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-64 overflow-hidden">
        <div className="lg:hidden h-14" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname + location.search}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-30%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
            style={{ willChange: 'transform' }}
          >
            {children}
            {(isStudentPage || isRecruiterPage) && (
              <div
                className="lg:hidden"
                style={{
                  height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {userType && isStudentPage && <BottomTabNav currentPageName={currentPageName} />}
      {userType && isRecruiterPage && <RecruiterBottomTabNav currentPageName={currentPageName} />}
    </div>
  );
}