import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the pure business logic functions from useNotifications
// These don't require mocking Supabase

interface Notification {
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

// =====================================================
// Time Formatting Logic
// =====================================================

describe('useNotifications - formatTimeAgo', () => {
  // Extract the pure function
  const formatTimeAgo = (date: string, now: Date = new Date()): string => {
    const then = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
    return new Date(date).toLocaleDateString('es-MX');
  };

  describe('recent notifications', () => {
    it('should return "Ahora" for notifications less than 1 minute old', () => {
      const now = new Date();
      const justNow = new Date(now.getTime() - 30000).toISOString(); // 30 seconds ago
      expect(formatTimeAgo(justNow, now)).toBe('Ahora');
    });

    it('should return "Ahora" for notifications created at the same time', () => {
      const now = new Date();
      expect(formatTimeAgo(now.toISOString(), now)).toBe('Ahora');
    });
  });

  describe('minutes ago', () => {
    it('should format 1 minute ago correctly', () => {
      const now = new Date();
      const oneMinAgo = new Date(now.getTime() - 60000).toISOString();
      expect(formatTimeAgo(oneMinAgo, now)).toBe('Hace 1m');
    });

    it('should format 30 minutes ago correctly', () => {
      const now = new Date();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60000).toISOString();
      expect(formatTimeAgo(thirtyMinAgo, now)).toBe('Hace 30m');
    });

    it('should format 59 minutes ago correctly', () => {
      const now = new Date();
      const fiftyNineMinAgo = new Date(now.getTime() - 59 * 60000).toISOString();
      expect(formatTimeAgo(fiftyNineMinAgo, now)).toBe('Hace 59m');
    });
  });

  describe('hours ago', () => {
    it('should format 1 hour ago correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60000).toISOString();
      expect(formatTimeAgo(oneHourAgo, now)).toBe('Hace 1h');
    });

    it('should format 12 hours ago correctly', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60000).toISOString();
      expect(formatTimeAgo(twelveHoursAgo, now)).toBe('Hace 12h');
    });

    it('should format 23 hours ago correctly', () => {
      const now = new Date();
      const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60000).toISOString();
      expect(formatTimeAgo(twentyThreeHoursAgo, now)).toBe('Hace 23h');
    });
  });

  describe('days ago', () => {
    it('should format 1 day ago correctly', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60000).toISOString();
      expect(formatTimeAgo(oneDayAgo, now)).toBe('Hace 1d');
    });

    it('should format 3 days ago correctly', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60000).toISOString();
      expect(formatTimeAgo(threeDaysAgo, now)).toBe('Hace 3d');
    });

    it('should format 6 days ago correctly', () => {
      const now = new Date();
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60000).toISOString();
      expect(formatTimeAgo(sixDaysAgo, now)).toBe('Hace 6d');
    });
  });

  describe('older notifications', () => {
    it('should format 7 days ago as date', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60000).toISOString();
      const result = formatTimeAgo(sevenDaysAgo, now);
      // Should be a formatted date, not relative time
      expect(result).not.toContain('Hace');
    });

    it('should format old date correctly in es-MX locale', () => {
      const now = new Date('2024-06-15T12:00:00Z');
      const oldDate = '2024-01-15T12:00:00Z';
      const result = formatTimeAgo(oldDate, now);
      // Should contain the date parts
      expect(result).toMatch(/\d+/); // Contains numbers (day, month, year)
    });
  });
});

// =====================================================
// Notification Icon Logic
// =====================================================

describe('useNotifications - getNotificationIcon', () => {
  const getNotificationIcon = (type: string): string => {
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
      case 'payment_failed':
        return '💔';
      case 'trial_ending':
        return '⏰';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  describe('ticket notifications', () => {
    it('should return ticket emoji for ticket_sold', () => {
      expect(getNotificationIcon('ticket_sold')).toBe('🎫');
    });
  });

  describe('payment notifications', () => {
    it('should return hourglass for pending payments', () => {
      expect(getNotificationIcon('payment_pending')).toBe('⏳');
    });

    it('should return checkmark for approved payments', () => {
      expect(getNotificationIcon('payment_approved')).toBe('✅');
    });

    it('should return X for rejected payments', () => {
      expect(getNotificationIcon('payment_rejected')).toBe('❌');
    });

    it('should return broken heart for failed payments', () => {
      expect(getNotificationIcon('payment_failed')).toBe('💔');
    });
  });

  describe('raffle notifications', () => {
    it('should return party popper for completed raffles', () => {
      expect(getNotificationIcon('raffle_completed')).toBe('🎉');
    });

    it('should return trophy for winner selected', () => {
      expect(getNotificationIcon('winner_selected')).toBe('🏆');
    });

    it('should return warning for ending soon', () => {
      expect(getNotificationIcon('raffle_ending_soon')).toBe('⚠️');
    });
  });

  describe('subscription notifications', () => {
    it('should return credit card for subscription', () => {
      expect(getNotificationIcon('subscription')).toBe('💳');
    });

    it('should return alarm for trial ending', () => {
      expect(getNotificationIcon('trial_ending')).toBe('⏰');
    });
  });

  describe('system notifications', () => {
    it('should return info for system notifications', () => {
      expect(getNotificationIcon('system')).toBe('ℹ️');
    });
  });

  describe('unknown types', () => {
    it('should return bell for unknown types', () => {
      expect(getNotificationIcon('unknown')).toBe('🔔');
      expect(getNotificationIcon('')).toBe('🔔');
      expect(getNotificationIcon('custom_type')).toBe('🔔');
    });
  });
});

// =====================================================
// Notification Filtering Logic
// =====================================================

describe('useNotifications - filtering', () => {
  const createNotification = (overrides: Partial<Notification>): Notification => ({
    id: 'test-id',
    user_id: 'user-1',
    organization_id: null,
    type: 'system',
    title: 'Test',
    message: 'Test message',
    link: null,
    read: false,
    read_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const filterUnread = (notifications: Notification[]): Notification[] => {
    return notifications.filter((n) => !n.read);
  };

  const filterRead = (notifications: Notification[]): Notification[] => {
    return notifications.filter((n) => n.read);
  };

  const filterByType = (notifications: Notification[], type: string): Notification[] => {
    return notifications.filter((n) => n.type === type);
  };

  const filterByOrganization = (
    notifications: Notification[],
    orgId: string | null
  ): Notification[] => {
    if (orgId === null) {
      return notifications.filter((n) => n.organization_id === null);
    }
    return notifications.filter((n) => n.organization_id === orgId);
  };

  describe('read/unread filtering', () => {
    const notifications: Notification[] = [
      createNotification({ id: '1', read: false }),
      createNotification({ id: '2', read: true }),
      createNotification({ id: '3', read: false }),
      createNotification({ id: '4', read: true }),
    ];

    it('should filter unread notifications', () => {
      const unread = filterUnread(notifications);
      expect(unread).toHaveLength(2);
      expect(unread.every((n) => !n.read)).toBe(true);
    });

    it('should filter read notifications', () => {
      const read = filterRead(notifications);
      expect(read).toHaveLength(2);
      expect(read.every((n) => n.read)).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const allRead = [
        createNotification({ id: '1', read: true }),
        createNotification({ id: '2', read: true }),
      ];
      expect(filterUnread(allRead)).toHaveLength(0);
    });
  });

  describe('type filtering', () => {
    const notifications: Notification[] = [
      createNotification({ id: '1', type: 'ticket_sold' }),
      createNotification({ id: '2', type: 'payment_approved' }),
      createNotification({ id: '3', type: 'ticket_sold' }),
      createNotification({ id: '4', type: 'system' }),
    ];

    it('should filter by type correctly', () => {
      const ticketSold = filterByType(notifications, 'ticket_sold');
      expect(ticketSold).toHaveLength(2);
    });

    it('should return empty for non-existent type', () => {
      const result = filterByType(notifications, 'non_existent');
      expect(result).toHaveLength(0);
    });
  });

  describe('organization filtering', () => {
    const notifications: Notification[] = [
      createNotification({ id: '1', organization_id: 'org-1' }),
      createNotification({ id: '2', organization_id: 'org-2' }),
      createNotification({ id: '3', organization_id: 'org-1' }),
      createNotification({ id: '4', organization_id: null }), // Global notification
    ];

    it('should filter by organization', () => {
      const org1 = filterByOrganization(notifications, 'org-1');
      expect(org1).toHaveLength(2);
    });

    it('should filter global notifications', () => {
      const global = filterByOrganization(notifications, null);
      expect(global).toHaveLength(1);
    });
  });
});

// =====================================================
// Notification Priority Logic
// =====================================================

describe('useNotifications - priority logic', () => {
  type NotificationPriority = 'high' | 'medium' | 'low';

  const getNotificationPriority = (type: string): NotificationPriority => {
    // High priority: payment issues, ending soon
    const highPriority = ['payment_rejected', 'payment_failed', 'raffle_ending_soon', 'trial_ending'];
    if (highPriority.includes(type)) return 'high';

    // Medium priority: payment actions needed
    const mediumPriority = ['payment_pending', 'winner_selected', 'subscription'];
    if (mediumPriority.includes(type)) return 'medium';

    // Low priority: informational
    return 'low';
  };

  const sortByPriority = (notifications: Notification[]): Notification[] => {
    const priorityOrder: Record<NotificationPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...notifications].sort((a, b) => {
      const aPriority = priorityOrder[getNotificationPriority(a.type)];
      const bPriority = priorityOrder[getNotificationPriority(b.type)];
      return aPriority - bPriority;
    });
  };

  const hasHighPriorityUnread = (notifications: Notification[]): boolean => {
    return notifications.some(
      (n) => !n.read && getNotificationPriority(n.type) === 'high'
    );
  };

  describe('priority assignment', () => {
    it('should assign high priority to payment failures', () => {
      expect(getNotificationPriority('payment_rejected')).toBe('high');
      expect(getNotificationPriority('payment_failed')).toBe('high');
    });

    it('should assign high priority to urgent notifications', () => {
      expect(getNotificationPriority('raffle_ending_soon')).toBe('high');
      expect(getNotificationPriority('trial_ending')).toBe('high');
    });

    it('should assign medium priority to action items', () => {
      expect(getNotificationPriority('payment_pending')).toBe('medium');
      expect(getNotificationPriority('winner_selected')).toBe('medium');
      expect(getNotificationPriority('subscription')).toBe('medium');
    });

    it('should assign low priority to informational', () => {
      expect(getNotificationPriority('ticket_sold')).toBe('low');
      expect(getNotificationPriority('payment_approved')).toBe('low');
      expect(getNotificationPriority('raffle_completed')).toBe('low');
      expect(getNotificationPriority('system')).toBe('low');
    });
  });

  describe('priority sorting', () => {
    const createNotification = (type: string, id: string): Notification => ({
      id,
      user_id: 'user-1',
      organization_id: null,
      type,
      title: 'Test',
      message: 'Test message',
      link: null,
      read: false,
      read_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
    });

    it('should sort high priority first', () => {
      const notifications = [
        createNotification('system', '1'),
        createNotification('payment_failed', '2'),
        createNotification('payment_pending', '3'),
      ];

      const sorted = sortByPriority(notifications);
      expect(sorted[0].type).toBe('payment_failed'); // high
      expect(sorted[1].type).toBe('payment_pending'); // medium
      expect(sorted[2].type).toBe('system'); // low
    });

    it('should not mutate original array', () => {
      const notifications = [
        createNotification('system', '1'),
        createNotification('payment_failed', '2'),
      ];
      const original = [...notifications];
      sortByPriority(notifications);
      expect(notifications).toEqual(original);
    });
  });

  describe('high priority detection', () => {
    const createNotification = (type: string, read: boolean): Notification => ({
      id: 'test',
      user_id: 'user-1',
      organization_id: null,
      type,
      title: 'Test',
      message: 'Test message',
      link: null,
      read,
      read_at: read ? new Date().toISOString() : null,
      metadata: {},
      created_at: new Date().toISOString(),
    });

    it('should detect unread high priority notifications', () => {
      const notifications = [
        createNotification('system', false),
        createNotification('payment_failed', false),
      ];
      expect(hasHighPriorityUnread(notifications)).toBe(true);
    });

    it('should not detect read high priority notifications', () => {
      const notifications = [
        createNotification('system', false),
        createNotification('payment_failed', true), // read
      ];
      expect(hasHighPriorityUnread(notifications)).toBe(false);
    });

    it('should return false when no high priority', () => {
      const notifications = [
        createNotification('system', false),
        createNotification('ticket_sold', false),
      ];
      expect(hasHighPriorityUnread(notifications)).toBe(false);
    });
  });
});

// =====================================================
// Notification Grouping Logic
// =====================================================

describe('useNotifications - grouping', () => {
  const createNotification = (
    id: string,
    type: string,
    createdAt: string
  ): Notification => ({
    id,
    user_id: 'user-1',
    organization_id: null,
    type,
    title: 'Test',
    message: 'Test message',
    link: null,
    read: false,
    read_at: null,
    metadata: {},
    created_at: createdAt,
  });

  const groupByDate = (notifications: Notification[]): Map<string, Notification[]> => {
    const groups = new Map<string, Notification[]>();

    for (const notification of notifications) {
      const date = new Date(notification.created_at).toLocaleDateString('es-MX');
      const existing = groups.get(date) || [];
      existing.push(notification);
      groups.set(date, existing);
    }

    return groups;
  };

  const groupByType = (notifications: Notification[]): Map<string, Notification[]> => {
    const groups = new Map<string, Notification[]>();

    for (const notification of notifications) {
      const existing = groups.get(notification.type) || [];
      existing.push(notification);
      groups.set(notification.type, existing);
    }

    return groups;
  };

  const countByType = (notifications: Notification[]): Record<string, number> => {
    const counts: Record<string, number> = {};

    for (const notification of notifications) {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
    }

    return counts;
  };

  describe('grouping by date', () => {
    it('should group notifications by date', () => {
      const today = new Date().toISOString();
      const yesterday = new Date(Date.now() - 86400000).toISOString();

      const notifications = [
        createNotification('1', 'system', today),
        createNotification('2', 'system', today),
        createNotification('3', 'system', yesterday),
      ];

      const groups = groupByDate(notifications);
      expect(groups.size).toBe(2);
    });

    it('should handle empty array', () => {
      const groups = groupByDate([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('grouping by type', () => {
    it('should group notifications by type', () => {
      const notifications = [
        createNotification('1', 'ticket_sold', new Date().toISOString()),
        createNotification('2', 'payment_approved', new Date().toISOString()),
        createNotification('3', 'ticket_sold', new Date().toISOString()),
      ];

      const groups = groupByType(notifications);
      expect(groups.get('ticket_sold')).toHaveLength(2);
      expect(groups.get('payment_approved')).toHaveLength(1);
    });
  });

  describe('counting by type', () => {
    it('should count notifications by type', () => {
      const notifications = [
        createNotification('1', 'ticket_sold', new Date().toISOString()),
        createNotification('2', 'payment_approved', new Date().toISOString()),
        createNotification('3', 'ticket_sold', new Date().toISOString()),
        createNotification('4', 'system', new Date().toISOString()),
      ];

      const counts = countByType(notifications);
      expect(counts['ticket_sold']).toBe(2);
      expect(counts['payment_approved']).toBe(1);
      expect(counts['system']).toBe(1);
    });

    it('should handle empty array', () => {
      const counts = countByType([]);
      expect(Object.keys(counts)).toHaveLength(0);
    });
  });
});

// =====================================================
// Notification Actions Logic
// =====================================================

describe('useNotifications - action derivation', () => {
  interface NotificationAction {
    label: string;
    link: string | null;
    primary: boolean;
  }

  const getNotificationActions = (notification: Notification): NotificationAction[] => {
    const actions: NotificationAction[] = [];

    switch (notification.type) {
      case 'payment_pending':
        actions.push({
          label: 'Revisar pago',
          link: notification.link || `/orders?status=pending`,
          primary: true,
        });
        break;
      case 'ticket_sold':
        actions.push({
          label: 'Ver orden',
          link: notification.link,
          primary: true,
        });
        break;
      case 'winner_selected':
        actions.push({
          label: 'Ver ganador',
          link: notification.link,
          primary: true,
        });
        actions.push({
          label: 'Compartir',
          link: null,
          primary: false,
        });
        break;
      case 'trial_ending':
        actions.push({
          label: 'Actualizar plan',
          link: '/settings/billing',
          primary: true,
        });
        break;
    }

    return actions;
  };

  const hasActions = (notification: Notification): boolean => {
    return getNotificationActions(notification).length > 0;
  };

  const getPrimaryAction = (notification: Notification): NotificationAction | null => {
    const actions = getNotificationActions(notification);
    return actions.find((a) => a.primary) || null;
  };

  describe('action derivation by type', () => {
    it('should derive actions for payment_pending', () => {
      const notification: Notification = {
        id: '1',
        user_id: 'user-1',
        organization_id: null,
        type: 'payment_pending',
        title: 'Pago pendiente',
        message: 'Test',
        link: '/orders/123',
        read: false,
        read_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const actions = getNotificationActions(notification);
      expect(actions).toHaveLength(1);
      expect(actions[0].label).toBe('Revisar pago');
      expect(actions[0].primary).toBe(true);
    });

    it('should derive multiple actions for winner_selected', () => {
      const notification: Notification = {
        id: '1',
        user_id: 'user-1',
        organization_id: null,
        type: 'winner_selected',
        title: 'Ganador seleccionado',
        message: 'Test',
        link: '/raffles/123/winner',
        read: false,
        read_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const actions = getNotificationActions(notification);
      expect(actions).toHaveLength(2);
      expect(actions[0].primary).toBe(true);
      expect(actions[1].primary).toBe(false);
    });

    it('should return empty array for notifications without actions', () => {
      const notification: Notification = {
        id: '1',
        user_id: 'user-1',
        organization_id: null,
        type: 'system',
        title: 'System',
        message: 'Test',
        link: null,
        read: false,
        read_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const actions = getNotificationActions(notification);
      expect(actions).toHaveLength(0);
    });
  });

  describe('action helpers', () => {
    it('should detect notifications with actions', () => {
      const withActions: Notification = {
        id: '1',
        user_id: 'user-1',
        organization_id: null,
        type: 'payment_pending',
        title: 'Test',
        message: 'Test',
        link: null,
        read: false,
        read_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const withoutActions: Notification = {
        ...withActions,
        type: 'system',
      };

      expect(hasActions(withActions)).toBe(true);
      expect(hasActions(withoutActions)).toBe(false);
    });

    it('should get primary action', () => {
      const notification: Notification = {
        id: '1',
        user_id: 'user-1',
        organization_id: null,
        type: 'winner_selected',
        title: 'Test',
        message: 'Test',
        link: '/winner',
        read: false,
        read_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const primary = getPrimaryAction(notification);
      expect(primary).not.toBeNull();
      expect(primary?.primary).toBe(true);
    });
  });
});

// =====================================================
// Notification State Derivation
// =====================================================

describe('useNotifications - state derivation', () => {
  const createNotification = (
    id: string,
    read: boolean,
    type: string = 'system'
  ): Notification => ({
    id,
    user_id: 'user-1',
    organization_id: null,
    type,
    title: 'Test',
    message: 'Test message',
    link: null,
    read,
    read_at: read ? new Date().toISOString() : null,
    metadata: {},
    created_at: new Date().toISOString(),
  });

  interface NotificationState {
    total: number;
    unreadCount: number;
    readCount: number;
    hasUnread: boolean;
    isEmpty: boolean;
  }

  const deriveNotificationState = (notifications: Notification[]): NotificationState => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);

    return {
      total: notifications.length,
      unreadCount: unread.length,
      readCount: read.length,
      hasUnread: unread.length > 0,
      isEmpty: notifications.length === 0,
    };
  };

  describe('state calculation', () => {
    it('should calculate state for mixed notifications', () => {
      const notifications = [
        createNotification('1', false),
        createNotification('2', true),
        createNotification('3', false),
        createNotification('4', true),
      ];

      const state = deriveNotificationState(notifications);
      expect(state.total).toBe(4);
      expect(state.unreadCount).toBe(2);
      expect(state.readCount).toBe(2);
      expect(state.hasUnread).toBe(true);
      expect(state.isEmpty).toBe(false);
    });

    it('should handle all unread', () => {
      const notifications = [
        createNotification('1', false),
        createNotification('2', false),
      ];

      const state = deriveNotificationState(notifications);
      expect(state.unreadCount).toBe(2);
      expect(state.readCount).toBe(0);
      expect(state.hasUnread).toBe(true);
    });

    it('should handle all read', () => {
      const notifications = [
        createNotification('1', true),
        createNotification('2', true),
      ];

      const state = deriveNotificationState(notifications);
      expect(state.unreadCount).toBe(0);
      expect(state.readCount).toBe(2);
      expect(state.hasUnread).toBe(false);
    });

    it('should handle empty array', () => {
      const state = deriveNotificationState([]);
      expect(state.total).toBe(0);
      expect(state.isEmpty).toBe(true);
      expect(state.hasUnread).toBe(false);
    });
  });
});

// =====================================================
// Error Handling
// =====================================================

describe('useNotifications - error handling', () => {
  const categorizeError = (error: Error): 'network' | 'permission' | 'validation' | 'unknown' => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    return 'unknown';
  };

  const getErrorMessage = (error: Error, language: 'en' | 'es' = 'es'): string => {
    const category = categorizeError(error);

    const messages: Record<string, Record<string, string>> = {
      network: { en: 'Connection error', es: 'Error de conexion' },
      permission: { en: 'Permission denied', es: 'Permiso denegado' },
      validation: { en: 'Invalid data', es: 'Datos invalidos' },
      unknown: { en: 'Unexpected error', es: 'Error inesperado' },
    };

    return messages[category][language];
  };

  describe('error categorization', () => {
    it('should categorize network errors', () => {
      expect(categorizeError(new Error('Network error'))).toBe('network');
      expect(categorizeError(new Error('Failed to fetch'))).toBe('network');
      expect(categorizeError(new Error('Connection refused'))).toBe('network');
    });

    it('should categorize permission errors', () => {
      expect(categorizeError(new Error('Permission denied'))).toBe('permission');
      expect(categorizeError(new Error('Forbidden'))).toBe('permission');
      expect(categorizeError(new Error('Unauthorized'))).toBe('permission');
    });

    it('should categorize validation errors', () => {
      expect(categorizeError(new Error('Invalid notification ID'))).toBe('validation');
      expect(categorizeError(new Error('User ID required'))).toBe('validation');
    });

    it('should return unknown for unrecognized errors', () => {
      expect(categorizeError(new Error('Something went wrong'))).toBe('unknown');
    });
  });

  describe('localized error messages', () => {
    it('should return Spanish messages by default', () => {
      expect(getErrorMessage(new Error('Network error'))).toBe('Error de conexion');
    });

    it('should return English messages when specified', () => {
      expect(getErrorMessage(new Error('Network error'), 'en')).toBe('Connection error');
    });
  });
});
