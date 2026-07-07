<<<<<<< HEAD
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
=======
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { AppUser, Profile, Tenant, RegisterPayload } from '@/types/index';
import { toast } from 'sonner';
<<<<<<< HEAD
=======
import { cacheSession, getCachedSession, clearCachedSession } from '@/lib/offlineDb';
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

/** Map raw Supabase / Edge Function error strings to user-friendly messages */
function friendlyAuthError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('email rate limit') || s.includes('rate limit') || s.includes('too many') || s.includes('limit exceeded')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (s.includes('already registered') || s.includes('already taken') || s.includes('already exists')) {
    return 'An account with this email or phone number already exists.';
  }
  if (s.includes('invalid login') || s.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (s.includes('network') || s.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (s.includes('password') && (s.includes('short') || s.includes('least 8'))) {
    return 'Password must be at least 8 characters.';
  }
  if (s.includes('tenant') && s.includes('not found')) {
    return 'Tenant ID not found. Ask your business owner for the correct ID.';
  }
  if (s.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (s.includes('invalid phone')) {
    return 'Please enter a valid phone number (e.g. +1234567890).';
  }
  return raw;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

async function getTenant(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function buildAppUser(supabaseUser: User): Promise<AppUser | null> {
  const profile = await getProfile(supabaseUser.id);
  if (!profile) return null;
  let tenant: Tenant | null = null;
  if (profile.tenant_id) {
    tenant = await getTenant(profile.tenant_id);
  }
<<<<<<< HEAD
=======
  // Cache the latest known-good profile + tenant for offline fallback next time.
  cacheSession(profile, tenant).catch(err => console.error('[Auth] Failed to cache session for offline use:', err));
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
<<<<<<< HEAD
    role: profile.role,
    tenant_id: profile.tenant_id,
    branch_id: profile.branch_id ?? null,
    phone_number: profile.phone_number ?? null,
    display_name: profile.display_name ?? null,
    tenant,
    // Flatten for convenient access in guards and UI
    business_type: tenant?.business_type ?? null,
    onboarding_completed: tenant?.onboarding_completed ?? false,
    // Currency — default to KES if no tenant
    currency_code:   tenant?.currency_code   ?? 'KES',
    currency_symbol: tenant?.currency_symbol ?? 'KSh',
    currency_name:   tenant?.currency_name   ?? 'Kenyan Shilling',
  };
}

=======
    phone_number: profile.phone_number ?? null,
    display_name: profile.full_name || profile.display_name || profile.username || null,
    role: profile.role,
    tenant_id: profile.tenant_id,
    tenant,
  };
}

function appUserFromCache(profile: Profile, tenant: Tenant | null): AppUser {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    phone_number: profile.phone_number ?? null,
    display_name: profile.full_name || profile.display_name || profile.username || null,
    role: profile.role,
    tenant_id: profile.tenant_id,
    tenant,
  };
}

/**
 * Wraps a promise with a timeout. If `promise` hasn't settled within `ms`,
 * resolves with `fallback` instead of hanging forever.
 *
 * This exists specifically because supabase-js's getSession() can internally
 * attempt a network token-refresh that never resolves while offline on some
 * versions/conditions — without this guard, `loading` would stay true forever
 * and the UI would be stuck on a skeleton indefinitely.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      console.warn(`[Auth] Operation timed out after ${ms}ms — using fallback`);
      resolve(fallback);
    }, ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(fallback); }
    );
  });
}

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  profile: Profile | null;
  loading: boolean;
<<<<<<< HEAD
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
=======
  isOfflineSession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  signUp: (payload: RegisterPayload) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
=======
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  // Mirrors `user` in a ref so the 'online' listener (registered once on mount)
  // always reads the LATEST value instead of closing over the initial null.
  const userRef = useRef<User | null>(null);
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

  const loadUser = async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setUser(null);
<<<<<<< HEAD
      setAppUser(null);
      setProfile(null);
      return;
    }
    setUser(supabaseUser);
=======
      userRef.current = null;
      setAppUser(null);
      setProfile(null);
      setIsOfflineSession(false);
      return;
    }
    setUser(supabaseUser);
    userRef.current = supabaseUser;

    if (!navigator.onLine) {
      const cached = await getCachedSession();
      if (cached && cached.profile?.id === supabaseUser.id) {
        console.log('[Auth] Offline — using cached profile from', cached.cachedAt);
        setAppUser(appUserFromCache(cached.profile, cached.tenant));
        setProfile(cached.profile);
        setIsOfflineSession(true);
        return;
      }
      console.warn('[Auth] Offline and no cached profile available for this user — cannot build appUser');
      setAppUser(null);
      setProfile(null);
      setIsOfflineSession(true);
      return;
    }

    setIsOfflineSession(false);
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    const au = await buildAppUser(supabaseUser);
    setAppUser(au);
    if (au) {
      const p = await getProfile(supabaseUser.id);
      setProfile(p);
    }
  };

  const refreshUser = async () => {
<<<<<<< HEAD
    if (!user) return;
    const au = await buildAppUser(user);
    setAppUser(au);
    if (au) {
      const p = await getProfile(user.id);
=======
    if (!userRef.current) return;
    if (!navigator.onLine) {
      console.log('[Auth] refreshUser called while offline — skipping live refetch');
      return;
    }
    const au = await buildAppUser(userRef.current);
    setAppUser(au);
    setIsOfflineSession(false);
    if (au) {
      const p = await getProfile(userRef.current.id);
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      setProfile(p);
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        loadUser(session?.user ?? null);
      })
      .catch((error) => {
        toast.error(`Session error: ${error.message}`);
      })
      .finally(() => setLoading(false));
=======
    const init = async () => {
      if (!navigator.onLine) {
        // Skip getSession()'s network attempt entirely while offline — go
        // straight to whatever Supabase already persisted in localStorage
        // (synchronous, no network) plus our own IndexedDB cache.
        console.log('[Auth] Offline at startup — reading local session without a network call');
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), 3000, { data: { session: null } } as any);
          if (data.session?.user) {
            await loadUser(data.session.user);
          } else {
            // Supabase's own localStorage had nothing usable — try our cache
            // directly in case there's a session whose user object we can't
            // reconstruct from getSession() alone offline.
            const cached = await getCachedSession();
            if (cached) {
              console.log('[Auth] Recovered cached profile without a Supabase session object — limited offline view');
              setProfile(cached.profile);
              setAppUser(appUserFromCache(cached.profile, cached.tenant));
              setIsOfflineSession(true);
            }
          }
        } catch (err) {
          console.warn('[Auth] Offline init failed entirely:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Online: normal path, but still timeout-guarded so a flaky connection
      // can't hang the skeleton forever either.
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          { data: { session: null } } as any
        );
        await loadUser(session?.user ?? null);
      } catch (error: any) {
        console.warn('[Auth] getSession failed:', error?.message);
        toast.error(`Session error: ${error?.message ?? 'unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    init();
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

<<<<<<< HEAD
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Support both real emails (e.g. superadmin) and internal usernames
      const isEmail = username.includes('@');
      const email = isEmail ? username : `${username}@posifypro.miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
=======
    const handleOnline = () => {
      console.log('[Auth] Connection restored — refreshing session from network');
      if (userRef.current) refreshUser();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing. Please check environment variables.');
      }

      if (!navigator.onLine) {
        throw new Error('You are offline. Please connect to the internet to sign in for the first time on this device.');
      }

      console.info('[Auth] signIn attempt', { email, supabaseUrl });
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
      if (error) {
        console.error('[Auth] signIn error', { message: error.message, status: error.status });
        if (error.message.toLowerCase().includes('invalid login credentials') || error.status === 400) {
          throw new Error('Invalid email or password. Please try again.');
        }
        if (error.message.toLowerCase().includes('network') || error.status === 0) {
          throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
      }
      console.info('[Auth] signIn success', { userId: data.user?.id });
      return { error: null };
    } catch (error) {
      console.error('[Auth] signIn caught', error);
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      return { error: error as Error };
    }
  };

  const signUp = async (payload: RegisterPayload) => {
    try {
<<<<<<< HEAD
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: payload,
      });
      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(friendlyAuthError(msg || error.message));
      }
      if (data?.error) throw new Error(friendlyAuthError(data.error));

      // Set session from the Edge Function response
=======
      if (!navigator.onLine) {
        throw new Error('You are offline. Registration requires an internet connection.');
      }
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: payload,
      });

      if (error) {
        let msg = error.message;
        try {
          const ctx = error as any;
          if (ctx?.context?.json) {
            const json = await ctx.context.json();
            msg = json?.error || json?.message || msg;
          } else if (ctx?.context?.text) {
            const txt = await ctx.context.text();
            try { msg = JSON.parse(txt)?.error || txt; } catch { msg = txt; }
          }
        } catch { /* use original error.message */ }
        throw new Error(friendlyAuthError(msg));
      }

      if (data?.error) throw new Error(friendlyAuthError(data.error));

>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
<<<<<<< HEAD
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, profile, loading, signIn, signUp, signOut, refreshUser }}>
=======
    if (navigator.onLine) {
      await supabase.auth.signOut();
    } else {
      console.log('[Auth] Offline sign-out — clearing local state only, Supabase will sync on next online sign-in');
    }
    await clearCachedSession();
    setUser(null);
    userRef.current = null;
    setAppUser(null);
    setProfile(null);
    setIsOfflineSession(false);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, profile, loading, isOfflineSession, signIn, signUp, signOut, refreshUser }}>
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
