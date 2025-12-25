import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  organization_id: string;
  type: "bank_transfer" | "cash" | "other";
  enabled: boolean;
  display_order: number;
  name: string;
  instructions: string | null;
  bank_name: string | null;
  account_number: string | null;
  clabe: string | null;
  account_holder: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethodInsert = Omit<PaymentMethod, "id" | "created_at" | "updated_at">;
export type PaymentMethodUpdate = Partial<Omit<PaymentMethod, "id" | "organization_id" | "created_at" | "updated_at">>;

export function usePaymentMethods() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["payment-methods", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!organization?.id,
  });

  const createMethod = useMutation({
    mutationFn: async (method: Omit<PaymentMethodInsert, "organization_id">) => {
      if (!organization?.id) throw new Error("No organization found");

      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          ...method,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", organization?.id] });
      toast.success("Método de pago creado");
    },
    onError: (error: Error) => {
      console.error("Error creating payment method:", error);
      toast.error("Error al crear método de pago");
    },
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PaymentMethodUpdate }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", organization?.id] });
      toast.success("Método de pago actualizado");
    },
    onError: (error: Error) => {
      console.error("Error updating payment method:", error);
      toast.error("Error al actualizar método de pago");
    },
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", organization?.id] });
      toast.success("Método de pago eliminado");
    },
    onError: (error: Error) => {
      console.error("Error deleting payment method:", error);
      toast.error("Error al eliminar método de pago");
    },
  });

  const toggleMethod = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update({ enabled })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", organization?.id] });
    },
    onError: (error: Error) => {
      console.error("Error toggling payment method:", error);
      toast.error("Error al actualizar método de pago");
    },
  });

  return {
    methods: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createMethod,
    updateMethod,
    deleteMethod,
    toggleMethod,
  };
}

// Hook for public pages to fetch payment methods by organization ID
export function usePublicPaymentMethods(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["public-payment-methods", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("enabled", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!organizationId,
  });
}
