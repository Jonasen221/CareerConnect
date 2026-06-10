import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'cc_admin_demo_view';

const DemoPreviewContext = createContext(null);

export function DemoPreviewProvider({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const [previewMode, setPreviewModeState] = useState('off');

  useEffect(() => {
    if (typeof window === 'undefined' || isLoadingAuth) return;
    if (user?.role !== 'admin') {
      setPreviewModeState('off');
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'student' || stored === 'recruiter') setPreviewModeState(stored);
    else setPreviewModeState('off');
  }, [user?.role, isLoadingAuth]);

  const setPreviewMode = useCallback(
    (mode) => {
      if (user?.role !== 'admin') return;
      const next = mode === 'student' || mode === 'recruiter' ? mode : 'off';
      setPreviewModeState(next);
      if (next === 'off') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    },
    [user?.role]
  );

  const value = {
    previewMode,
    setPreviewMode,
    /** True when an admin is simulating candidate or recruiter navigation */
    isDemoBrowsing: user?.role === 'admin' && previewMode !== 'off',
    /** Skip “complete profile” blocks while demo-browsing */
    skipProfileGates: user?.role === 'admin' && previewMode !== 'off',
    /**
     * Skip “pending approval” full-screen blocks and banners so admins (and local dev with
     * VITE_SKIP_APPROVAL_GATES=true) can click through the product.
     */
    skipApprovalGates:
      user?.role === 'admin' ||
      (import.meta.env.DEV && import.meta.env.VITE_SKIP_APPROVAL_GATES === 'true'),
  };

  return (
    <DemoPreviewContext.Provider value={value}>{children}</DemoPreviewContext.Provider>
  );
}

export function useDemoPreview() {
  const ctx = useContext(DemoPreviewContext);
  if (!ctx) {
    throw new Error('useDemoPreview must be used within DemoPreviewProvider');
  }
  return ctx;
}
