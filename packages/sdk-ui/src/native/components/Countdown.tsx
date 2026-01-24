// Countdown Timer Component for React Native
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import type { CountdownProps } from '../../types';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isExpired: false,
  };
}

export function Countdown({
  targetDate,
  onComplete,
  variant = 'default',
  labels = {},
  style,
  testID,
}: CountdownProps) {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));

  const updateTimeLeft = useCallback(() => {
    const newTimeLeft = calculateTimeLeft(targetDate);
    setTimeLeft(newTimeLeft);

    if (newTimeLeft.isExpired && onComplete) {
      onComplete();
    }
  }, [targetDate, onComplete]);

  useEffect(() => {
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [updateTimeLeft]);

  const defaultLabels = {
    days: labels.days ?? 'd',
    hours: labels.hours ?? 'h',
    minutes: labels.minutes ?? 'm',
    seconds: labels.seconds ?? 's',
  };

  if (timeLeft.isExpired) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <Text style={[styles.expiredText, { color: theme.colors.error }]}>
          Tiempo agotado
        </Text>
      </View>
    );
  }

  const isCompact = variant === 'compact';
  const isLarge = variant === 'large';

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        isLarge && styles.containerLarge,
        style,
      ]}
      testID={testID}
    >
      <TimeUnit
        value={timeLeft.days}
        label={defaultLabels.days}
        variant={variant}
        theme={theme}
      />
      <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>:</Text>
      <TimeUnit
        value={timeLeft.hours}
        label={defaultLabels.hours}
        variant={variant}
        theme={theme}
      />
      <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>:</Text>
      <TimeUnit
        value={timeLeft.minutes}
        label={defaultLabels.minutes}
        variant={variant}
        theme={theme}
      />
      <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>:</Text>
      <TimeUnit
        value={timeLeft.seconds}
        label={defaultLabels.seconds}
        variant={variant}
        theme={theme}
      />
    </View>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
  variant: 'default' | 'compact' | 'large';
  theme: ReturnType<typeof useTheme>;
}

function TimeUnit({ value, label, variant, theme }: TimeUnitProps) {
  const isCompact = variant === 'compact';
  const isLarge = variant === 'large';

  const formattedValue = value.toString().padStart(2, '0');

  if (isCompact) {
    return (
      <Text style={[styles.compactValue, { color: theme.colors.text }]}>
        {formattedValue}
        <Text style={[styles.compactLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.unitContainer,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: isLarge ? theme.spacing.md : theme.spacing.sm,
        },
      ]}
    >
      <Text
        style={[
          styles.value,
          isLarge && styles.valueLarge,
          { color: theme.colors.text },
        ]}
      >
        {formattedValue}
      </Text>
      {!isCompact && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  containerCompact: {
    gap: 2,
  },
  containerLarge: {
    gap: 8,
  },
  separator: {
    fontSize: 16,
    fontWeight: '600',
  },
  unitContainer: {
    alignItems: 'center',
    minWidth: 48,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  valueLarge: {
    fontSize: 28,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactLabel: {
    fontSize: 10,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
