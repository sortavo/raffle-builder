// Explore Organizations Screen
import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useOrganizations, useFollowOrganization, useAuth } from '@sortavo/sdk/react';
import { OrganizationCard, SearchBar, EmptyState } from '@sortavo/sdk-ui/native';
import type { Organization } from '@sortavo/sdk';

// FlatList performance constants
const ORGANIZATION_ITEM_HEIGHT = 120; // Estimated height of organization card

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

const CATEGORIES = [
  { key: undefined, label: 'Todos' },
  { key: 'charity', label: 'Beneficencia' },
  { key: 'sports', label: 'Deportes' },
  { key: 'entertainment', label: 'Entretenimiento' },
  { key: 'education', label: 'Educacion' },
  { key: 'community', label: 'Comunidad' },
  { key: 'business', label: 'Negocios' },
];

export default function ExploreOrganizationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { organizations, isLoading, error, refetch } = useOrganizations({
    search: search || undefined,
    category,
    sortBy: 'popular',
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOrganizationPress = useCallback((org: Organization) => {
    router.push(`/organization/${org.slug}` as any);
  }, [router]);

  const handleFollowPress = useCallback((org: Organization) => {
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }
    // Follow handled by OrganizationCard internally or via hook
  }, [user, router]);

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              category === item.key && styles.categoryChipActive,
            ]}
            onPress={() => setCategory(item.key)}
            accessibilityLabel={`Filtrar por categoria ${item.label}${category === item.key ? ', seleccionado' : ''}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.categoryLabel,
                category === item.key && styles.categoryLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderOrganization = useCallback(({ item }: { item: Organization }) => (
    <MemoizedOrganizationItem
      item={item}
      onPress={handleOrganizationPress}
      onFollowPress={handleFollowPress}
    />
  ), [handleOrganizationPress, handleFollowPress]);

  const renderEmpty = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <EmptyState
          variant="error"
          title="Error al cargar"
          subtitle={error.message}
          actionLabel="Reintentar"
          onAction={refetch}
        />
      );
    }

    return (
      <EmptyState
        variant="custom"
        icon="🔍"
        title="Sin resultados"
        subtitle="No encontramos organizadores con estos criterios"
        actionLabel="Limpiar filtros"
        onAction={() => {
          setSearch('');
          setCategory(undefined);
        }}
      />
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Explorar Organizadores',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="Buscar organizadores..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Filter */}
        {renderCategoryFilter()}

        {/* Results Count */}
        {!isLoading && organizations.length > 0 && (
          <Text style={styles.resultsCount}>
            {organizations.length} organizadores encontrados
          </Text>
        )}

        {/* Organizations List */}
        {isLoading && organizations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Buscando organizadores...</Text>
          </View>
        ) : (
          <FlatList
            data={organizations}
            keyExtractor={(item) => item.id}
            renderItem={renderOrganization}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
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
              length: ORGANIZATION_ITEM_HEIGHT,
              offset: ORGANIZATION_ITEM_HEIGHT * index,
              index,
            })}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#6366F1',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});

// Memoized organization item for FlatList performance
const MemoizedOrganizationItem = memo(function MemoizedOrganizationItem({
  item,
  onPress,
  onFollowPress,
}: {
  item: Organization;
  onPress: (org: Organization) => void;
  onFollowPress: (org: Organization) => void;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={`Ver perfil de ${item.name}`}
      accessibilityRole="button"
      accessibilityHint="Toca para ver los sorteos de esta organizacion"
    >
      <OrganizationCard
        organization={item}
        variant="horizontal"
        onPress={onPress}
        onFollowPress={onFollowPress}
        showFollowButton
        showStats
      />
    </View>
  );
});
