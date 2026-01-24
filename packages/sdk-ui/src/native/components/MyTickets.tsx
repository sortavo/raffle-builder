// My Tickets Component - Display user's purchased tickets
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Share,
  Animated,
} from 'react-native';
import { useMyTickets } from '@sortavo/sdk/react';
import { useTheme } from '../theme';
import type { MyTicketsProps, TicketDisplayVariant } from '../../types';
import type { Ticket } from '@sortavo/sdk';
import { formatDate, formatCurrency } from '../utils';

interface TicketCardProps {
  ticket: Ticket & { raffle?: { title: string; slug: string; image_url?: string } };
  variant: TicketDisplayVariant;
  onPress?: () => void;
  onShare?: () => void;
  theme: ReturnType<typeof useTheme>;
}

function TicketCard({ ticket, variant, onPress, onShare, theme }: TicketCardProps) {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  const statusConfig = useMemo(() => {
    switch (ticket.status) {
      case 'sold':
        return { label: 'Confirmado', color: theme.colors.success, icon: '✓' };
      case 'won':
        return { label: '¡GANADOR!', color: theme.colors.accent, icon: '🏆' };
      default:
        return { label: ticket.status, color: theme.colors.textSecondary, icon: '' };
    }
  }, [ticket.status, theme]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.ticketCard,
        {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
        },
        isCompact && styles.ticketCardCompact,
        ticket.status === 'won' && {
          borderWidth: 2,
          borderColor: theme.colors.accent,
        },
      ]}
    >
      {/* Ticket Number Badge */}
      <View
        style={[
          styles.ticketNumberBadge,
          {
            backgroundColor: ticket.status === 'won' ? theme.colors.accent : theme.colors.primary,
            borderRadius: theme.borderRadius.md,
          },
        ]}
      >
        <Text style={styles.ticketNumberLabel}>BOLETO</Text>
        <Text style={styles.ticketNumberValue}>{ticket.number}</Text>
      </View>

      {/* Ticket Info */}
      <View style={styles.ticketInfo}>
        {ticket.raffle && (
          <Text
            style={[styles.raffleName, { color: theme.colors.text }]}
            numberOfLines={isCompact ? 1 : 2}
          >
            {ticket.raffle.title}
          </Text>
        )}

        <View style={styles.ticketMeta}>
          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color + '20' },
            ]}
          >
            {statusConfig.icon ? (
              <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
            ) : null}
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {/* Date */}
          {ticket.purchasedAt && !isCompact && (
            <Text style={[styles.ticketDate, { color: theme.colors.textSecondary }]}>
              {formatDate(ticket.purchasedAt)}
            </Text>
          )}
        </View>

        {/* Detailed View Extra Info */}
        {isDetailed && (
          <View style={styles.detailedInfo}>
            <View style={styles.detailedRow}>
              <Text style={[styles.detailedLabel, { color: theme.colors.textSecondary }]}>
                ID de compra:
              </Text>
              <Text style={[styles.detailedValue, { color: theme.colors.text }]}>
                #{ticket.id.slice(0, 8)}
              </Text>
            </View>
            {ticket.purchasedAt && (
              <View style={styles.detailedRow}>
                <Text style={[styles.detailedLabel, { color: theme.colors.textSecondary }]}>
                  Fecha de compra:
                </Text>
                <Text style={[styles.detailedValue, { color: theme.colors.text }]}>
                  {formatDate(ticket.purchasedAt, { dateStyle: 'long' })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.ticketActions}>
        {onShare && (
          <TouchableOpacity
            onPress={onShare}
            style={[styles.shareButton, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>›</Text>
      </View>

      {/* Winner Ribbon */}
      {ticket.status === 'won' && (
        <View style={[styles.winnerRibbon, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.winnerRibbonText}>GANADOR</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MyTickets({
  raffleId,
  onTicketPress,
  emptyComponent,
  loadingComponent,
  groupByRaffle = true,
  variant = 'default',
  showFilters = true,
  style,
  testID,
}: MyTicketsProps) {
  const theme = useTheme();
  const { tickets, isLoading, error } = useMyTickets(raffleId);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'won'>('all');

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;
    if (filter === 'won') return tickets.filter((t) => t.status === 'won');
    return tickets.filter((t) => t.status === 'sold');
  }, [tickets, filter]);

  // Group by raffle if enabled
  const groupedTickets = useMemo(() => {
    if (!groupByRaffle) return { ungrouped: filteredTickets };

    const groups: Record<string, typeof filteredTickets> = {};
    filteredTickets.forEach((ticket) => {
      const key = ticket.raffleId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ticket);
    });
    return groups;
  }, [filteredTickets, groupByRaffle]);

  // Handle share
  const handleShare = async (ticket: Ticket) => {
    try {
      await Share.share({
        message: `¡Mira mi boleto #${ticket.number} en Sortavo!`,
        url: `https://sortavo.com/ticket/${ticket.id}`,
      });
    } catch (e) {
      // Ignore
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // The hook will handle refetching
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Stats
  const stats = useMemo(() => ({
    total: tickets.length,
    won: tickets.filter((t) => t.status === 'won').length,
    active: tickets.filter((t) => t.status === 'sold').length,
  }), [tickets]);

  if (isLoading && !refreshing) {
    return (
      loadingComponent || (
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Cargando boletos...
          </Text>
        </View>
      )
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Error al cargar boletos
        </Text>
      </View>
    );
  }

  if (tickets.length === 0) {
    return (
      emptyComponent || (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎟️</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No tienes boletos aún
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Participa en una rifa para ver tus boletos aquí
          </Text>
        </View>
      )
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Stats Summary */}
      <View style={[styles.statsSummary, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: theme.colors.background }]} />
          <View style={styles.statsItem}>
            <Text style={[styles.statsValue, { color: theme.colors.success }]}>{stats.active}</Text>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>Activos</Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: theme.colors.background }]} />
          <View style={styles.statsItem}>
            <Text style={[styles.statsValue, { color: theme.colors.accent }]}>{stats.won}</Text>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>Ganados</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filters}>
          {(['all', 'active', 'won'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filter === f ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Ganados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tickets List */}
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item as any}
            variant={variant}
            onPress={() => onTicketPress?.(item)}
            onShare={() => handleShare(item)}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Text style={[styles.emptyFilterText, { color: theme.colors.textSecondary }]}>
              No hay boletos con este filtro
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  statsSummary: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statsDivider: {
    width: 1,
    height: 32,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  ticketCardCompact: {
    padding: 12,
  },
  ticketNumberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  ticketNumberLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  ticketNumberValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 16,
  },
  raffleName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusIcon: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 12,
  },
  detailedInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailedLabel: {
    fontSize: 12,
  },
  detailedValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  winnerRibbon: {
    position: 'absolute',
    top: 12,
    right: -28,
    paddingHorizontal: 32,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
  },
  winnerRibbonText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  emptyFilter: {
    padding: 24,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 14,
  },
});
