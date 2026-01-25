// Winners Section Component for Home Screen
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WinnersList } from '@sortavo/sdk-ui/native';
import type { WinnerAnnouncement } from '@sortavo/sdk';

interface WinnersSectionProps {
  /** List of recent winners to display */
  winners: WinnerAnnouncement[];
  /** Whether the winners are currently loading */
  isLoading: boolean;
  /** Callback when a winner item is pressed */
  onWinnerPress: (winner: WinnerAnnouncement) => void;
  /** Callback when an organizer name is pressed */
  onOrganizerPress: (slug: string) => void;
  /** Maximum number of winners to show (default: 5) */
  maxItems?: number;
}

/**
 * Displays a horizontal list of recent raffle winners
 * Used on the home screen to showcase community activity
 */
function WinnersSectionComponent({
  winners,
  isLoading,
  onWinnerPress,
  onOrganizerPress,
  maxItems = 5,
}: WinnersSectionProps) {
  // Don't render if no winners and not loading
  if (winners.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.winnersSection}>
      <WinnersList
        winners={winners}
        isLoading={isLoading}
        variant="horizontal"
        title="Ganadores Recientes"
        showTitle
        maxItems={maxItems}
        onWinnerPress={onWinnerPress}
        onOrganizerPress={onOrganizerPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  winnersSection: {
    marginTop: 8,
  },
});

export const WinnersSection = memo(WinnersSectionComponent);
