// FeedView - Main marketplace feed with filters and categories
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme';
import { RaffleCard } from './RaffleCard';
import { EmptyState } from './EmptyState';
import type { Raffle } from '@sortavo/sdk';

// Local type for feed filters
interface FeedFilters {
  category?: string;
  status?: 'active' | 'ending_soon' | 'new';
  priceRange?: { min?: number; max?: number };
  sortBy?: 'trending' | 'ending_soon' | 'newest' | 'price_low' | 'price_high';
  followedOnly?: boolean;
}

export interface FeedViewProps {
  raffles: Raffle[];
  isLoading?: boolean;
  error?: Error | null;
  onRafflePress?: (raffle: Raffle) => void;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  filters?: FeedFilters;
  onFiltersChange?: (filters: FeedFilters) => void;
  showFilters?: boolean;
  showSortOptions?: boolean;
  ListHeaderComponent?: React.ReactElement;
  featuredRaffles?: Raffle[];
}

const STATUS_FILTERS = [
  { key: undefined, label: 'Todos' },
  { key: 'ending_soon', label: '⏰ Terminan pronto' },
  { key: 'new', label: '✨ Nuevos' },
] as const;

const SORT_OPTIONS = [
  { key: 'trending', label: '🔥 Trending' },
  { key: 'ending_soon', label: '⏰ Por terminar' },
  { key: 'newest', label: '🆕 Más nuevos' },
  { key: 'price_low', label: '💰 Precio bajo' },
  { key: 'price_high', label: '💎 Precio alto' },
] as const;

const CATEGORIES = [
  { key: undefined, label: 'Todos', icon: '🎯' },
  { key: 'charity', label: 'Beneficencia', icon: '❤️' },
  { key: 'sports', label: 'Deportes', icon: '⚽' },
  { key: 'entertainment', label: 'Entretenimiento', icon: '🎬' },
  { key: 'education', label: 'Educación', icon: '📚' },
  { key: 'community', label: 'Comunidad', icon: '🏘️' },
] as const;

export function FeedView({
  raffles,
  isLoading = false,
  error,
  onRafflePress,
  onRefresh,
  onEndReached,
  hasMore = false,
  filters = {},
  onFiltersChange,
  showFilters = true,
  showSortOptions = true,
  ListHeaderComponent,
  featuredRaffles,
}: FeedViewProps) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  const updateFilter = (key: keyof FeedFilters, value: any) => {
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const renderCategoryFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
      contentContainerStyle={styles.categoryContent}
    >
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.key || 'all'}
          style={[
            styles.categoryChip,
            {
              backgroundColor: filters.category === cat.key
                ? theme.colors.primary
                : theme.colors.surface,
            }
          ]}
          onPress={() => updateFilter('category', cat.key)}
        >
          <Text style={styles.categoryIcon}>{cat.icon}</Text>
          <Text style={[
            styles.categoryLabel,
            { color: filters.category === cat.key ? '#FFFFFF' : theme.colors.text }
          ]}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderStatusFilters = () => (
    <View style={styles.statusContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusContent}
      >
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status.key || 'all'}
            style={[
              styles.statusChip,
              {
                backgroundColor: filters.status === status.key
                  ? theme.colors.primary + '20'
                  : 'transparent',
                borderColor: filters.status === status.key
                  ? theme.colors.primary
                  : theme.colors.textSecondary + '40',
              }
            ]}
            onPress={() => updateFilter('status', status.key)}
          >
            <Text style={[
              styles.statusLabel,
              { color: filters.status === status.key ? theme.colors.primary : theme.colors.text }
            ]}>
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showSortOptions && (
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Text style={[styles.sortButtonText, { color: theme.colors.text }]}>
            {SORT_OPTIONS.find(s => s.key === filters.sortBy)?.label || '🔥 Trending'}
          </Text>
          <Text style={styles.sortArrow}>▼</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSortDropdown = () => {
    if (!showSortDropdown) return null;

    return (
      <View style={[styles.sortDropdown, { backgroundColor: theme.colors.surface }]}>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortOption,
              filters.sortBy === option.key && { backgroundColor: theme.colors.primary + '15' }
            ]}
            onPress={() => {
              updateFilter('sortBy', option.key);
              setShowSortDropdown(false);
            }}
          >
            <Text style={[
              styles.sortOptionText,
              { color: filters.sortBy === option.key ? theme.colors.primary : theme.colors.text }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFeatured = () => {
    if (!featuredRaffles || featuredRaffles.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          ⭐ Destacados
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {featuredRaffles.map((raffle) => (
            <View key={raffle.id} style={styles.featuredCard}>
              <RaffleCard
                raffle={raffle}
                variant="featured"
                onPress={() => onRafflePress?.(raffle)}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: Raffle }) => (
    <RaffleCard
      raffle={item}
      variant="compact"
      onPress={() => onRafflePress?.(item)}
    />
  ), [onRafflePress]);

  const renderFooter = () => {
    if (!hasMore || raffles.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Cargando más sorteos...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <EmptyState
          variant="error"
          title="Error al cargar"
          subtitle={error.message}
          actionLabel="Reintentar"
          onAction={onRefresh}
        />
      );
    }

    return (
      <EmptyState
        variant="no-raffles"
        title="No hay sorteos"
        subtitle="No encontramos sorteos con estos filtros. Intenta con otros criterios."
        actionLabel="Limpiar filtros"
        onAction={() => onFiltersChange?.({})}
      />
    );
  };

  const renderFollowedToggle = () => (
    <TouchableOpacity
      style={[
        styles.followedToggle,
        {
          backgroundColor: filters.followedOnly
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: filters.followedOnly
            ? theme.colors.primary
            : theme.colors.textSecondary + '40',
        }
      ]}
      onPress={() => updateFilter('followedOnly', !filters.followedOnly)}
    >
      <Text style={[
        styles.followedToggleText,
        { color: filters.followedOnly ? '#FFFFFF' : theme.colors.text }
      ]}>
        {filters.followedOnly ? '❤️ Siguiendo' : '🌍 Todos'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={raffles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            {showFilters && (
              <View style={styles.filtersWrapper}>
                <View style={styles.topFilters}>
                  {renderFollowedToggle()}
                </View>
                {renderCategoryFilters()}
                {renderStatusFilters()}
                {renderSortDropdown()}
              </View>
            )}
            {renderFeatured()}
            {raffles.length > 0 && (
              <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                {raffles.length} sorteos encontrados
              </Text>
            )}
          </>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
      {isLoading && raffles.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Buscando sorteos...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  filtersWrapper: {
    paddingTop: 8,
  },
  topFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  followedToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  followedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statusContent: {
    flex: 1,
    gap: 8,
    flexDirection: 'row',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortArrow: {
    fontSize: 10,
    opacity: 0.5,
  },
  sortDropdown: {
    position: 'absolute',
    top: 100,
    right: 16,
    borderRadius: 12,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 100,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuredSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    width: 280,
    marginRight: 12,
  },
  resultsCount: {
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});
