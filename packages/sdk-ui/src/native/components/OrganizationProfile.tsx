// OrganizationProfile - Full organization profile/detail view
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import type { Organization, Raffle } from '@sortavo/sdk';

export interface OrganizationProfileProps {
  organization: Organization | null;
  raffles?: Raffle[];
  isLoading?: boolean;
  isFollowing?: boolean;
  isFollowProcessing?: boolean;
  onFollowPress?: () => void;
  onRafflePress?: (raffle: Raffle) => void;
  onSharePress?: () => void;
  RaffleListComponent?: React.ReactNode;
}

export function OrganizationProfile({
  organization,
  raffles = [],
  isLoading = false,
  isFollowing = false,
  isFollowProcessing = false,
  onFollowPress,
  onRafflePress,
  onSharePress,
  RaffleListComponent,
}: OrganizationProfileProps) {
  const theme = useTheme();

  if (isLoading || !organization) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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

  const openSocialLink = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(console.error);
    }
  };

  const socialLinks = organization.socialLinks || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {organization.coverImageUrl ? (
          <Image
            source={{ uri: organization.coverImageUrl }}
            style={styles.coverImage}
          />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: theme.colors.primary }]} />
        )}
        <View style={styles.coverOverlay} />
      </View>

      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: organization.logoUrl || 'https://via.placeholder.com/100' }}
            style={styles.logo}
          />
          {organization.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.verifiedIcon}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {organization.name}
          </Text>
          {organization.category && (
            <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                {getCategoryLabel(organization.category)}
              </Text>
            </View>
          )}
          {organization.location && (
            <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
              📍 {organization.location}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing
                ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderWidth: 2 }
                : { backgroundColor: theme.colors.primary }
            ]}
            onPress={onFollowPress}
            disabled={isFollowProcessing}
          >
            {isFollowProcessing ? (
              <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary : '#FFFFFF'} />
            ) : (
              <Text style={[
                styles.followButtonText,
                { color: isFollowing ? theme.colors.primary : '#FFFFFF' }
              ]}>
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
          {onSharePress && (
            <TouchableOpacity
              style={[styles.shareButton, { borderColor: theme.colors.textSecondary }]}
              onPress={onSharePress}
            >
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
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
        {organization.stats.rating !== undefined && (
          <>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                ⭐ {organization.stats.rating.toFixed(1)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                ({organization.stats.reviewCount || 0})
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Description */}
      {organization.description && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Acerca de
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {organization.description}
          </Text>
        </View>
      )}

      {/* Social Links */}
      {Object.keys(socialLinks).length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Redes Sociales
          </Text>
          <View style={styles.socialLinks}>
            {socialLinks.website && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: theme.colors.primary + '15' }]}
                onPress={() => openSocialLink(socialLinks.website)}
              >
                <Text style={styles.socialIcon}>🌐</Text>
                <Text style={[styles.socialText, { color: theme.colors.primary }]}>Web</Text>
              </TouchableOpacity>
            )}
            {socialLinks.instagram && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: '#E4405F15' }]}
                onPress={() => openSocialLink(socialLinks.instagram)}
              >
                <Text style={styles.socialIcon}>📸</Text>
                <Text style={[styles.socialText, { color: '#E4405F' }]}>Instagram</Text>
              </TouchableOpacity>
            )}
            {socialLinks.facebook && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: '#1877F215' }]}
                onPress={() => openSocialLink(socialLinks.facebook)}
              >
                <Text style={styles.socialIcon}>📘</Text>
                <Text style={[styles.socialText, { color: '#1877F2' }]}>Facebook</Text>
              </TouchableOpacity>
            )}
            {socialLinks.twitter && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: '#1DA1F215' }]}
                onPress={() => openSocialLink(socialLinks.twitter)}
              >
                <Text style={styles.socialIcon}>🐦</Text>
                <Text style={[styles.socialText, { color: '#1DA1F2' }]}>Twitter</Text>
              </TouchableOpacity>
            )}
            {socialLinks.tiktok && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: '#00000015' }]}
                onPress={() => openSocialLink(socialLinks.tiktok)}
              >
                <Text style={styles.socialIcon}>🎵</Text>
                <Text style={[styles.socialText, { color: '#000000' }]}>TikTok</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Active Raffles Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Sorteos Activos
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeText}>{organization.stats.activeRaffles}</Text>
          </View>
        </View>

        {RaffleListComponent || (
          raffles.length === 0 ? (
            <View style={styles.emptyRaffles}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No hay sorteos activos en este momento
              </Text>
            </View>
          ) : null
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  profileHeader: {
    marginTop: -50,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginTop: -60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  followButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
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
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  socialIcon: {
    fontSize: 16,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyRaffles: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});
