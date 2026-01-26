import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-organization", {
        body: { organizationId },
      });

      if (error) {
        throw new Error(error.message || "Error al eliminar la organización");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast.success("Organización eliminada", {
        description: "La organización y todos sus datos han sido eliminados permanentemente.",
      });
    },
    onError: (error: Error) => {
      console.error("Delete organization error:", error);
      toast.error("Error al eliminar organización", {
        description: error.message,
      });
    },
  });
}
