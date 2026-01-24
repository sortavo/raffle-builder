// OrganizationList - List organizations with filters
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
import { OrganizationCard } from './OrganizationCard';
import { EmptyState } from './EmptyState';
import type { Organization, OrganizationCategory } from '@sortavo/sdk';

export interface OrganizationListProps {
  organizations: Organization[];
  isLoading?: boolean;
  error?: Error | null;
  onOrganizationPress?: (organization: Organization) => void;
  onFollowPress?: (organization: Organization) => void;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  variant?: 'grid' | 'list' | 'horizontal';
  showFilters?: boolean;
  selectedCategory?: OrganizationCategory | null;
  onCategoryChange?: (category: OrganizationCategory | null) => void;
  showFollowButton?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
}

const CATEGORIES: { key: OrganizationCategory | null; label: string }[] = [
  { key: null, label: 'Todos' },
  { key: 'charity', label: 'Beneficencia' },
  { key: 'sports', label: 'Deportes' },
  { key: 'entertainment', label: 'Entretenimiento' },
  { key: 'education', label: 'Educación' },
  { key: 'community', label: 'Comunidad' },
  { key: 'business', label: 'Negocios' },
  { key: 'religious', label: 'Religioso' },
];

export function OrganizationList({
  organizations,
  isLoading = false,
  error,
  onOrganizationPress,
  onFollowPress,
  onRefresh,
  onEndReached,
  hasMore = false,
  variant = 'list',
  showFilters = false,
  selectedCategory,
  onCategoryChange,
  showFollowButton = true,
  emptyTitle = 'No hay organizadores',
  emptyMessage = 'No encontramos organizadores en esta categoría',
  ListHeaderComponent,
}: OrganizationListProps) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  const renderCategoryFilters = () => {
    if (!showFilters) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key || 'all'}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedCategory === cat.key
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: selectedCategory === cat.key
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              }
            ]}
            onPress={() => onCategoryChange?.(cat.key)}
          >
            <Text style={[
              styles.filterChipText,
              {
                color: selectedCategory === cat.key
                  ? '#FFFFFF'
                  : theme.colors.text,
              }
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderItem = useCallback(({ item }: { item: Organization }) => {
    return (
      <OrganizationCard
        organization={item}
        variant={variant === 'horizontal' ? 'compact' : 'horizontal'}
        onPress={onOrganizationPress}
        onFollowPress={onFollowPress}
        showFollowButton={showFollowButton}
      />
    );
  }, [variant, onOrganizationPress, onFollowPress, showFollowButton]);

  const renderFooter = () => {
    if (!hasMore || organizations.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Cargando más...
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
        title={emptyTitle}
        subtitle={emptyMessage}
      />
    );
  };

  if (variant === 'horizontal') {
    return (
      <View>
        {renderCategoryFilters()}
        {isLoading && organizations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : organizations.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={organizations}
            renderItem={({ item }) => (
              <OrganizationCard
                organization={item}
                variant="compact"
                onPress={onOrganizationPress}
                onFollowPress={onFollowPress}
                showFollowButton={false}
              />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={organizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            {renderCategoryFilters()}
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
        numColumns={variant === 'grid' ? 2 : 1}
        key={variant}
      />
      {isLoading && organizations.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
    padding: 16,
    paddingBottom: 32,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
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
});
