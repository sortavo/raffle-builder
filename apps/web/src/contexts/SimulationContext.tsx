import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SimulationMode = "readonly" | "full_access";

interface SimulatedUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
}

interface SimulatedOrganization {
  id: string;
  name: string;
  slug: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  onboarding_completed: boolean | null;
  max_active_raffles: number | null;
  max_tickets_per_raffle: number | null;
  currency_code: string | null;
  country_code: string | null;
  timezone: string | null;
  brand_color: string | null;
  logo_url: string | null;
}

interface SimulationState {
  isSimulating: boolean;
  simulationId: string | null;
  simulatedUser: SimulatedUser | null;
  simulatedOrg: SimulatedOrganization | null;
  simulatedRole: "owner" | "admin" | "member" | null;
  mode: SimulationMode;
}

interface SimulationContextType extends SimulationState {
  startSimulation: (userId: string, orgId: string, mode: SimulationMode) => Promise<void>;
  endSimulation: () => Promise<void>;
  toggleMode: () => Promise<void>;
  canPerformAction: () => boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const SIMULATION_STORAGE_KEY = "admin_simulation";

export function SimulationProvider({ children }: { children: ReactNode }) {
  // Use try-catch pattern to handle potential context issues during initialization
  let actualUser = null;
  try {
    const auth = useAuth();
    actualUser = auth?.user ?? null;
  } catch {
    // AuthProvider may not be ready yet during initial render
    console.warn("SimulationProvider: AuthProvider not ready yet");
  }

  const [state, setState] = useState<SimulationState>({
    isSimulating: false,
    simulationId: null,
    simulatedUser: null,
    simulatedOrg: null,
    simulatedRole: null,
    mode: "readonly",
  });

  // Restore simulation from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (stored && actualUser) {
      try {
        const parsed = JSON.parse(stored);
        // Verify the simulation belongs to current admin
        if (parsed.adminUserId === actualUser.id) {
          restoreSimulation(parsed);
        } else {
          localStorage.removeItem(SIMULATION_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(SIMULATION_STORAGE_KEY);
      }
    }
  }, [actualUser?.id]);

  const restoreSimulation = async (storedData: {
    simulatedUserId: string;
    simulatedOrgId: string;
    mode: SimulationMode;
  }) => {
    try {
      // Fetch simulated user data
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, organization_id")
        .eq("id", storedData.simulatedUserId)
        .single();

      // Fetch simulated org data
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", storedData.simulatedOrgId)
        .single();

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", storedData.simulatedUserId)
        .eq("organization_id", storedData.simulatedOrgId)
        .single();

      if (userData && orgData) {
        setState({
          isSimulating: true,
          simulationId: `local-${Date.now()}`,
          simulatedUser: userData,
          simulatedOrg: orgData,
          simulatedRole: roleData?.role || null,
          mode: storedData.mode,
        });
      }
    } catch (error) {
      console.error("Error restoring simulation:", error);
      localStorage.removeItem(SIMULATION_STORAGE_KEY);
    }
  };

  const startSimulation = async (userId: string, orgId: string, mode: SimulationMode) => {
    if (!actualUser) return;

    try {
      // Fetch simulated user data
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, organization_id")
        .eq("id", userId)
        .single();

      // Fetch simulated org data
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", orgId)
        .single();

      if (userData && orgData) {
        const simulationId = `sim-${Date.now()}`;
        
        setState({
          isSimulating: true,
          simulationId,
          simulatedUser: userData,
          simulatedOrg: orgData,
          simulatedRole: roleData?.role || null,
          mode,
        });

        // Store in localStorage for persistence
        localStorage.setItem(
          SIMULATION_STORAGE_KEY,
          JSON.stringify({
            simulatedUserId: userId,
            simulatedOrgId: orgId,
            adminUserId: actualUser.id,
            mode,
          })
        );
      }
    } catch (error) {
      console.error("Error starting simulation:", error);
      throw error;
    }
  };

  const endSimulation = async () => {
    setState({
      isSimulating: false,
      simulationId: null,
      simulatedUser: null,
      simulatedOrg: null,
      simulatedRole: null,
      mode: "readonly",
    });

    localStorage.removeItem(SIMULATION_STORAGE_KEY);
  };

  const toggleMode = async () => {
    const newMode: SimulationMode = state.mode === "readonly" ? "full_access" : "readonly";

    setState((prev) => ({ ...prev, mode: newMode }));

    // Update localStorage
    const stored = localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem(
        SIMULATION_STORAGE_KEY,
        JSON.stringify({ ...parsed, mode: newMode })
      );
    }
  };

  const canPerformAction = () => {
    if (!state.isSimulating) return true;
    return state.mode === "full_access";
  };

  return (
    <SimulationContext.Provider
      value={{
        ...state,
        startSimulation,
        endSimulation,
        toggleMode,
        canPerformAction,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
