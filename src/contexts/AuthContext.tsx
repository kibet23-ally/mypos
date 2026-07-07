import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { AppUser, Profile, Tenant, RegisterPayload } from '@/types/index';
import { toast } from 'sonner';

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
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
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

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
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

  const loadUser = async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setUser(null);
      setAppUser(null);
      setProfile(null);
      return;
    }
    setUser(supabaseUser);
    const au = await buildAppUser(supabaseUser);
    setAppUser(au);
    if (au) {
      const p = await getProfile(supabaseUser.id);
      setProfile(p);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    const au = await buildAppUser(user);
    setAppUser(au);
    if (au) {
      const p = await getProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        loadUser(session?.user ?? null);
      })
      .catch((error) => {
        toast.error(`Session error: ${error.message}`);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

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
      return { error: error as Error };
    }
  };

  const signUp = async (payload: RegisterPayload) => {
    try {
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: payload,
      });
      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(friendlyAuthError(msg || error.message));
      }
      if (data?.error) throw new Error(friendlyAuthError(data.error));

      // Set session from the Edge Function response
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
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, profile, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
