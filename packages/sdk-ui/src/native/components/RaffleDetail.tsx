// Raffle Detail Component - Full raffle view with all sections
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import { useRaffle, useTenant } from '@sortavo/sdk/react';
import { useTheme } from '../theme';
import type { RaffleDetailProps } from '../../types';
import { ProgressBar } from './ProgressBar';
import { Countdown } from './Countdown';
import { TicketSelector } from './TicketSelector';
import { PrizeList } from './PrizeList';
import { formatCurrency, formatDate } from '../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

export function RaffleDetail({
  raffleId,
  raffleSlug,
  onBuyTickets,
  onShare,
  showHeader = true,
  showPrizes = true,
  showPackages = true,
  showProgress = true,
  showOrganizer = true,
  showRules = true,
  showShareButton = true,
  headerComponent,
  footerComponent,
  style,
  testID,
}: RaffleDetailProps) {
  const theme = useTheme();
  const { raffle, isLoading, error } = useRaffle(raffleId || null);
  const { tenantSlug } = useTenant();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const scrollY = new Animated.Value(0);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!raffle) return;

    if (onShare) {
      onShare();
      return;
    }

    try {
      await Share.share({
        title: raffle.title,
        message: `¡Participa en la rifa "${raffle.title}"! ${raffle.description?.slice(0, 100)}...`,
        url: `https://sortavo.com/t/${tenantSlug}/r/${raffle.slug}`,
      });
    } catch (e) {
      // Ignore
    }
  }, [raffle, tenantSlug, onShare]);

  // Handle buy
  const handleBuy = useCallback(() => {
    if (!selectedPackageId && raffle?.packages.length) {
      // Auto-select first package
      setSelectedPackageId(raffle.packages[0].id);
    }
    onBuyTickets?.();
  }, [selectedPackageId, raffle, onBuyTickets]);

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingSkeleton, { backgroundColor: theme.colors.surface }]} />
        <View style={styles.loadingContent}>
          <View
            style={[
              styles.skeletonTitle,
              { backgroundColor: theme.colors.surface },
            ]}
          />
          <View
            style={[
              styles.skeletonText,
              { backgroundColor: theme.colors.surface },
            ]}
          />
          <View
            style={[
              styles.skeletonText,
              { backgroundColor: theme.colors.surface, width: '60%' },
            ]}
          />
        </View>
      </View>
    );
  }

  if (error || !raffle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
          No encontramos esta rifa
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
          Es posible que haya sido removida o el enlace sea incorrecto
        </Text>
      </View>
    );
  }

  const isActive = raffle.status === 'active';
  const isCompleted = raffle.status === 'completed';
  const selectedPackage = raffle.packages.find((p) => p.id === selectedPackageId);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Header Image */}
        {showHeader && (
          <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
            {raffle.coverImageUrl || raffle.imageUrl ? (
              <Image
                source={{ uri: raffle.coverImageUrl || raffle.imageUrl }}
                style={styles.headerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.headerPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.headerPlaceholderText}>🎟️</Text>
              </View>
            )}
            <View style={styles.headerOverlay} />

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isActive
                    ? theme.colors.success
                    : isCompleted
                    ? theme.colors.textSecondary
                    : theme.colors.warning,
                },
              ]}
            >
              <Text style={styles.statusText}>
                {isActive ? 'Activa' : isCompleted ? 'Finalizada' : 'Próximamente'}
              </Text>
            </View>

            {/* Share Button */}
            {showShareButton && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={handleShare}
              >
                <Text style={styles.shareIcon}>📤</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {headerComponent}

        {/* Content */}
        <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>{raffle.title}</Text>

          {/* Description */}
          {raffle.description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {raffle.description}
            </Text>
          )}

          {/* Countdown */}
          {isActive && raffle.endDate && (
            <View
              style={[
                styles.countdownCard,
                { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
              ]}
            >
              <Text style={[styles.countdownLabel, { color: theme.colors.textSecondary }]}>
                Tiempo restante
              </Text>
              <Countdown targetDate={raffle.endDate} variant="large" />
            </View>
          )}

          {/* Progress */}
          {showProgress && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Progreso de ventas
              </Text>
              <ProgressBar
                sold={raffle.soldTickets}
                total={raffle.totalTickets}
                showLabel
                showPercentage
              />
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatValue, { color: theme.colors.success }]}>
                    {raffle.availableTickets.toLocaleString()}
                  </Text>
                  <Text style={[styles.progressStatLabel, { color: theme.colors.textSecondary }]}>
                    Disponibles
                  </Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatValue, { color: theme.colors.error }]}>
                    {raffle.soldTickets.toLocaleString()}
                  </Text>
                  <Text style={[styles.progressStatLabel, { color: theme.colors.textSecondary }]}>
                    Vendidos
                  </Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressStatValue, { color: theme.colors.text }]}>
                    {raffle.totalTickets.toLocaleString()}
                  </Text>
                  <Text style={[styles.progressStatLabel, { color: theme.colors.textSecondary }]}>
                    Total
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Prizes */}
          {showPrizes && raffle.prizes.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Premios</Text>
              <PrizeList
                prizes={raffle.prizes}
                variant="list"
                showPosition
                showValue
                currency={raffle.currency}
              />
            </View>
          )}

          {/* Packages */}
          {showPackages && raffle.packages.length > 0 && isActive && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Elige tu paquete
              </Text>
              <TicketSelector
                packages={raffle.packages}
                selectedPackage={selectedPackage || null}
                onPackageSelect={(pkg) => setSelectedPackageId(pkg.id)}
                showBestValue
                showDiscount
              />
            </View>
          )}

          {/* Rules */}
          {showRules && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Información importante
              </Text>
              <View style={[styles.rulesCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleIcon}>📅</Text>
                  <View style={styles.ruleContent}>
                    <Text style={[styles.ruleLabel, { color: theme.colors.textSecondary }]}>
                      Fecha del sorteo
                    </Text>
                    <Text style={[styles.ruleValue, { color: theme.colors.text }]}>
                      {raffle.drawDate
                        ? formatDate(raffle.drawDate, { dateStyle: 'long' })
                        : 'Por definir'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleIcon}>💰</Text>
                  <View style={styles.ruleContent}>
                    <Text style={[styles.ruleLabel, { color: theme.colors.textSecondary }]}>
                      Precio por boleto
                    </Text>
                    <Text style={[styles.ruleValue, { color: theme.colors.text }]}>
                      {formatCurrency(raffle.ticketPrice, raffle.currency)}
                    </Text>
                  </View>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleIcon}>🎫</Text>
                  <View style={styles.ruleContent}>
                    <Text style={[styles.ruleLabel, { color: theme.colors.textSecondary }]}>
                      Total de boletos
                    </Text>
                    <Text style={[styles.ruleValue, { color: theme.colors.text }]}>
                      {raffle.totalTickets.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {footerComponent}

          {/* Bottom Padding for Footer */}
          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Buy Footer */}
      {isActive && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.footerContent}>
            <View>
              <Text style={[styles.footerLabel, { color: theme.colors.textSecondary }]}>
                {selectedPackage ? `${selectedPackage.quantity} boleto${selectedPackage.quantity > 1 ? 's' : ''}` : 'Precio desde'}
              </Text>
              <Text style={[styles.footerPrice, { color: theme.colors.text }]}>
                {selectedPackage
                  ? formatCurrency(selectedPackage.price, raffle.currency)
                  : formatCurrency(raffle.ticketPrice, raffle.currency)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.buyButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleBuy}
            >
              <Text style={styles.buyButtonText}>
                {selectedPackage ? 'Comprar ahora' : 'Seleccionar boletos'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingSkeleton: {
    height: HEADER_HEIGHT,
  },
  loadingContent: {
    padding: 20,
    gap: 12,
  },
  skeletonTitle: {
    height: 28,
    borderRadius: 6,
    width: '80%',
  },
  skeletonText: {
    height: 16,
    borderRadius: 4,
    width: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholderText: {
    fontSize: 64,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  statusBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 20,
  },
  content: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: 500,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  countdownCard: {
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 13,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  rulesCard: {
    borderRadius: 12,
    padding: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  ruleIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  ruleContent: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: 12,
  },
  ruleValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: 32,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 12,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  buyButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
