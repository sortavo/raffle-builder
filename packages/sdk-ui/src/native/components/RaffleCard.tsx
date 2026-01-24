// Raffle Card Component for React Native
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Raffle } from '@sortavo/sdk';
import { useTheme } from '../theme';
import type { RaffleCardProps } from '../../types';
import { ProgressBar } from './ProgressBar';
import { Countdown } from './Countdown';
import { formatCurrency } from '../utils';

export function RaffleCard({
  raffle,
  onPress,
  variant = 'default',
  showProgress = true,
  showCountdown = true,
  showPrizes = false,
  style,
  testID,
}: RaffleCardProps) {
  const theme = useTheme();

  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
        },
        isFeatured && styles.featuredContainer,
        style,
      ]}
    >
      {/* Image */}
      <View style={[styles.imageContainer, isCompact && styles.imageContainerCompact]}>
        {raffle.imageUrl ? (
          <Image
            source={{ uri: raffle.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={{ color: theme.colors.textSecondary }}>🎟️</Text>
          </View>
        )}

        {/* Status Badge */}
        {raffle.status !== 'active' && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  raffle.status === 'completed'
                    ? theme.colors.success
                    : theme.colors.warning,
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {raffle.status === 'completed' ? 'Finalizada' : 'Próximamente'}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { padding: theme.spacing.md }]}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text },
            isFeatured && styles.titleFeatured,
          ]}
          numberOfLines={isCompact ? 1 : 2}
        >
          {raffle.title}
        </Text>

        {!isCompact && raffle.description && (
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {raffle.description}
          </Text>
        )}

        {/* Prize Preview */}
        {showPrizes && raffle.prizes.length > 0 && (
          <View style={[styles.prizeContainer, { marginTop: theme.spacing.sm }]}>
            <Text style={[styles.prizeLabel, { color: theme.colors.textSecondary }]}>
              Premio Principal:
            </Text>
            <Text style={[styles.prizeTitle, { color: theme.colors.text }]}>
              {raffle.prizes[0].title}
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={[styles.priceContainer, { marginTop: theme.spacing.sm }]}>
          <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
            Boleto:
          </Text>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {formatCurrency(raffle.ticketPrice, raffle.currency)}
          </Text>
        </View>

        {/* Progress */}
        {showProgress && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <ProgressBar
              sold={raffle.soldTickets}
              total={raffle.totalTickets}
              showLabel
              showPercentage
            />
          </View>
        )}

        {/* Countdown */}
        {showCountdown && raffle.status === 'active' && raffle.endDate && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Countdown targetDate={raffle.endDate} variant="compact" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredContainer: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  imageContainerCompact: {
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {},
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  titleFeatured: {
    fontSize: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  prizeContainer: {},
  prizeLabel: {
    fontSize: 12,
  },
  prizeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontSize: 14,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
});
