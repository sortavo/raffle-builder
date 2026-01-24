// OrganizationCard - Display organization in list/grid
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme';
import type { Organization } from '@sortavo/sdk';

export interface OrganizationCardProps {
  organization: Organization;
  variant?: 'compact' | 'featured' | 'horizontal';
  onPress?: (organization: Organization) => void;
  onFollowPress?: (organization: Organization) => void;
  showFollowButton?: boolean;
  showStats?: boolean;
}

export function OrganizationCard({
  organization,
  variant = 'compact',
  onPress,
  onFollowPress,
  showFollowButton = true,
  showStats = true,
}: OrganizationCardProps) {
  const theme = useTheme();

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      charity: 'Beneficencia',
      sports: 'Deportes',
      entertainment: 'Entretenimiento',
      education: 'Educación',
      community: 'Comunidad',
      business: 'Negocios',
      religious: 'Religioso',
      other: 'Otro',
    };
    return category ? labels[category] || category : '';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        style={[styles.horizontalCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onPress?.(organization)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: organization.logoUrl || 'https://via.placeholder.com/60' }}
          style={styles.horizontalLogo}
        />
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalHeader}>
            <Text style={[styles.horizontalName, { color: theme.colors.text }]} numberOfLines={1}>
              {organization.name}
            </Text>
            {organization.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          {organization.category && (
            <Text style={[styles.category, { color: theme.colors.textSecondary }]}>
              {getCategoryLabel(organization.category)}
            </Text>
          )}
          <View style={styles.horizontalStats}>
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {organization.stats.activeRaffles} sorteos activos
            </Text>
            <Text style={[styles.statDot, { color: theme.colors.textSecondary }]}>•</Text>
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {formatNumber(organization.followerCount || 0)} seguidores
            </Text>
          </View>
        </View>
        {showFollowButton && (
          <TouchableOpacity
            style={[
              styles.followButton,
              organization.isFollowing
                ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderWidth: 1 }
                : { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => onFollowPress?.(organization)}
          >
            <Text style={[
              styles.followButtonText,
              { color: organization.isFollowing ? theme.colors.primary : '#FFFFFF' }
            ]}>
              {organization.isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={[styles.featuredCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onPress?.(organization)}
        activeOpacity={0.7}
      >
        {organization.coverImageUrl && (
          <Image
            source={{ uri: organization.coverImageUrl }}
            style={styles.coverImage}
          />
        )}
        <View style={styles.featuredOverlay}>
          <Image
            source={{ uri: organization.logoUrl || 'https://via.placeholder.com/80' }}
            style={styles.featuredLogo}
          />
          <View style={styles.featuredInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.featuredName} numberOfLines={1}>
                {organization.name}
              </Text>
              {organization.verified && (
                <View style={[styles.verifiedBadgeLarge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              )}
            </View>
            {organization.description && (
              <Text style={styles.featuredDescription} numberOfLines={2}>
                {organization.description}
              </Text>
            )}
          </View>
        </View>
        {showStats && (
          <View style={styles.featuredStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {organization.stats.totalRaffles}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Sorteos
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatNumber(organization.stats.totalParticipants)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Participantes
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatNumber(organization.followerCount || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Seguidores
              </Text>
            </View>
          </View>
        )}
        {showFollowButton && (
          <TouchableOpacity
            style={[
              styles.featuredFollowButton,
              organization.isFollowing
                ? { backgroundColor: 'transparent', borderColor: theme.colors.primary, borderWidth: 2 }
                : { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => onFollowPress?.(organization)}
          >
            <Text style={[
              styles.featuredFollowText,
              { color: organization.isFollowing ? theme.colors.primary : '#FFFFFF' }
            ]}>
              {organization.isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Compact variant (default)
  return (
    <TouchableOpacity
      style={[styles.compactCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress?.(organization)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: organization.logoUrl || 'https://via.placeholder.com/80' }}
        style={styles.compactLogo}
      />
      <View style={styles.compactNameRow}>
        <Text style={[styles.compactName, { color: theme.colors.text }]} numberOfLines={1}>
          {organization.name}
        </Text>
        {organization.verified && (
          <View style={[styles.verifiedBadgeSmall, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.verifiedIconSmall}>✓</Text>
          </View>
        )}
      </View>
      <Text style={[styles.compactStats, { color: theme.colors.textSecondary }]}>
        {organization.stats.activeRaffles} sorteos
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact variant
  compactCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  compactLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  compactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
  compactStats: {
    fontSize: 12,
    marginTop: 4,
  },
  verifiedBadgeSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIconSmall: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Horizontal variant
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  horizontalLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  horizontalContent: {
    flex: 1,
  },
  horizontalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  horizontalName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  category: {
    fontSize: 13,
    marginTop: 2,
  },
  horizontalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
  },
  statDot: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Featured variant
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 120,
  },
  featuredOverlay: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -40,
  },
  featuredLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  featuredInfo: {
    flex: 1,
    marginLeft: 16,
    marginTop: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  verifiedBadgeLarge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  featuredStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    opacity: 0.2,
  },
  featuredFollowButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  featuredFollowText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
