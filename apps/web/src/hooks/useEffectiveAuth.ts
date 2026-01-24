import { useAuth } from "@/hooks/useAuth";
import { useSimulation } from "@/contexts/SimulationContext";
import { UserRole } from "@/lib/rbac";

/**
 * Hook that returns either the simulated user/org data or the real user data
 * depending on whether a simulation is active.
 * 
 * Use this instead of useAuth directly in components that should support simulation.
 */
export function useEffectiveAuth() {
  const auth = useAuth();
  const simulation = useSimulation();

  if (simulation.isSimulating && simulation.simulatedUser && simulation.simulatedOrg) {
    return {
      // Return simulated data
      user: {
        id: simulation.simulatedUser.id,
        email: simulation.simulatedUser.email,
      } as any,
      session: auth.session, // Keep actual session for API calls
      profile: {
        id: simulation.simulatedUser.id,
        email: simulation.simulatedUser.email,
        full_name: simulation.simulatedUser.full_name,
        organization_id: simulation.simulatedOrg.id,
        avatar_url: simulation.simulatedUser.avatar_url,
      },
      organization: {
        id: simulation.simulatedOrg.id,
        name: simulation.simulatedOrg.name,
        email: "", // Not needed for display
        phone: null,
        slug: simulation.simulatedOrg.slug,
        subscription_tier: simulation.simulatedOrg.subscription_tier,
        subscription_status: simulation.simulatedOrg.subscription_status,
        subscription_period: null,
        trial_ends_at: simulation.simulatedOrg.trial_ends_at,
        onboarding_completed: simulation.simulatedOrg.onboarding_completed,
        max_active_raffles: simulation.simulatedOrg.max_active_raffles,
        max_tickets_per_raffle: simulation.simulatedOrg.max_tickets_per_raffle,
        templates_available: null,
        currency_code: simulation.simulatedOrg.currency_code,
        country_code: simulation.simulatedOrg.country_code,
        timezone: simulation.simulatedOrg.timezone,
        brand_color: simulation.simulatedOrg.brand_color,
        logo_url: simulation.simulatedOrg.logo_url,
      },
      role: simulation.simulatedRole as UserRole | null,
      isLoading: auth.isLoading,
      // Keep auth functions pointing to real user
      signUp: auth.signUp,
      signIn: auth.signIn,
      signOut: auth.signOut,
      resetPassword: auth.resetPassword,
      // Simulation-specific helpers
      isSimulating: true,
      simulationMode: simulation.mode,
      canPerformAction: simulation.canPerformAction,
      actualUser: auth.user, // Access to real admin user when needed
    };
  }

  return {
    ...auth,
    isSimulating: false,
    simulationMode: null,
    canPerformAction: () => true,
    actualUser: auth.user,
  };
}
