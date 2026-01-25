// Purchase History Screen
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
import { useRouter, Stack } from 'expo-router';
import { useMyPurchases } from '@sortavo/sdk/react';
import { EmptyState, formatCurrency } from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';
import type { Purchase } from '@sortavo/sdk';
import { useTranslation } from '../../src/i18n';

// FlatList performance constants
const PURCHASE_ITEM_HEIGHT = 150; // Estimated height of purchase card with margin

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

export default function PurchasesScreen() {
  const router = useRouter();
  const { purchases, isLoading, error } = useMyPurchases();
  const [refreshing, setRefreshing] = React.useState(false);
  const { t } = useTranslation();

  // Note: useMyPurchases doesn't have refetch, so we just simulate refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh delay - actual refresh would require page reload
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'refunded':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('purchases.status.completed');
      case 'pending':
        return t('purchases.status.pending');
      case 'refunded':
        return t('purchases.status.refunded');
      default:
        return status;
    }
  };

  if (isLoading && purchases.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: t('purchases.title') }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('purchases.loading')}</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: t('purchases.title') }} />
        <EmptyState
          variant="error"
          title={t('purchases.error.title')}
          subtitle={error.message}
        />
      </>
    );
  }

  if (purchases.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: t('purchases.title') }} />
        <EmptyState
          variant="no-tickets"
          title={t('purchases.empty.title')}
          subtitle={t('purchases.empty.subtitle')}
          actionLabel={t('purchases.empty.exploreButton')}
          onAction={() => router.push('/')}
        />
      </>
    );
  }

  // Memoized render item for FlatList performance
  const renderPurchaseItem = useCallback(({ item }: { item: Purchase }) => (
    <PurchaseCard
      item={item}
      onPress={() => router.push(`/raffle/${item.raffleId}` as any)}
      formatDate={formatDate}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      t={t}
    />
  ), [router, formatDate, getStatusColor, getStatusLabel, t]);

  // getItemLayout for FlatList performance optimization
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: PURCHASE_ITEM_HEIGHT,
    offset: PURCHASE_ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <>
      <Stack.Screen options={{ title: t('purchases.title') }} />
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
        renderItem={renderPurchaseItem}
        // FlatList performance optimizations
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={getItemLayout}
      />
    </>
  );
}

// Memoized purchase card component for FlatList performance
const PurchaseCard = memo(function PurchaseCard({
  item,
  onPress,
  formatDate,
  getStatusColor,
  getStatusLabel,
  t,
}: {
  item: Purchase;
  onPress: () => void;
  formatDate: (date: Date) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const ticketCount = item.tickets?.length || 0;
  const ticketLabel = ticketCount !== 1
    ? t('purchases.card.ticketCountPlural', { count: ticketCount })
    : t('purchases.card.ticketCount', { count: ticketCount });
  const statusLabel = getStatusLabel(item.status);

  return (
    <TouchableOpacity
      style={styles.purchaseCard}
      onPress={onPress}
      accessibilityLabel={`Compra numero ${item.id.slice(0, 8)}, ${ticketLabel}, estado ${statusLabel}`}
      accessibilityRole="button"
      accessibilityHint="Toca para ver detalles de la rifa"
    >
      <View style={styles.purchaseHeader}>
        <Text style={styles.purchaseTitle} numberOfLines={1}>
          {t('purchases.card.purchaseId', { id: item.id.slice(0, 8) })}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.purchaseDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="ticket-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{ticketLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.purchaseFooter}>
        <Text style={styles.totalLabel}>{t('purchases.card.totalPaid')}</Text>
        <Text style={styles.totalAmount}>
          {item.totalAmount > 0
            ? formatCurrency(item.totalAmount, item.currency)
            : t('common.viewDetails')}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#9CA3AF"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
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
  listContent: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    minHeight: '100%',
  },
  purchaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    minHeight: MIN_TOUCH_TARGET,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  purchaseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
});
