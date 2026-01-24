import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useIsPlatformAdmin() {
  const { user } = useAuth();

  const { data: isPlatformAdmin, isLoading } = useQuery({
    queryKey: ['platform-admin', user?.id],
    queryFn: async () => {
      // Primera validación: verificar dominio del email
      if (!user?.email?.endsWith('@sortavo.com')) {
        return false;
      }

      // Segunda validación: verificar en base de datos
      const { data, error } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking platform admin status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return { 
    isPlatformAdmin: !!isPlatformAdmin, 
    isLoading,
    isSortavoEmail: user?.email?.endsWith('@sortavo.com') ?? false
  };
}
