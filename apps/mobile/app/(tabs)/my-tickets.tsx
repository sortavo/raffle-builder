// My Tickets Screen
import React, { useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useMyTickets } from '@sortavo/sdk/react';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  sizes,
  shadows,
  commonStyles,
} from '../../src/theme';
import { useTranslation } from '../../src/i18n';

// FlatList performance constants
const TICKET_ITEM_HEIGHT = 80; // Estimated height of ticket card with padding/margin

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

export default function MyTicketsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { tickets, isLoading } = useMyTickets();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return (
      <View style={commonStyles.centerContainer}>
        <Ionicons name="ticket-outline" size={sizes.iconXxl} color={colors.textMuted} />
        <Text style={commonStyles.title}>{t('myTickets.loginPrompt.title')}</Text>
        <Text style={commonStyles.subtitle}>
          {t('myTickets.loginPrompt.subtitle')}
        </Text>
        <TouchableOpacity
          style={[commonStyles.buttonPrimary, styles.loginButton]}
          onPress={() => router.push('/auth/login')}
          accessibilityLabel={t('myTickets.loginPrompt.title')}
          accessibilityRole="button"
        >
          <Text style={commonStyles.buttonPrimaryText}>{t('auth.login.loginButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={commonStyles.centerContainer}>
        <Text style={styles.loadingText}>{t('myTickets.loading')}</Text>
      </View>
    );
  }

  if (tickets.length === 0) {
    return (
      <View style={commonStyles.centerContainer}>
        <Ionicons name="ticket-outline" size={sizes.iconXxl} color={colors.textMuted} />
        <Text style={commonStyles.title}>{t('myTickets.empty.title')}</Text>
        <Text style={commonStyles.subtitle}>
          {t('myTickets.empty.subtitle')}
        </Text>
        <TouchableOpacity
          style={[commonStyles.buttonPrimary, styles.exploreButton]}
          onPress={() => router.push('/')}
          accessibilityLabel={t('myTickets.empty.exploreButton')}
          accessibilityRole="button"
        >
          <Text style={commonStyles.buttonPrimaryText}>{t('myTickets.empty.exploreButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Memoized render item for FlatList performance
  const renderTicketItem = useCallback(({ item }: { item: typeof tickets[0] }) => (
    <TicketCard
      item={item}
      onPress={() => router.push(`/raffle/${item.raffleId}`)}
      t={t}
    />
  ), [router, t]);

  // getItemLayout for FlatList performance optimization
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: TICKET_ITEM_HEIGHT,
    offset: TICKET_ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={commonStyles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderTicketItem}
        // FlatList performance optimizations
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={getItemLayout}
      />
    </View>
  );
}

// Memoized ticket card component for FlatList performance
const TicketCard = memo(function TicketCard({
  item,
  onPress,
  t,
}: {
  item: { id: string; number: string | number; status: string; purchasedAt?: Date };
  onPress: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const statusLabel = item.status === 'sold' ? t('myTickets.ticket.confirmed') : item.status;

  return (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={onPress}
      accessibilityLabel={`Boleto numero ${item.number}, estado ${statusLabel}`}
      accessibilityRole="button"
      accessibilityHint="Toca para ver detalles de la rifa"
    >
      <View style={styles.ticketNumber}>
        <Text style={styles.ticketNumberText}>{item.number}</Text>
      </View>
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketStatus}>{statusLabel}</Text>
        {item.purchasedAt && (
          <Text style={styles.ticketDate}>
            {t('myTickets.ticket.purchasedAt', { date: new Date(item.purchasedAt).toLocaleDateString('es-MX') })}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={sizes.iconMd} color={colors.textMuted} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  loginButton: {
    marginTop: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  exploreButton: {
    marginTop: spacing.xl,
  },
  listContent: {
    padding: spacing.base,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    ...shadows.sm,
  },
  ticketNumber: {
    width: sizes.ticketBadge,
    height: sizes.ticketBadge,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketNumberText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  ticketInfo: {
    flex: 1,
    marginLeft: spacing.base,
  },
  ticketStatus: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  ticketDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
