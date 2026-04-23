import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

const AUTH_BOOTSTRAP_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Kept for API compatibility with the old Base44 AuthContext.
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  const hydrate = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    try {
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      console.error('Failed to hydrate user profile:', err);
      setAuthError({ type: 'unknown', message: err.message });
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_MS,
          'getSession'
        );
        if (!mounted) return;
        if (error) throw error;
        await withTimeout(hydrate(data?.session), AUTH_BOOTSTRAP_MS, 'hydrate').catch(
          (err) => {
            console.warn('[auth] hydrate:', err?.message || err);
          }
        );
      } catch (err) {
        console.warn('[auth] bootstrap:', err?.message || err);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await withTimeout(hydrate(session), AUTH_BOOTSTRAP_MS, 'hydrate').catch((err) => {
          console.warn('[auth] hydrate (listener):', err?.message || err);
        });
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [hydrate]);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data } = await supabase.auth.getSession();
    await hydrate(data?.session);
    setIsLoadingAuth(false);
  }, [hydrate]);

  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await hydrate(data.session);
    return data;
  }, [hydrate]);

  const signUpWithPassword = useCallback(async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    if (data.session) {
      await hydrate(data.session);
    }
    return data;
  }, [hydrate]);

  const logout = useCallback(async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/login' || window.location.pathname === '/signup') return;
    const target = new URL('/login', window.location.origin);
    target.searchParams.set('next', window.location.href);
    window.location.href = target.toString();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        authChecked: !isLoadingAuth,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        checkUserAuth,
        signInWithPassword,
        signUpWithPassword,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
