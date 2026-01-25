// Home Screen - Marketplace Feed
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFeed, useOrganizations, useRecentWinners } from '@sortavo/sdk/react';
import { FeedView } from '@sortavo/sdk-ui/native';
import type { Raffle, Organization, WinnerAnnouncement } from '@sortavo/sdk';
import { OrganizationsSection, WinnersSection } from '../../src/components/home';

// Local type for feed filters
interface FeedFilters {
  category?: string;
  status?: 'active' | 'ending_soon' | 'new';
  priceRange?: { min?: number; max?: number };
  sortBy?: 'trending' | 'ending_soon' | 'newest' | 'price_low' | 'price_high';
  followedOnly?: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<FeedFilters>({});

  // Fetch feed data
  const { raffles, isLoading: feedLoading, error: feedError, refetch: refetchFeed } = useFeed({
    filters,
  });

  // Fetch organizations
  const { organizations, isLoading: orgsLoading } = useOrganizations({
    verified: true,
    sortBy: 'popular',
    limit: 10,
  });

  // Fetch recent winners
  const { winners, isLoading: winnersLoading } = useRecentWinners({ limit: 5 });

  // Navigation handlers
  const handleRafflePress = useCallback((raffle: Raffle) => {
    router.push(`/raffle/${raffle.id}` as any);
  }, [router]);

  const handleOrganizationPress = useCallback((org: Organization) => {
    router.push(`/organization/${org.slug}` as any);
  }, [router]);

  const handleWinnerPress = useCallback((winner: WinnerAnnouncement) => {
    router.push(`/raffle/${winner.raffleId}` as any);
  }, [router]);

  const handleOrganizerPress = useCallback((slug: string) => {
    router.push(`/organization/${slug}` as any);
  }, [router]);

  const handleViewAllOrgs = useCallback(() => {
    router.push('/explore/organizations' as any);
  }, [router]);

  // Memoized header component for FeedView
  const ListHeaderComponent = useMemo(
    () => (
      <>
        <OrganizationsSection
          organizations={organizations}
          isLoading={orgsLoading}
          onPress={handleOrganizationPress}
          onViewAll={handleViewAllOrgs}
        />
        <WinnersSection
          winners={winners}
          isLoading={winnersLoading}
          onWinnerPress={handleWinnerPress}
          onOrganizerPress={handleOrganizerPress}
        />
      </>
    ),
    [
      organizations,
      orgsLoading,
      handleOrganizationPress,
      handleViewAllOrgs,
      winners,
      winnersLoading,
      handleWinnerPress,
      handleOrganizerPress,
    ]
  );

  return (
    <View style={styles.container}>
      <FeedView
        raffles={raffles}
        isLoading={feedLoading}
        error={feedError}
        onRafflePress={handleRafflePress}
        onRefresh={refetchFeed}
        filters={filters}
        onFiltersChange={setFilters}
        showFilters
        showSortOptions
        ListHeaderComponent={ListHeaderComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
