// Ticket Selector Component for React Native
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import type { TicketSelectorProps } from '../../types';
import type { TicketPackage } from '@sortavo/sdk';
import { formatCurrency } from '../utils';

export function TicketSelector({
  packages,
  onPackageSelect,
  selectedPackage,
  showBestValue = true,
  showDiscount = true,
  style,
  testID,
}: TicketSelectorProps) {
  const theme = useTheme();

  const sortedPackages = [...packages].sort((a, b) => a.quantity - b.quantity);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {sortedPackages.map((pkg) => {
        const isSelected = selectedPackage?.id === pkg.id;
        const hasDiscount = pkg.discount && pkg.discount > 0;

        return (
          <TouchableOpacity
            key={pkg.id}
            onPress={() => onPackageSelect?.(pkg)}
            activeOpacity={0.7}
            style={[
              styles.packageCard,
              {
                backgroundColor: theme.colors.background,
                borderColor: isSelected
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
              },
              isSelected && styles.packageCardSelected,
            ]}
          >
            {/* Best Value Badge */}
            {showBestValue && pkg.isBestValue && (
              <View
                style={[
                  styles.bestValueBadge,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text style={styles.bestValueText}>MEJOR VALOR</Text>
              </View>
            )}

            {/* Package Content */}
            <View style={styles.packageContent}>
              <View style={styles.packageInfo}>
                <Text style={[styles.quantity, { color: theme.colors.text }]}>
                  {pkg.quantity} {pkg.quantity === 1 ? 'boleto' : 'boletos'}
                </Text>

                {pkg.label && (
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {pkg.label}
                  </Text>
                )}
              </View>

              <View style={styles.priceContainer}>
                {showDiscount && hasDiscount && pkg.originalPrice && (
                  <Text
                    style={[
                      styles.originalPrice,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {formatCurrency(pkg.originalPrice, 'MXN')}
                  </Text>
                )}

                <Text style={[styles.price, { color: theme.colors.primary }]}>
                  {formatCurrency(pkg.price, 'MXN')}
                </Text>

                {showDiscount && hasDiscount && (
                  <View
                    style={[
                      styles.discountBadge,
                      { backgroundColor: theme.colors.success + '20' },
                    ]}
                  >
                    <Text style={[styles.discountText, { color: theme.colors.success }]}>
                      -{pkg.discount}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Selection Indicator */}
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardSelected: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  packageContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageInfo: {},
  quantity: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
