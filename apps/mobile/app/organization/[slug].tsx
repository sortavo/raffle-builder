// Organization Profile Screen
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  useOrganizationBySlug,
  useOrganizationRaffles,
  useFollowOrganization,
  useAuth,
} from '@sortavo/sdk/react';
import {
  OrganizationProfile,
  RaffleList,
  EmptyState,
  FollowButton,
} from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';
import type { Raffle, Organization } from '@sortavo/sdk';

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

export default function OrganizationScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();

  const { organization, isLoading, error } = useOrganizationBySlug(slug || null);
  const { raffles, isLoading: rafflesLoading } = useOrganizationRaffles(
    organization?.id || null,
    { status: 'active' }
  );
  const {
    isFollowing,
    setIsFollowing,
    toggle: toggleFollow,
    isProcessing: followProcessing,
  } = useFollowOrganization(organization?.id || '');

  // Sync follow state from organization data
  React.useEffect(() => {
    if (organization?.isFollowing !== undefined) {
      setIsFollowing(organization.isFollowing);
    }
  }, [organization?.isFollowing, setIsFollowing]);

  const handleRafflePress = useCallback((raffle: Raffle) => {
    router.push(`/raffle/${raffle.id}` as any);
  }, [router]);

  const handleFollowPress = useCallback(async () => {
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }
    await toggleFollow();
  }, [user, toggleFollow, router]);

  const openSocialLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el enlace. Por favor intenta de nuevo.');
    }
  }, []);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Cargando organizador...</Text>
        </View>
      </>
    );
  }

  if (error || !organization) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error', headerShown: true }} />
        <EmptyState
          variant="error"
          title="Organizador no encontrado"
          subtitle="No pudimos encontrar este organizador"
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: organization.name,
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleFollowPress}
              disabled={followProcessing}
              style={styles.headerFollowButton}
              accessibilityLabel={isFollowing ? `Dejar de seguir a ${organization.name}` : `Seguir a ${organization.name}`}
              accessibilityRole="button"
            >
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={24}
                color={isFollowing ? '#EF4444' : '#111827'}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Organization Header */}
        <OrganizationProfile
          organization={organization}
          onFollowPress={handleFollowPress}
          isFollowing={isFollowing}
          isFollowProcessing={followProcessing}
        />

        {/* Social Links */}
        {organization.socialLinks && Object.keys(organization.socialLinks).length > 0 && (
          <View style={styles.socialSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Redes Sociales</Text>
            <View style={styles.socialLinks}>
              {organization.socialLinks.website && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openSocialLink(organization.socialLinks!.website!)}
                  accessibilityLabel={`Visitar sitio web de ${organization.name}`}
                  accessibilityRole="link"
                >
                  <Ionicons name="globe-outline" size={20} color="#6B7280" />
                  <Text style={styles.socialText}>Sitio web</Text>
                </TouchableOpacity>
              )}
              {organization.socialLinks.instagram && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openSocialLink(`https://instagram.com/${organization.socialLinks!.instagram}`)}
                  accessibilityLabel={`Ir al Instagram de ${organization.name}`}
                  accessibilityRole="link"
                >
                  <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                  <Text style={styles.socialText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {organization.socialLinks.facebook && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openSocialLink(`https://facebook.com/${organization.socialLinks!.facebook}`)}
                  accessibilityLabel={`Ir al Facebook de ${organization.name}`}
                  accessibilityRole="link"
                >
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                  <Text style={styles.socialText}>Facebook</Text>
                </TouchableOpacity>
              )}
              {organization.socialLinks.twitter && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openSocialLink(`https://twitter.com/${organization.socialLinks!.twitter}`)}
                  accessibilityLabel={`Ir al Twitter de ${organization.name}`}
                  accessibilityRole="link"
                >
                  <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                  <Text style={styles.socialText}>Twitter</Text>
                </TouchableOpacity>
              )}
              {organization.socialLinks.tiktok && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openSocialLink(`https://tiktok.com/@${organization.socialLinks!.tiktok}`)}
                  accessibilityLabel={`Ir al TikTok de ${organization.name}`}
                  accessibilityRole="link"
                >
                  <Ionicons name="logo-tiktok" size={20} color="#000000" />
                  <Text style={styles.socialText}>TikTok</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Active Raffles */}
        <View style={styles.rafflesSection}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Sorteos Activos</Text>
          {rafflesLoading ? (
            <ActivityIndicator size="small" color="#6366F1" style={styles.rafflesLoader} />
          ) : raffles.length > 0 ? (
            <View style={styles.rafflesList}>
              {raffles.map((raffle: Raffle) => (
                <TouchableOpacity
                  key={raffle.id}
                  style={styles.raffleCard}
                  onPress={() => handleRafflePress(raffle)}
                  accessibilityLabel={`Ver sorteo ${raffle.title}, ${raffle.soldTickets} de ${raffle.totalTickets} boletos vendidos`}
                  accessibilityRole="button"
                  accessibilityHint="Toca para ver detalles del sorteo"
                >
                  <View style={styles.raffleInfo}>
                    <Text style={styles.raffleTitle} numberOfLines={1}>
                      {raffle.title}
                    </Text>
                    <Text style={styles.rafflePrice}>
                      ${raffle.ticketPrice} {raffle.currency} / boleto
                    </Text>
                    <View style={styles.raffleProgress} accessibilityElementsHidden={true}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.min((raffle.soldTickets / raffle.totalTickets) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.raffleSold}>
                      {raffle.soldTickets} de {raffle.totalTickets} vendidos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRaffles}>
              <Ionicons name="ticket-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>No hay sorteos activos</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  headerFollowButton: {
    marginRight: 8,
    padding: 4,
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    minHeight: MIN_TOUCH_TARGET,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  rafflesSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  rafflesLoader: {
    marginVertical: 24,
  },
  rafflesList: {
    gap: 12,
  },
  raffleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  raffleInfo: {
    flex: 1,
  },
  raffleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  rafflePrice: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 8,
  },
  raffleProgress: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  raffleSold: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyRaffles: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
