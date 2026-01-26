import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  skippedCount: number;
  message?: string;
}

export function useDeleteOrganizationUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string): Promise<DeleteResult> => {
      const { data, error } = await supabase.functions.invoke("delete-organization-users", {
        body: { organizationId },
      });

      if (error) {
        console.error("Error deleting organization users:", error);
        throw new Error(error.message || "Error al eliminar usuarios");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as DeleteResult;
    },
    onSuccess: (data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-organization-users", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organization-detail", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      
      if (data.deletedCount > 0) {
        toast.success(`${data.deletedCount} usuario(s) eliminado(s)`, {
          description: data.skippedCount > 0 
            ? `${data.skippedCount} admin(s) de plataforma omitidos` 
            : undefined,
        });
      } else if (data.skippedCount > 0) {
        toast.info("No se eliminaron usuarios", {
          description: "Todos los usuarios son administradores de plataforma",
        });
      } else {
        toast.info("No hay usuarios para eliminar");
      }
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar usuarios", {
        description: error.message,
      });
    },
  });
}
