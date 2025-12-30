import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/lib/rbac";
import * as Sentry from "@sentry/react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  avatar_url: string | null;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  slug: string | null;
  city: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_period: string | null;
  trial_ends_at: string | null;
  onboarding_completed: boolean | null;
  max_active_raffles: number | null;
  max_tickets_per_raffle: number | null;
  templates_available: number | null;
  currency_code: string | null;
  country_code: string | null;
  timezone: string | null;
  brand_color: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  role: UserRole | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setOrganization(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      setProfile(profileData);

      // Set Sentry user context
      if (profileData) {
        Sentry.setUser({
          id: userId,
          email: profileData.email,
          username: profileData.full_name || undefined,
        });
      }

      if (profileData?.organization_id) {
        // Fetch organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .maybeSingle();

        if (orgError) throw orgError;
        setOrganization(orgData);

        // Fetch user role for this organization
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (roleError) {
          console.error("Error fetching role:", roleError);
        } else {
          setRole(roleData?.role as UserRole || null);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          organization_name: fullName + "'s Organization",
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setRole(null);
    // Clear Sentry user context
    Sentry.setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error: error as Error | null };
  };

  const refreshOrganization = async () => {
    if (!profile?.organization_id) return;
    
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;
      setOrganization(orgData);
    } catch (error) {
      console.error("Error refreshing organization:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        role,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}