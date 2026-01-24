// Organizer Card Component - Display organizer/tenant info
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../theme';

interface OrganizerInfo {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  verified?: boolean;
  totalRaffles?: number;
  totalParticipants?: number;
  website?: string;
  phone?: string;
  email?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
}

export interface OrganizerCardProps {
  organizer: OrganizerInfo;
  variant?: 'compact' | 'full' | 'inline';
  showStats?: boolean;
  showContact?: boolean;
  showSocial?: boolean;
  onPress?: () => void;
  style?: any;
  testID?: string;
}

export function OrganizerCard({
  organizer,
  variant = 'compact',
  showStats = true,
  showContact = false,
  showSocial = false,
  onPress,
  style,
  testID,
}: OrganizerCardProps) {
  const theme = useTheme();

  const isInline = variant === 'inline';
  const isFull = variant === 'full';

  const handleWebsite = () => {
    if (organizer.website) {
      Linking.openURL(organizer.website);
    }
  };

  const handlePhone = () => {
    if (organizer.phone) {
      Linking.openURL(`tel:${organizer.phone}`);
    }
  };

  const handleEmail = () => {
    if (organizer.email) {
      Linking.openURL(`mailto:${organizer.email}`);
    }
  };

  const handleWhatsApp = () => {
    if (organizer.socialLinks?.whatsapp) {
      Linking.openURL(`https://wa.me/${organizer.socialLinks.whatsapp}`);
    }
  };

  const handleSocial = (platform: string, url: string) => {
    Linking.openURL(url);
  };

  if (isInline) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
        style={[styles.inlineContainer, style]}
        testID={testID}
      >
        {organizer.logo ? (
          <Image source={{ uri: organizer.logo }} style={styles.inlineLogo} />
        ) : (
          <View
            style={[styles.inlineLogoPlaceholder, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.inlineLogoText}>
              {organizer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.inlineName, { color: theme.colors.text }]}>
          {organizer.name}
        </Text>
        {organizer.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
        },
        isFull && styles.containerFull,
        style,
      ]}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        {organizer.logo ? (
          <Image
            source={{ uri: organizer.logo }}
            style={[styles.logo, isFull && styles.logoFull]}
          />
        ) : (
          <View
            style={[
              styles.logoPlaceholder,
              { backgroundColor: theme.colors.primary },
              isFull && styles.logoFull,
            ]}
          >
            <Text style={[styles.logoText, isFull && styles.logoTextFull]}>
              {organizer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {organizer.name}
            </Text>
            {organizer.verified && (
              <View style={[styles.verifiedBadgeLarge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.verifiedIconLarge}>✓</Text>
              </View>
            )}
          </View>

          {organizer.description && isFull && (
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {organizer.description}
            </Text>
          )}
        </View>
      </View>

      {/* Stats */}
      {showStats && (organizer.totalRaffles || organizer.totalParticipants) && (
        <View style={[styles.stats, { borderTopColor: theme.colors.surface }]}>
          {organizer.totalRaffles !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {organizer.totalRaffles}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Rifas
              </Text>
            </View>
          )}
          {organizer.totalParticipants !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {organizer.totalParticipants.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Participantes
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Contact */}
      {showContact && isFull && (
        <View style={styles.contact}>
          {organizer.website && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleWebsite}
            >
              <Text style={styles.contactIcon}>🌐</Text>
              <Text style={[styles.contactText, { color: theme.colors.text }]}>
                Sitio web
              </Text>
            </TouchableOpacity>
          )}
          {organizer.phone && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: theme.colors.surface }]}
              onPress={handlePhone}
            >
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={[styles.contactText, { color: theme.colors.text }]}>
                Llamar
              </Text>
            </TouchableOpacity>
          )}
          {organizer.socialLinks?.whatsapp && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsApp}
            >
              <Text style={styles.contactIcon}>💬</Text>
              <Text style={[styles.contactText, { color: '#FFFFFF' }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Social Links */}
      {showSocial && isFull && organizer.socialLinks && (
        <View style={styles.social}>
          {organizer.socialLinks.facebook && (
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#1877F2' }]}
              onPress={() => handleSocial('facebook', organizer.socialLinks!.facebook!)}
            >
              <Text style={styles.socialIcon}>f</Text>
            </TouchableOpacity>
          )}
          {organizer.socialLinks.instagram && (
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#E4405F' }]}
              onPress={() => handleSocial('instagram', organizer.socialLinks!.instagram!)}
            >
              <Text style={styles.socialIcon}>📷</Text>
            </TouchableOpacity>
          )}
          {organizer.socialLinks.twitter && (
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}
              onPress={() => handleSocial('twitter', organizer.socialLinks!.twitter!)}
            >
              <Text style={styles.socialIcon}>𝕏</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  containerFull: {
    padding: 20,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  inlineLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inlineName: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  logoFull: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoTextFull: {
    fontSize: 28,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  verifiedBadgeLarge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIconLarge: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  contact: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  contactIcon: {
    fontSize: 14,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
  },
  social: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
