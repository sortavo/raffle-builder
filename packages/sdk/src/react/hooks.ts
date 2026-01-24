// React Hooks for Sortavo SDK
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSortavoClient, useSortavoContext } from './provider';
import { useSortavoStore, selectUser, selectIsAuthenticated, selectCurrentRaffle, selectSelectedTickets } from '../store';
import type { Raffle, Ticket, Purchase, Notification, PaginatedResponse } from '../types';

// ==================== Authentication Hooks ====================

export function useAuth() {
  const client = useSortavoClient();
  const user = useSortavoStore(selectUser);
  const isAuthenticated = useSortavoStore(selectIsAuthenticated);
  const isAuthLoading = useSortavoStore((s) => s.isAuthLoading);
  const setUser = useSortavoStore((s) => s.setUser);
  const setError = useSortavoStore((s) => s.setError);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await client.signInWithEmail(email, password);
    if (result.success && result.data) {
      setUser(result.data);
    } else if (result.error) {
      setError(result.error);
    }
    return result;
  }, [client, setUser, setError]);

  const signInWithPhone = useCallback(async (phone: string) => {
    return client.signInWithOTP(phone);
  }, [client]);

  const verifyPhone = useCallback(async (phone: string, code: string) => {
    const result = await client.verifyOTP(phone, code);
    if (result.success && result.data) {
      setUser(result.data);
    } else if (result.error) {
      setError(result.error);
    }
    return result;
  }, [client, setUser, setError]);

  const signOut = useCallback(async () => {
    const result = await client.signOut();
    if (result.success) {
      setUser(null);
    }
    return result;
  }, [client, setUser]);

  return {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    signIn,
    signInWithPhone,
    verifyPhone,
    signOut,
  };
}

// ==================== Raffle Hooks ====================

export function useRaffles(options: {
  status?: 'active' | 'completed' | 'all';
  page?: number;
  limit?: number;
} = {}) {
  const client = useSortavoClient();
  const [data, setData] = useState<PaginatedResponse<Raffle> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRaffles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await client.getRaffles(options);

    if (result.success && result.data) {
      setData(result.data);
    } else if (result.error) {
      setError(new Error(result.error.message));
    }

    setIsLoading(false);
  }, [client, options.status, options.page, options.limit]);

  useEffect(() => {
    fetchRaffles();
  }, [fetchRaffles]);

  return {
    raffles: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: fetchRaffles,
  };
}

export function useRaffle(raffleId: string | null) {
  const client = useSortavoClient();
  const currentRaffle = useSortavoStore(selectCurrentRaffle);
  const setCurrentRaffle = useSortavoStore((s) => s.setCurrentRaffle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!raffleId) {
      setCurrentRaffle(null);
      return;
    }

    // Check cache first
    const cached = useSortavoStore.getState().raffles.get(raffleId);
    if (cached) {
      setCurrentRaffle(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    client.getRaffle(raffleId).then((result) => {
      if (result.success && result.data) {
        setCurrentRaffle(result.data);
      } else if (result.error) {
        setError(new Error(result.error.message));
      }
      setIsLoading(false);
    });
  }, [client, raffleId, setCurrentRaffle]);

  return {
    raffle: currentRaffle,
    isLoading,
    error,
  };
}

export function useRaffleBySlug(slug: string | null) {
  const client = useSortavoClient();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setRaffle(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    client.getRaffleBySlug(slug).then((result) => {
      if (result.success && result.data) {
        setRaffle(result.data);
      } else if (result.error) {
        setError(new Error(result.error.message));
      }
      setIsLoading(false);
    });
  }, [client, slug]);

  return { raffle, isLoading, error };
}

// ==================== Ticket Hooks ====================

export function useTickets(raffleId: string | null) {
  const client = useSortavoClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!raffleId) return;

    setIsLoading(true);
    setError(null);

    const result = await client.getAvailableTickets(raffleId);

    if (result.success && result.data) {
      setTickets(result.data);
    } else if (result.error) {
      setError(new Error(result.error.message));
    }

    setIsLoading(false);
  }, [client, raffleId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!raffleId) return;

    const unsubscribe = client.subscribeToRaffle(raffleId, {
      onTicketUpdate: (ticket) => {
        setTickets((prev) => {
          const index = prev.findIndex((t) => t.id === ticket.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = ticket;
            return updated;
          }
          return prev;
        });
      },
    });

    return unsubscribe;
  }, [client, raffleId]);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
}

export function useTicketSelection() {
  const selectedTickets = useSortavoStore(selectSelectedTickets);
  const addSelectedTicket = useSortavoStore((s) => s.addSelectedTicket);
  const removeSelectedTicket = useSortavoStore((s) => s.removeSelectedTicket);
  const clearSelectedTickets = useSortavoStore((s) => s.clearSelectedTickets);

  const toggleTicket = useCallback((ticket: Ticket) => {
    const isSelected = selectedTickets.some((t) => t.id === ticket.id);
    if (isSelected) {
      removeSelectedTicket(ticket.id);
    } else {
      addSelectedTicket(ticket);
    }
  }, [selectedTickets, addSelectedTicket, removeSelectedTicket]);

  const isSelected = useCallback((ticketId: string) => {
    return selectedTickets.some((t) => t.id === ticketId);
  }, [selectedTickets]);

  return {
    selectedTickets,
    toggleTicket,
    isSelected,
    clearSelection: clearSelectedTickets,
    count: selectedTickets.length,
  };
}

export function useMyTickets(raffleId?: string) {
  const client = useSortavoClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);

    client.getMyTickets(raffleId).then((result) => {
      if (result.success && result.data) {
        setTickets(result.data);
      } else if (result.error) {
        setError(new Error(result.error.message));
      }
      setIsLoading(false);
    });
  }, [client, raffleId]);

  return { tickets, isLoading, error };
}

// ==================== Purchase Hooks ====================

export function usePurchase() {
  const client = useSortavoClient();
  const selectedTickets = useSortavoStore(selectSelectedTickets);
  const currentRaffle = useSortavoStore(selectCurrentRaffle);
  const clearSelectedTickets = useSortavoStore((s) => s.clearSelectedTickets);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPurchase = useCallback(async () => {
    if (!currentRaffle || selectedTickets.length === 0) {
      return { success: false, error: { code: 'INVALID_SELECTION', message: 'No tickets selected' } };
    }

    setIsProcessing(true);
    setError(null);

    const ticketNumbers = selectedTickets.map((t) => t.number);
    const result = await client.createPurchase(currentRaffle.id, ticketNumbers);

    if (result.success) {
      clearSelectedTickets();
    } else if (result.error) {
      setError(new Error(result.error.message));
    }

    setIsProcessing(false);
    return result;
  }, [client, currentRaffle, selectedTickets, clearSelectedTickets]);

  const totalAmount = useMemo(() => {
    if (!currentRaffle) return 0;
    return selectedTickets.length * currentRaffle.ticketPrice;
  }, [currentRaffle, selectedTickets]);

  return {
    createPurchase,
    isProcessing,
    error,
    totalAmount,
    currency: currentRaffle?.currency || 'MXN',
    ticketCount: selectedTickets.length,
  };
}

export function useMyPurchases() {
  const client = useSortavoClient();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client.getMyPurchases().then((result) => {
      if (result.success && result.data) {
        setPurchases(result.data);
      } else if (result.error) {
        setError(new Error(result.error.message));
      }
      setIsLoading(false);
    });
  }, [client]);

  return { purchases, isLoading, error };
}

// ==================== Notification Hooks ====================

export function useNotifications(options: {
  unreadOnly?: boolean;
  realtime?: boolean;
} = {}) {
  const client = useSortavoClient();
  const { unreadOnly = false, realtime = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await client.getNotifications({ unreadOnly });

    if (result.success && result.data) {
      setNotifications(result.data.data);
      // Update unread count
      const count = result.data.data.filter((n) => !n.read).length;
      setUnreadCount(count);
    } else if (result.error) {
      setError(new Error(result.error.message));
    }

    setIsLoading(false);
  }, [client, unreadOnly]);

  // Fetch unread count separately (for badge)
  const fetchUnreadCount = useCallback(async () => {
    const result = await client.getUnreadCount();
    if (result.success && result.data !== undefined) {
      setUnreadCount(result.data);
    }
  }, [client]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const result = await client.markNotificationAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    return result;
  }, [client]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const result = await client.markAllNotificationsAsRead();
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    }
    return result;
  }, [client]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const result = await client.deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
    return result;
  }, [client, notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const unsubscribe = client.subscribeToNotifications({
      onNew: (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
      },
      onUpdate: (notification) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? notification : n))
        );
        // Recalculate unread count
        fetchUnreadCount();
      },
      onDelete: (notificationId) => {
        setNotifications((prev) => {
          const notification = prev.find((n) => n.id === notificationId);
          if (notification && !notification.read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== notificationId);
        });
      },
    });

    return unsubscribe;
  }, [client, realtime, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// ==================== Utility Hooks ====================

export function useSortavoError() {
  const error = useSortavoStore((s) => s.error);
  const setError = useSortavoStore((s) => s.setError);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return { error, clearError };
}

export function useTenant() {
  const { config } = useSortavoContext();

  return {
    tenantId: config.tenantId,
    tenantSlug: config.tenantSlug,
    features: config.features,
    theme: config.theme,
  };
}
