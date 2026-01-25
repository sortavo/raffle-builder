// Organizations Section Component for Home Screen
import React, { memo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { OrganizationCard } from '@sortavo/sdk-ui/native';
import type { Organization } from '@sortavo/sdk';
import { Ionicons } from '@expo/vector-icons';

interface OrganizationsSectionProps {
  /** List of organizations to display */
  organizations: Organization[];
  /** Whether the organizations are currently loading */
  isLoading: boolean;
  /** Callback when an organization card is pressed */
  onPress: (organization: Organization) => void;
  /** Callback when "View All" button is pressed */
  onViewAll: () => void;
}

/**
 * Displays a horizontal scrollable section of featured organizations
 * Used on the home screen to showcase verified/popular organizations
 */
function OrganizationsSectionComponent({
  organizations,
  isLoading,
  onPress,
  onViewAll,
}: OrganizationsSectionProps) {
  // Don't render if no organizations and not loading
  if (organizations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Organizadores Destacados</Text>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.orgsScroll}
        >
          {organizations.map((org: Organization) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              variant="compact"
              onPress={onPress}
              showFollowButton={false}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  orgsScroll: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const OrganizationsSection = memo(OrganizationsSectionComponent);
