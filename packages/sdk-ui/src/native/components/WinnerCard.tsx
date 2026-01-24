// WinnerCard - Display a winner announcement
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme';
import type { WinnerAnnouncement } from '@sortavo/sdk';

export interface WinnerCardProps {
  winner: WinnerAnnouncement;
  variant?: 'compact' | 'featured' | 'minimal';
  onPress?: (winner: WinnerAnnouncement) => void;
  onOrganizerPress?: (slug: string) => void;
  showOrganizer?: boolean;
}

export function WinnerCard({
  winner,
  variant = 'compact',
  onPress,
  onOrganizerPress,
  showOrganizer = true,
}: WinnerCardProps) {
  const theme = useTheme();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Hace un momento';
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const maskName = (name: string) => {
    if (name.length <= 4) return name;
    const words = name.split(' ');
    return words.map(word => {
      if (word.length <= 2) return word;
      return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }).join(' ');
  };

  if (variant === 'minimal') {
    return (
      <TouchableOpacity
        style={[styles.minimalCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onPress?.(winner)}
        activeOpacity={0.7}
      >
        <View style={[styles.minimalBadge, { backgroundColor: theme.colors.warning }]}>
          <Text style={styles.minimalBadgeText}>🏆</Text>
        </View>
        <View style={styles.minimalContent}>
          <Text style={[styles.minimalTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {maskName(winner.winnerName)}
          </Text>
          <Text style={[styles.minimalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            Ganó #{winner.ticketNumber}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={[styles.featuredCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onPress?.(winner)}
        activeOpacity={0.7}
      >
        <View style={styles.featuredHeader}>
          <View style={[styles.trophyCircle, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.trophyIcon}>🏆</Text>
          </View>
          <View style={styles.confetti}>
            <Text style={styles.confettiText}>🎉</Text>
            <Text style={styles.confettiText}>✨</Text>
            <Text style={styles.confettiText}>🎊</Text>
          </View>
        </View>

        <View style={styles.featuredWinnerInfo}>
          {winner.winnerAvatar ? (
            <Image source={{ uri: winner.winnerAvatar }} style={styles.featuredAvatar} />
          ) : (
            <View style={[styles.featuredAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.featuredAvatarText}>
                {winner.winnerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.featuredWinnerName, { color: theme.colors.text }]}>
            {maskName(winner.winnerName)}
          </Text>
          <View style={[styles.ticketBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.ticketBadgeText}>Boleto #{winner.ticketNumber}</Text>
          </View>
        </View>

        <View style={styles.featuredPrize}>
          <Text style={[styles.wonLabel, { color: theme.colors.textSecondary }]}>Ganó</Text>
          <Text style={[styles.prizeTitle, { color: theme.colors.text }]}>
            {winner.prizeTitle}
          </Text>
        </View>

        <View style={styles.featuredFooter}>
          <Text style={[styles.raffleTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {winner.raffleTitle}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatDate(winner.announcedAt)}
          </Text>
        </View>

        {showOrganizer && winner.organizationName && (
          <TouchableOpacity
            style={styles.organizerLink}
            onPress={() => onOrganizerPress?.(winner.organizationSlug)}
          >
            <Text style={[styles.organizerText, { color: theme.colors.primary }]}>
              Por {winner.organizationName} →
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
      onPress={() => onPress?.(winner)}
      activeOpacity={0.7}
    >
      <View style={styles.compactLeft}>
        <View style={[styles.trophyBadge, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.trophyEmoji}>🏆</Text>
        </View>
        {winner.winnerAvatar ? (
          <Image source={{ uri: winner.winnerAvatar }} style={styles.compactAvatar} />
        ) : (
          <View style={[styles.compactAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.compactAvatarText}>
              {winner.winnerName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.compactContent}>
        <View style={styles.compactHeader}>
          <Text style={[styles.compactWinnerName, { color: theme.colors.text }]} numberOfLines={1}>
            {maskName(winner.winnerName)}
          </Text>
          <Text style={[styles.compactTimestamp, { color: theme.colors.textSecondary }]}>
            {formatDate(winner.announcedAt)}
          </Text>
        </View>
        <Text style={[styles.compactPrize, { color: theme.colors.text }]} numberOfLines={1}>
          {winner.prizeTitle}
        </Text>
        <View style={styles.compactMeta}>
          <View style={[styles.ticketPill, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.ticketPillText, { color: theme.colors.primary }]}>
              #{winner.ticketNumber}
            </Text>
          </View>
          {showOrganizer && (
            <Text style={[styles.compactOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              • {winner.organizationName}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Minimal variant
  minimalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  minimalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  minimalBadgeText: {
    fontSize: 14,
  },
  minimalContent: {
    flex: 1,
  },
  minimalTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  minimalSubtitle: {
    fontSize: 11,
  },

  // Compact variant
  compactCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  compactLeft: {
    position: 'relative',
    marginRight: 12,
  },
  trophyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  trophyEmoji: {
    fontSize: 10,
  },
  compactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  compactAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactWinnerName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  compactTimestamp: {
    fontSize: 12,
  },
  compactPrize: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  ticketPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ticketPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactOrganizer: {
    fontSize: 12,
    flex: 1,
  },

  // Featured variant
  featuredCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    fontSize: 32,
  },
  confetti: {
    position: 'absolute',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  confettiText: {
    fontSize: 24,
  },
  featuredWinnerInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  featuredAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featuredAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  featuredWinnerName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  ticketBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredPrize: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  wonLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  prizeTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raffleTitle: {
    fontSize: 13,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  organizerLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
