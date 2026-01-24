// Progress Bar Component for React Native
import React from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';
import { useTheme } from '../theme';
import type { ProgressBarProps } from '../../types';

export function ProgressBar({
  sold,
  total,
  showLabel = false,
  showPercentage = false,
  color,
  backgroundColor,
  style,
  testID,
}: ProgressBarProps) {
  const theme = useTheme();

  const percentage = total > 0 ? Math.round((sold / total) * 100) : 0;
  const progressWidth: DimensionValue = `${Math.min(percentage, 100)}%` as DimensionValue;

  const barColor = color || theme.colors.primary;
  const bgColor = backgroundColor || theme.colors.surface;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {(showLabel || showPercentage) && (
        <View style={styles.labelContainer}>
          {showLabel && (
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {sold.toLocaleString()} / {total.toLocaleString()} vendidos
            </Text>
          )}
          {showPercentage && (
            <Text style={[styles.percentage, { color: theme.colors.text }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}

      <View style={[styles.track, { backgroundColor: bgColor }]}>
        <View
          style={[
            styles.progress,
            { width: progressWidth, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
});
