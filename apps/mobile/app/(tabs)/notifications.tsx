// Notifications Screen
import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications, useAuth } from '@sortavo/sdk/react';
import { NotificationCard, EmptyState } from '@sortavo/sdk-ui/native';
import type { NotificationData } from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';
import type { Notification } from '@sortavo/sdk';
import { useTranslation } from '../../src/i18n';

// FlatList performance constants
const NOTIFICATION_ITEM_HEIGHT = 100; // Estimated height of notification card with margin

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ realtime: true });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.metadata?.raffleId) {
      router.push(`/raffle/${notification.metadata.raffleId}`);
    } else if (notification.metadata?.ticketId) {
      router.push('/my-tickets');
    }
  }, [markAsRead, router]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  // Not logged in
  if (!user) {
    return (
      <EmptyState
        variant="custom"
        icon="🔔"
        title={t('notifications.loginPrompt.title')}
        subtitle={t('notifications.loginPrompt.subtitle')}
        actionLabel={t('auth.login.loginButton')}
        onAction={() => router.push('/auth/login')}
      />
    );
  }

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        variant="error"
        title={t('notifications.error.title')}
        subtitle={error.message}
        actionLabel={t('notifications.error.retryButton')}
        onAction={refetch}
      />
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          variant="no-notifications"
          title={t('notifications.empty.title')}
          subtitle={t('notifications.empty.subtitle')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with mark all as read */}
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.unreadBadge}>
            {t('notifications.header.unreadCount', { count: unreadCount })}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            accessibilityLabel="Marcar todas las notificaciones como leidas"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-done-outline" size={18} color="#6366F1" />
            <Text style={styles.markAllText}>{t('notifications.header.markAllAsRead')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MemoizedNotificationItem
            item={item}
            onPress={handleNotificationPress}
            onMarkAsRead={markAsRead}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
        // FlatList performance optimizations
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: NOTIFICATION_ITEM_HEIGHT,
          offset: NOTIFICATION_ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  unreadBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    marginBottom: 8,
  },
});

// Memoized notification item component for FlatList performance
const MemoizedNotificationItem = memo(function MemoizedNotificationItem({
  item,
  onPress,
  onMarkAsRead,
}: {
  item: Notification;
  onPress: (notification: Notification) => void;
  onMarkAsRead: (id: string) => void;
}) {
  // Map SDK notification to UI notification data
  const notificationData: NotificationData = {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    imageUrl: item.imageUrl,
    read: item.read,
    createdAt: item.createdAt,
    actionUrl: item.actionUrl,
    metadata: item.metadata,
  };

  return (
    <View
      accessible={true}
      accessibilityLabel={`Notificacion: ${item.title}${item.read ? '' : ', sin leer'}`}
      accessibilityRole="button"
      accessibilityHint="Toca para ver mas detalles"
    >
      <NotificationCard
        notification={notificationData}
        onPress={() => onPress(item)}
        onMarkAsRead={() => onMarkAsRead(item.id)}
        style={styles.notificationCard}
      />
    </View>
  );
});
