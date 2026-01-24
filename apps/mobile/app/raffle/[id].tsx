// Raffle Detail Screen
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRaffle, useAuth } from '@sortavo/sdk/react';
import { ProgressBar, Countdown, TicketSelector, formatCurrency } from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';
import type { TicketPackage } from '@sortavo/sdk';

const { width } = Dimensions.get('window');

export default function RaffleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { raffle, isLoading, error } = useRaffle(id);
  const { isAuthenticated } = useAuth();
  const [selectedPackage, setSelectedPackage] = React.useState<TicketPackage | null>(null);

  const handleBuyPress = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (selectedPackage && raffle) {
      router.push({
        pathname: '/checkout/[raffleId]',
        params: { raffleId: raffle.id, packageId: selectedPackage.id },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error || !raffle) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorMessage}>No pudimos cargar esta rifa</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {raffle.coverImageUrl || raffle.imageUrl ? (
            <Image
              source={{ uri: raffle.coverImageUrl || raffle.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>🎟️</Text>
            </View>
          )}
          <View style={styles.heroOverlay} />
        </View>

        <View style={styles.content}>
          {/* Title & Status */}
          <View style={styles.header}>
            <Text style={styles.title}>{raffle.title}</Text>
            {raffle.status === 'active' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Activa</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {raffle.description && (
            <Text style={styles.description}>{raffle.description}</Text>
          )}

          {/* Countdown */}
          {raffle.status === 'active' && raffle.endDate && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Termina en:</Text>
              <Countdown targetDate={raffle.endDate} variant="large" />
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressContainer}>
            <ProgressBar
              sold={raffle.soldTickets}
              total={raffle.totalTickets}
              showLabel
              showPercentage
            />
          </View>

          {/* Prizes */}
          {raffle.prizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premios</Text>
              {raffle.prizes.map((prize, index) => (
                <View key={prize.id} style={styles.prizeCard}>
                  <View style={styles.prizePosition}>
                    <Text style={styles.prizePositionText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                    </Text>
                  </View>
                  <View style={styles.prizeInfo}>
                    <Text style={styles.prizeTitle}>{prize.title}</Text>
                    {prize.description && (
                      <Text style={styles.prizeDescription}>{prize.description}</Text>
                    )}
                    {prize.value && (
                      <Text style={styles.prizeValue}>
                        Valor: {formatCurrency(prize.value, raffle.currency)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Packages */}
          {raffle.packages.length > 0 && raffle.status === 'active' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecciona tus boletos</Text>
              <TicketSelector
                packages={raffle.packages}
                selectedPackage={selectedPackage}
                onPackageSelect={setSelectedPackage}
                showBestValue
                showDiscount
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Buy Button */}
      {raffle.status === 'active' && (
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View>
              <Text style={styles.footerLabel}>Total:</Text>
              <Text style={styles.footerPrice}>
                {selectedPackage
                  ? formatCurrency(selectedPackage.price, raffle.currency)
                  : formatCurrency(raffle.ticketPrice, raffle.currency)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.buyButton,
                !selectedPackage && styles.buyButtonDisabled,
              ]}
              onPress={handleBuyPress}
              disabled={!selectedPackage}
            >
              <Text style={styles.buyButtonText}>
                Comprar{selectedPackage ? ` ${selectedPackage.quantity} boleto${selectedPackage.quantity > 1 ? 's' : ''}` : ''}
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    width,
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontSize: 64,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 32,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginTop: 12,
  },
  countdownContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 24,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  prizeCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  prizePosition: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prizePositionText: {
    fontSize: 20,
  },
  prizeInfo: {
    flex: 1,
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  prizeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  prizeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  buyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
