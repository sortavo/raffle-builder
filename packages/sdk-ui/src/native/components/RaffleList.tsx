// Raffle List Component for React Native
import React from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRaffles } from '@sortavo/sdk/react';
import { useTheme } from '../theme';
import { RaffleCard } from './RaffleCard';
import type { RaffleListProps } from '../../types';
import type { Raffle } from '@sortavo/sdk';

export function RaffleList({
  status = 'active',
  onRafflePress,
  renderRaffleCard,
  emptyComponent,
  loadingComponent,
  columns = 1,
  showStatus = true,
  showProgress = true,
  showCountdown = true,
  style,
  testID,
}: RaffleListProps) {
  const theme = useTheme();
  const { raffles, isLoading, error, refetch } = useRaffles({ status });

  const renderItem = ({ item, index }: { item: Raffle; index: number }) => {
    if (renderRaffleCard) {
      return <>{renderRaffleCard(item)}</>;
    }

    return (
      <View
        style={[
          styles.cardContainer,
          columns === 2 && styles.cardContainerGrid,
          columns === 2 && index % 2 === 0 && { paddingRight: theme.spacing.sm / 2 },
          columns === 2 && index % 2 === 1 && { paddingLeft: theme.spacing.sm / 2 },
        ]}
      >
        <RaffleCard
          raffle={item}
          onPress={() => onRafflePress?.(item)}
          showProgress={showProgress}
          showCountdown={showCountdown}
          variant={columns === 2 ? 'compact' : 'default'}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      loadingComponent || (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Error al cargar rifas
        </Text>
        <Text
          style={[styles.retryText, { color: theme.colors.primary }]}
          onPress={refetch}
        >
          Reintentar
        </Text>
      </View>
    );
  }

  if (raffles.length === 0) {
    return (
      emptyComponent || (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No hay rifas disponibles
          </Text>
        </View>
      )
    );
  }

  return (
    <FlatList
      data={raffles}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      key={columns} // Force re-render when columns change
      contentContainerStyle={[
        styles.listContent,
        { padding: theme.spacing.md },
      ]}
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
      showsVerticalScrollIndicator={false}
      onRefresh={refetch}
      refreshing={isLoading}
      style={style}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  cardContainer: {
    flex: 1,
  },
  cardContainerGrid: {
    flex: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
