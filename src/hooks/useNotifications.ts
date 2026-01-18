import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { showBrowserNotification } from "@/lib/push-notifications";

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { 
    data: notifications = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('id, title, message, type, read, read_at, link, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    // Realtime subscription handles cache updates - no polling needed
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Update cache optimistically
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id],
            (old = []) => [newNotification, ...old]
          );
          
          // Show toast notification
          toast.info(newNotification.title, {
            description: newNotification.message,
            duration: 5000
          });
          
          // Show browser notification if page is hidden
          if (document.hidden) {
            showBrowserNotification(newNotification.title, {
              body: newNotification.message,
              tag: newNotification.id
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id],
        (old = []) => old.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id],
        (old = []) => old.map(n => ({ 
          ...n, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      );
    },
    onSuccess: () => {
      toast.success('Todas las notificaciones marcadas como leídas');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  // Delete read notifications
  const clearReadNotifications = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('Notificaciones limpiadas');
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const formatTimeAgo = useCallback((date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
    return new Date(date).toLocaleDateString('es-MX');
  }, []);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'ticket_sold':
        return '🎫';
      case 'payment_pending':
        return '⏳';
      case 'payment_approved':
        return '✅';
      case 'payment_rejected':
        return '❌';
      case 'raffle_completed':
        return '🎉';
      case 'winner_selected':
        return '🏆';
      case 'raffle_ending_soon':
        return '⚠️';
      case 'subscription':
        return '💳';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }, []);

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    clearReadNotifications,
    formatTimeAgo,
    getNotificationIcon
  };
}
