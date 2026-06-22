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

  /**
   * Free-access "honor system" sign-in.
   *
   * The user only provides a name + email. We use Supabase Auth under the hood
   * so RLS keeps working, but the password is derived deterministically from
   * the email — anyone who knows the email can sign in (which is exactly the
   * intent of the open-access mode).
   *
   * Behaviour:
   *   1. Try signInWithPassword first (returning users).
   *   2. On "Invalid login credentials", signUp with the derived password and
   *      the full_name as user metadata, then we already have a session
   *      because email confirmation is disabled on this Supabase project
   *      (mailer_autoconfirm: true).
   */
  const signInOrSignUp = useCallback(async (rawEmail, fullName) => {
    const email = String(rawEmail || '').trim().toLowerCase();
    const name = String(fullName || '').trim();
    if (!email) throw new Error('Please enter your email.');
    if (!name) throw new Error('Please enter your name.');

    const password = `cc-public-${email}-2026`;

    // F6: if a referral landing stashed a code in sessionStorage, attribute
    // the resulting account once the auth flow completes (whether sign-in or
    // sign-up). Imported lazily so this module stays light for cold starts.
    const attributeReferral = async (resultEmail) => {
      try {
        const { applyPendingReferralAttribution } = await import('@/lib/referrals');
        await applyPendingReferralAttribution({ user: { email: resultEmail } });
      } catch {
        /* ignored — attribution is best-effort */
      }
    };

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error) {
      await hydrate(signIn.data.session);
      // Keep the profile name in sync if the user typed a new one.
      if (signIn.data.user?.user_metadata?.full_name !== name) {
        await supabase
          .from('profiles')
          .update({ full_name: name, updated_date: new Date().toISOString() })
          .eq('id', signIn.data.user.id);
      }
      await attributeReferral(signIn.data.user?.email ?? email);
      return signIn.data;
    }

    const looksLikeWrongPassword = /invalid login credentials/i.test(
      signIn.error.message || ''
    );
    if (!looksLikeWrongPassword) throw signIn.error;

    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (signUp.error) throw signUp.error;
    if (signUp.data.session) {
      await hydrate(signUp.data.session);
      await attributeReferral(signUp.data.user?.email ?? email);
      return signUp.data;
    }

    // No session returned (e.g. email confirmation is on for this project) —
    // try a sign-in once more so the user gets a clear error if confirmation
    // really is required.
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) throw retry.error;
    await hydrate(retry.data.session);
    await attributeReferral(retry.data.user?.email ?? email);
    return retry.data;
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
        signInOrSignUp,
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
