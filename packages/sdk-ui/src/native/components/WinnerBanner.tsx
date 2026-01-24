// Winner Banner Component - Celebration display for winners
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useTheme } from '../theme';

interface WinnerInfo {
  ticketNumber: string;
  prizeName: string;
  prizePosition: number;
  prizeImage?: string;
  raffleName: string;
  wonAt: Date;
}

export interface WinnerBannerProps {
  winner: WinnerInfo;
  variant?: 'compact' | 'full' | 'celebration';
  showConfetti?: boolean;
  showShare?: boolean;
  onShare?: () => void;
  onViewPrize?: () => void;
  onDismiss?: () => void;
  style?: any;
  testID?: string;
}

export function WinnerBanner({
  winner,
  variant = 'compact',
  showConfetti = true,
  showShare = true,
  onShare,
  onViewPrize,
  onDismiss,
  style,
  testID,
}: WinnerBannerProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const isCelebration = variant === 'celebration';
  const isFull = variant === 'full';

  // Entry animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Confetti animation
    if (showConfetti && isCelebration) {
      confettiAnims.forEach((anim, i) => {
        const randomX = (Math.random() - 0.5) * 300;
        const randomY = Math.random() * 400 + 200;
        const randomRotate = Math.random() * 720;
        const delay = Math.random() * 500;

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.x, {
              toValue: randomX,
              duration: 2000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim.y, {
              toValue: randomY,
              duration: 2000,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: randomRotate,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 2000,
              delay: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, []);

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    try {
      await Share.share({
        message: `¡Gané ${winner.prizeName} con el boleto #${winner.ticketNumber} en la rifa "${winner.raffleName}"! 🎉`,
      });
    } catch (e) {
      // Ignore
    }
  };

  const positionEmoji =
    winner.prizePosition === 1
      ? '🥇'
      : winner.prizePosition === 2
      ? '🥈'
      : winner.prizePosition === 3
      ? '🥉'
      : '🏆';

  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  if (isCelebration) {
    return (
      <View style={[styles.celebrationContainer, style]} testID={testID}>
        {/* Confetti */}
        {showConfetti &&
          confettiAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.confetti,
                {
                  backgroundColor: confettiColors[i % confettiColors.length],
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    {
                      rotate: anim.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                  opacity: anim.opacity,
                },
              ]}
            />
          ))}

        {/* Main Content */}
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.xl,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Trophy */}
          <View style={styles.trophyContainer}>
            <Text style={styles.trophyEmoji}>🏆</Text>
          </View>

          {/* Title */}
          <Text style={[styles.celebrationTitle, { color: theme.colors.accent }]}>
            ¡FELICIDADES!
          </Text>
          <Text style={[styles.celebrationSubtitle, { color: theme.colors.text }]}>
            ¡Has ganado!
          </Text>

          {/* Prize Info */}
          <View
            style={[
              styles.prizeBox,
              { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
            ]}
          >
            {winner.prizeImage && (
              <Image source={{ uri: winner.prizeImage }} style={styles.prizeImageLarge} />
            )}
            <Text style={styles.prizeEmoji}>{positionEmoji}</Text>
            <Text style={[styles.prizeName, { color: theme.colors.text }]}>
              {winner.prizeName}
            </Text>
          </View>

          {/* Ticket Info */}
          <View style={styles.ticketInfo}>
            <Text style={[styles.ticketLabel, { color: theme.colors.textSecondary }]}>
              Boleto ganador
            </Text>
            <Text style={[styles.ticketNumber, { color: theme.colors.primary }]}>
              #{winner.ticketNumber}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.celebrationActions}>
            {showShare && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>📤 Compartir</Text>
              </TouchableOpacity>
            )}
            {onViewPrize && (
              <TouchableOpacity
                style={[styles.viewButton, { borderColor: theme.colors.primary }]}
                onPress={onViewPrize}
              >
                <Text style={[styles.viewButtonText, { color: theme.colors.primary }]}>
                  Ver premio
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dismiss */}
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={[styles.dismissText, { color: theme.colors.textSecondary }]}>
                Cerrar
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  }

  // Compact / Full variants
  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: '#FFD700',
          borderRadius: theme.borderRadius.lg,
          transform: [{ scale: scaleAnim }],
        },
        isFull && styles.bannerFull,
        style,
      ]}
      testID={testID}
    >
      {/* Icon */}
      <View style={styles.bannerIcon}>
        <Text style={styles.bannerEmoji}>{positionEmoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>¡Ganaste!</Text>
        <Text style={styles.bannerPrize} numberOfLines={1}>
          {winner.prizeName}
        </Text>
        {isFull && (
          <Text style={styles.bannerTicket}>Boleto #{winner.ticketNumber}</Text>
        )}
      </View>

      {/* Share Button */}
      {showShare && (
        <TouchableOpacity style={styles.bannerShare} onPress={handleShare}>
          <Text style={styles.bannerShareIcon}>📤</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Compact/Full Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
  },
  bannerFull: {
    padding: 20,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  bannerPrize: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  bannerTicket: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 4,
  },
  bannerShare: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerShareIcon: {
    fontSize: 18,
  },

  // Celebration
  celebrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confetti: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  trophyContainer: {
    marginBottom: 16,
  },
  trophyEmoji: {
    fontSize: 72,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  celebrationSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  prizeBox: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    marginTop: 24,
  },
  prizeImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  prizeEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  prizeName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  ticketInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  ticketLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ticketNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  celebrationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: 16,
    padding: 8,
  },
  dismissText: {
    fontSize: 14,
  },
});
