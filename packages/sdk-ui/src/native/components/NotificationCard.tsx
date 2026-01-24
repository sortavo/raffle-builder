// Notification Card Component - Display notifications
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { formatRelativeTime } from '../utils';

export type NotificationType =
  | 'purchase_confirmed'
  | 'raffle_starting'
  | 'raffle_ending'
  | 'winner_announcement'
  | 'ticket_reminder'
  | 'promotion'
  | 'system';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationCardProps {
  notification: NotificationData;
  onPress?: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  style?: any;
  testID?: string;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  purchase_confirmed: { icon: '✅', color: '#10B981' },
  raffle_starting: { icon: '🎉', color: '#6366F1' },
  raffle_ending: { icon: '⏰', color: '#F59E0B' },
  winner_announcement: { icon: '🏆', color: '#FFD700' },
  ticket_reminder: { icon: '🎟️', color: '#8B5CF6' },
  promotion: { icon: '🎁', color: '#EC4899' },
  system: { icon: '🔔', color: '#6B7280' },
};

export function NotificationCard({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
  showActions = false,
  style,
  testID,
}: NotificationCardProps) {
  const theme = useTheme();
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={[
        styles.container,
        {
          backgroundColor: notification.read
            ? theme.colors.background
            : theme.colors.primary + '08',
          borderRadius: theme.borderRadius.lg,
          borderLeftColor: config.color,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Unread Indicator */}
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
      )}

      {/* Icon or Image */}
      {notification.imageUrl ? (
        <Image source={{ uri: notification.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text },
            !notification.read && styles.titleUnread,
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text
          style={[styles.body, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          {!notification.read && onMarkAsRead && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
            >
              <Text style={styles.actionIcon}>✓</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.error }]}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chevron */}
      {onPress && (
        <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>›</Text>
      )}
    </TouchableOpacity>
  );
}

// Notification List Component
export interface NotificationListProps {
  notifications: NotificationData[];
  onNotificationPress?: (notification: NotificationData) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  showHeader?: boolean;
  emptyComponent?: React.ReactNode;
  style?: any;
}

export function NotificationList({
  notifications,
  onNotificationPress,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  showHeader = true,
  emptyComponent,
  style,
}: NotificationListProps) {
  const theme = useTheme();
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      emptyComponent || (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Sin notificaciones
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Te avisaremos cuando haya novedades
          </Text>
        </View>
      )
    );
  }

  return (
    <View style={[styles.listContainer, style]}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Notificaciones
            {unreadCount > 0 && (
              <Text style={[styles.headerCount, { color: theme.colors.primary }]}>
                {' '}({unreadCount})
              </Text>
            )}
          </Text>
          {unreadCount > 0 && onMarkAllAsRead && (
            <TouchableOpacity onPress={onMarkAllAsRead}>
              <Text style={[styles.markAllRead, { color: theme.colors.primary }]}>
                Marcar todo como leído
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notifications */}
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onPress={() => onNotificationPress?.(notification)}
          onMarkAsRead={() => onMarkAsRead?.(notification.id)}
          onDelete={onDelete ? () => onDelete(notification.id) : undefined}
          style={styles.listItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderLeftWidth: 4,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  listContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerCount: {
    fontWeight: '400',
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: '500',
  },
  listItem: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
