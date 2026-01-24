// Purchase Summary Component for React Native
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import type { PurchaseSummaryProps } from '../../types';
import { formatCurrency } from '../utils';

export function PurchaseSummary({
  ticketCount,
  totalAmount,
  currency,
  onConfirm,
  onCancel,
  isLoading = false,
  showBreakdown = true,
  style,
  testID,
}: PurchaseSummaryProps) {
  const theme = useTheme();

  const pricePerTicket = ticketCount > 0 ? totalAmount / ticketCount : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Resumen de compra
        </Text>

        {showBreakdown && (
          <View style={[styles.breakdown, { marginTop: theme.spacing.md }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                Boletos ({ticketCount})
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>
                {formatCurrency(pricePerTicket, currency)} c/u
              </Text>
            </View>
          </View>
        )}

        {/* Total */}
        <View
          style={[
            styles.totalContainer,
            {
              borderTopColor: theme.colors.surface,
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.md,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
            Total a pagar
          </Text>
          <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
            {formatCurrency(totalAmount, currency)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            disabled={isLoading}
            style={[
              styles.button,
              styles.cancelButton,
              {
                borderColor: theme.colors.textSecondary,
                borderRadius: theme.borderRadius.lg,
              },
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onConfirm}
          disabled={isLoading || ticketCount === 0}
          style={[
            styles.button,
            styles.confirmButton,
            {
              backgroundColor: isLoading || ticketCount === 0
                ? theme.colors.surface
                : theme.colors.primary,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirmar compra
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Security Note */}
      <View style={[styles.securityNote, { marginTop: theme.spacing.md }]}>
        <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
          🔒 Pago seguro procesado por Stripe
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryContainer: {},
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdown: {},
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityNote: {
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
  },
});
