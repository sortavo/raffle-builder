// WinnersList - List of recent winners
import React from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { WinnerCard } from './WinnerCard';
import { EmptyState } from './EmptyState';
import type { WinnerAnnouncement } from '@sortavo/sdk';

export interface WinnersListProps {
  winners: WinnerAnnouncement[];
  isLoading?: boolean;
  error?: Error | null;
  onWinnerPress?: (winner: WinnerAnnouncement) => void;
  onOrganizerPress?: (slug: string) => void;
  variant?: 'vertical' | 'horizontal' | 'featured';
  title?: string;
  showTitle?: boolean;
  showOrganizer?: boolean;
  emptyMessage?: string;
  maxItems?: number;
}

export function WinnersList({
  winners,
  isLoading = false,
  error,
  onWinnerPress,
  onOrganizerPress,
  variant = 'vertical',
  title = 'Ganadores Recientes',
  showTitle = true,
  showOrganizer = true,
  emptyMessage = 'Aún no hay ganadores',
  maxItems,
}: WinnersListProps) {
  const theme = useTheme();

  const displayWinners = maxItems ? winners.slice(0, maxItems) : winners;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando ganadores...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        title="Error"
        subtitle={error.message}
      />
    );
  }

  if (displayWinners.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.container}>
        {showTitle && (
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {displayWinners.map((winner) => (
            <View key={winner.id} style={styles.horizontalCard}>
              <WinnerCard
                winner={winner}
                variant="minimal"
                onPress={onWinnerPress}
                onOrganizerPress={onOrganizerPress}
                showOrganizer={showOrganizer}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (variant === 'featured') {
    return (
      <View style={styles.container}>
        {showTitle && (
          <View style={styles.titleContainer}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
          pagingEnabled
          snapToInterval={300}
          decelerationRate="fast"
        >
          {displayWinners.map((winner) => (
            <View key={winner.id} style={styles.featuredCard}>
              <WinnerCard
                winner={winner}
                variant="featured"
                onPress={onWinnerPress}
                onOrganizerPress={onOrganizerPress}
                showOrganizer={showOrganizer}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Vertical variant (default)
  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.titleContainer}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.countText}>{winners.length}</Text>
          </View>
        </View>
      )}
      <FlatList
        data={displayWinners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WinnerCard
            winner={item}
            variant="compact"
            onPress={onWinnerPress}
            onOrganizerPress={onOrganizerPress}
            showOrganizer={showOrganizer}
          />
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  trophyEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  horizontalCard: {
    marginRight: 8,
  },
  featuredScroll: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 280,
    marginRight: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
