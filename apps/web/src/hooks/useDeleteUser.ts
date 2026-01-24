import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteUserResult {
  success: boolean;
  message: string;
  deletedUser?: {
    id: string;
    email: string;
  };
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<DeleteUserResult> => {
      const { data, error } = await supabase.functions.invoke<DeleteUserResult>('delete-user', {
        body: { userId }
      });

      if (error) {
        throw new Error(error.message || 'Error al eliminar usuario');
      }

      if (!data?.success) {
        throw new Error((data as any)?.error || 'Error al eliminar usuario');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-platform-admins'] });
      
      toast.success("Usuario eliminado", {
        description: `${data.deletedUser?.email || 'El usuario'} ha sido eliminado permanentemente.`
      });
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar usuario", {
        description: error.message
      });
    }
  });
}
