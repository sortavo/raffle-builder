// Prize List Component - Display raffle prizes
import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme';
import type { PrizeListProps } from '../../types';
import type { Prize } from '@sortavo/sdk';
import { formatCurrency } from '../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.75;

interface PrizeCardProps {
  prize: Prize;
  position: number;
  variant: 'list' | 'carousel' | 'grid';
  showPosition: boolean;
  showValue: boolean;
  currency: string;
  theme: ReturnType<typeof useTheme>;
}

function PrizeCard({
  prize,
  position,
  variant,
  showPosition,
  showValue,
  currency,
  theme,
}: PrizeCardProps) {
  const isCarousel = variant === 'carousel';
  const isGrid = variant === 'grid';
  const isFirst = position === 0;
  const isSecond = position === 1;
  const isThird = position === 2;

  const positionIcon = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `${position + 1}º`;
  const positionColor = isFirst
    ? '#FFD700'
    : isSecond
    ? '#C0C0C0'
    : isThird
    ? '#CD7F32'
    : theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.prizeCard,
        {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
        },
        isCarousel && { width: CAROUSEL_ITEM_WIDTH, marginRight: 16 },
        isGrid && styles.prizeCardGrid,
        isFirst && !isCarousel && styles.prizeCardFirst,
      ]}
    >
      {/* Image */}
      {prize.imageUrl ? (
        <Image
          source={{ uri: prize.imageUrl }}
          style={[
            styles.prizeImage,
            isCarousel && styles.prizeImageCarousel,
            isGrid && styles.prizeImageGrid,
            isFirst && !isCarousel && styles.prizeImageFirst,
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.prizePlaceholder,
            { backgroundColor: theme.colors.surface },
            isCarousel && styles.prizeImageCarousel,
            isGrid && styles.prizeImageGrid,
          ]}
        >
          <Text style={styles.prizePlaceholderIcon}>🎁</Text>
        </View>
      )}

      {/* Position Badge */}
      {showPosition && (
        <View
          style={[
            styles.positionBadge,
            {
              backgroundColor: isFirst || isSecond || isThird ? positionColor : theme.colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.positionText,
              {
                color: isFirst || isSecond || isThird ? '#FFFFFF' : theme.colors.text,
              },
            ]}
          >
            {positionIcon}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={[styles.prizeContent, isGrid && styles.prizeContentGrid]}>
        <Text
          style={[
            styles.prizeTitle,
            { color: theme.colors.text },
            isFirst && !isCarousel && styles.prizeTitleFirst,
          ]}
          numberOfLines={isGrid ? 1 : 2}
        >
          {prize.title}
        </Text>

        {prize.description && !isGrid && (
          <Text
            style={[styles.prizeDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {prize.description}
          </Text>
        )}

        {showValue && prize.value && (
          <View style={styles.prizeValueContainer}>
            <Text style={[styles.prizeValueLabel, { color: theme.colors.textSecondary }]}>
              Valor aprox.
            </Text>
            <Text style={[styles.prizeValue, { color: theme.colors.success }]}>
              {formatCurrency(prize.value, currency)}
            </Text>
          </View>
        )}
      </View>

      {/* First Prize Ribbon */}
      {isFirst && !isCarousel && (
        <View style={[styles.firstRibbon, { backgroundColor: '#FFD700' }]}>
          <Text style={styles.firstRibbonText}>PREMIO MAYOR</Text>
        </View>
      )}
    </View>
  );
}

export function PrizeList({
  prizes,
  variant = 'list',
  showPosition = true,
  showValue = true,
  currency = 'MXN',
  style,
  testID,
}: PrizeListProps) {
  const theme = useTheme();

  // Sort prizes by position
  const sortedPrizes = [...prizes].sort((a, b) => a.position - b.position);

  if (variant === 'carousel') {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <FlatList
          data={sortedPrizes}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item, index }) => (
            <PrizeCard
              prize={item}
              position={index}
              variant="carousel"
              showPosition={showPosition}
              showValue={showValue}
              currency={currency}
              theme={theme}
            />
          )}
          snapToInterval={CAROUSEL_ITEM_WIDTH + 16}
          decelerationRate="fast"
        />
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View style={[styles.container, styles.gridContainer, style]} testID={testID}>
        {sortedPrizes.map((prize, index) => (
          <PrizeCard
            key={prize.id}
            prize={prize}
            position={index}
            variant="grid"
            showPosition={showPosition}
            showValue={showValue}
            currency={currency}
            theme={theme}
          />
        ))}
      </View>
    );
  }

  // List variant
  return (
    <View style={[styles.container, style]} testID={testID}>
      {sortedPrizes.map((prize, index) => (
        <View key={prize.id} style={styles.listItem}>
          <PrizeCard
            prize={prize}
            position={index}
            variant="list"
            showPosition={showPosition}
            showValue={showValue}
            currency={currency}
            theme={theme}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  carouselContent: {
    paddingHorizontal: 4,
  },
  listItem: {
    marginBottom: 12,
  },
  prizeCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  prizeCardGrid: {
    width: '48%',
  },
  prizeCardFirst: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  prizeImage: {
    width: '100%',
    height: 120,
  },
  prizeImageCarousel: {
    height: 160,
  },
  prizeImageGrid: {
    height: 100,
  },
  prizeImageFirst: {
    height: 180,
  },
  prizePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizePlaceholderIcon: {
    fontSize: 40,
  },
  positionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  prizeContent: {
    padding: 16,
  },
  prizeContentGrid: {
    padding: 12,
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  prizeTitleFirst: {
    fontSize: 20,
  },
  prizeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  prizeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  prizeValueLabel: {
    fontSize: 12,
  },
  prizeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  firstRibbon: {
    position: 'absolute',
    top: 16,
    right: -32,
    paddingHorizontal: 40,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
  },
  firstRibbonText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
});
