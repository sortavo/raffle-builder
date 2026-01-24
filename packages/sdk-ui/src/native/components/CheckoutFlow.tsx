// Checkout Flow Component - Complete checkout experience
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { usePurchase, useAuth, useRaffle } from '@sortavo/sdk/react';
import { useTheme } from '../theme';
import type { CheckoutFlowProps } from '../../types';
import { PurchaseSummary } from './PurchaseSummary';
import { formatCurrency } from '../utils';

type PaymentMethod = 'card' | 'oxxo' | 'transfer';
type CheckoutStep = 'review' | 'payment' | 'confirmation';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Tarjeta de crédito/débito',
    description: 'Visa, Mastercard, AMEX',
    icon: '💳',
    available: true,
  },
  {
    id: 'oxxo',
    name: 'Pago en OXXO',
    description: 'Paga en efectivo en cualquier OXXO',
    icon: '🏪',
    available: true,
  },
  {
    id: 'transfer',
    name: 'Transferencia bancaria',
    description: 'SPEI o transferencia',
    icon: '🏦',
    available: true,
  },
];

export function CheckoutFlow({
  raffleId,
  selectedTicketCount,
  selectedPackageId,
  onSuccess,
  onCancel,
  onError,
  paymentMethods = ['card', 'oxxo'],
  showSteps = true,
  allowCoupon = true,
  style,
  testID,
}: CheckoutFlowProps) {
  const theme = useTheme();
  const { raffle } = useRaffle(raffleId);
  const { user, isAuthenticated } = useAuth();
  const { createPurchase, isProcessing, totalAmount } = usePurchase();

  const [step, setStep] = useState<CheckoutStep>('review');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const selectedPackage = raffle?.packages.find((p) => p.id === selectedPackageId);
  const ticketCount = selectedTicketCount || selectedPackage?.quantity || 0;
  const baseAmount = selectedPackage?.price || (raffle?.ticketPrice || 0) * ticketCount;

  // Calculate discount
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? baseAmount * (appliedCoupon.discount / 100)
      : appliedCoupon.discount
    : 0;

  const finalAmount = Math.max(0, baseAmount - discountAmount);

  // Available payment methods
  const availableMethods = PAYMENT_METHODS.filter((m) => paymentMethods.includes(m.id));

  // Apply coupon
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    // Simulate API call - in real app this would validate against backend
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (couponCode.toUpperCase() === 'DESCUENTO10') {
      setAppliedCoupon({ code: couponCode.toUpperCase(), discount: 10, type: 'percent' });
    } else if (couponCode.toUpperCase() === 'PROMO50') {
      setAppliedCoupon({ code: couponCode.toUpperCase(), discount: 50, type: 'fixed' });
    } else {
      Alert.alert('Cupón inválido', 'El código ingresado no es válido o ha expirado');
    }

    setIsApplyingCoupon(false);
  }, [couponCode]);

  // Remove coupon
  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
  }, []);

  // Proceed to payment
  const handleProceedToPayment = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para continuar');
      return;
    }
    setStep('payment');
  }, [isAuthenticated]);

  // Confirm purchase
  const handleConfirmPurchase = useCallback(async () => {
    if (!acceptedTerms) {
      Alert.alert('Términos requeridos', 'Debes aceptar los términos y condiciones');
      return;
    }

    try {
      const result = await createPurchase();

      if (result.success && 'data' in result && result.data) {
        setStep('confirmation');
        onSuccess?.((result.data as any).id);
      } else {
        const errorMsg = 'error' in result && result.error
          ? (result.error as any).message
          : 'Error al procesar la compra';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      onError?.(error);
    }
  }, [acceptedTerms, createPurchase, onSuccess, onError]);

  if (!raffle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      {/* Steps Indicator */}
      {showSteps && (
        <View style={styles.steps}>
          {(['review', 'payment', 'confirmation'] as CheckoutStep[]).map((s, i) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === s || i < ['review', 'payment', 'confirmation'].indexOf(step)
                        ? theme.colors.primary
                        : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    {
                      color:
                        step === s || i < ['review', 'payment', 'confirmation'].indexOf(step)
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {step === 'confirmation' && i < 2 ? '✓' : i + 1}
                </Text>
              </View>
              {i < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        i < ['review', 'payment', 'confirmation'].indexOf(step)
                          ? theme.colors.primary
                          : theme.colors.surface,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step: Review */}
        {step === 'review' && (
          <>
            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Resumen del pedido
              </Text>
              <View
                style={[
                  styles.orderCard,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
                ]}
              >
                <View style={styles.orderRow}>
                  <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
                    Rifa
                  </Text>
                  <Text
                    style={[styles.orderValue, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {raffle.title}
                  </Text>
                </View>
                <View style={styles.orderRow}>
                  <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
                    Boletos
                  </Text>
                  <Text style={[styles.orderValue, { color: theme.colors.text }]}>
                    {ticketCount}
                  </Text>
                </View>
                <View style={styles.orderRow}>
                  <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
                    Subtotal
                  </Text>
                  <Text style={[styles.orderValue, { color: theme.colors.text }]}>
                    {formatCurrency(baseAmount, raffle.currency)}
                  </Text>
                </View>
                {appliedCoupon && (
                  <View style={styles.orderRow}>
                    <Text style={[styles.orderLabel, { color: theme.colors.success }]}>
                      Descuento ({appliedCoupon.code})
                    </Text>
                    <Text style={[styles.orderValue, { color: theme.colors.success }]}>
                      -{formatCurrency(discountAmount, raffle.currency)}
                    </Text>
                  </View>
                )}
                <View style={[styles.orderRow, styles.totalRow]}>
                  <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                    {formatCurrency(finalAmount, raffle.currency)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Coupon */}
            {allowCoupon && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Código de descuento
                </Text>
                {appliedCoupon ? (
                  <View
                    style={[
                      styles.appliedCoupon,
                      {
                        backgroundColor: theme.colors.success + '20',
                        borderRadius: theme.borderRadius.md,
                      },
                    ]}
                  >
                    <View>
                      <Text style={[styles.appliedCouponCode, { color: theme.colors.success }]}>
                        {appliedCoupon.code}
                      </Text>
                      <Text style={[styles.appliedCouponDiscount, { color: theme.colors.success }]}>
                        {appliedCoupon.type === 'percent'
                          ? `${appliedCoupon.discount}% de descuento`
                          : `${formatCurrency(appliedCoupon.discount, raffle.currency)} de descuento`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleRemoveCoupon}>
                      <Text style={[styles.removeCoupon, { color: theme.colors.error }]}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.couponInput}>
                    <TextInput
                      style={[
                        styles.couponField,
                        {
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text,
                          borderRadius: theme.borderRadius.md,
                        },
                      ]}
                      placeholder="Ingresa tu código"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={couponCode}
                      onChangeText={setCouponCode}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[
                        styles.couponButton,
                        {
                          backgroundColor: theme.colors.primary,
                          borderRadius: theme.borderRadius.md,
                        },
                      ]}
                      onPress={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                    >
                      {isApplyingCoupon ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.couponButtonText}>Aplicar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* User Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Datos del comprador
              </Text>
              {isAuthenticated && user ? (
                <View
                  style={[
                    styles.userCard,
                    { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
                  ]}
                >
                  <Text style={[styles.userName, { color: theme.colors.text }]}>
                    {user.name || 'Usuario'}
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                    {user.email}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.loginPrompt,
                    { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
                  ]}
                >
                  <Text style={[styles.loginPromptText, { color: theme.colors.textSecondary }]}>
                    Inicia sesión para continuar con la compra
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Step: Payment */}
        {step === 'payment' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Método de pago
              </Text>
              {availableMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentOption,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor:
                        paymentMethod === method.id
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                    },
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentName, { color: theme.colors.text }]}>
                      {method.name}
                    </Text>
                    <Text style={[styles.paymentDesc, { color: theme.colors.textSecondary }]}>
                      {method.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor:
                          paymentMethod === method.id
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {paymentMethod === method.id && (
                      <View
                        style={[styles.radioInner, { backgroundColor: theme.colors.primary }]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Terms */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: acceptedTerms
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                      backgroundColor: acceptedTerms ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                  Acepto los{' '}
                  <Text style={{ color: theme.colors.primary }}>Términos y Condiciones</Text> y la{' '}
                  <Text style={{ color: theme.colors.primary }}>Política de Privacidad</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step: Confirmation */}
        {step === 'confirmation' && (
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationIcon}>
              <Text style={styles.confirmationEmoji}>✅</Text>
            </View>
            <Text style={[styles.confirmationTitle, { color: theme.colors.text }]}>
              ¡Compra exitosa!
            </Text>
            <Text style={[styles.confirmationSubtitle, { color: theme.colors.textSecondary }]}>
              Tus boletos han sido registrados correctamente
            </Text>
            <View
              style={[
                styles.confirmationDetails,
                { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
              ]}
            >
              <Text style={[styles.confirmationLabel, { color: theme.colors.textSecondary }]}>
                Boletos comprados
              </Text>
              <Text style={[styles.confirmationValue, { color: theme.colors.text }]}>
                {ticketCount}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer Actions */}
      {step !== 'confirmation' && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.surface,
            },
          ]}
        >
          {step === 'review' && (
            <PurchaseSummary
              ticketCount={ticketCount}
              totalAmount={finalAmount}
              currency={raffle.currency}
              onConfirm={handleProceedToPayment}
              onCancel={onCancel}
              showBreakdown={false}
            />
          )}
          {step === 'payment' && (
            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.colors.surface }]}
                onPress={() => setStep('review')}
              >
                <Text style={[styles.backButtonText, { color: theme.colors.textSecondary }]}>
                  Volver
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: acceptedTerms ? theme.colors.primary : theme.colors.surface,
                  },
                ]}
                onPress={handleConfirmPurchase}
                disabled={!acceptedTerms || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Pagar {formatCurrency(finalAmount, raffle.currency)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  orderCard: {
    padding: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderLabel: {
    fontSize: 14,
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  couponInput: {
    flexDirection: 'row',
    gap: 8,
  },
  couponField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  couponButton: {
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  couponButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedCoupon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  appliedCouponDiscount: {
    fontSize: 12,
    marginTop: 2,
  },
  removeCoupon: {
    fontSize: 14,
    fontWeight: '500',
  },
  userCard: {
    padding: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  loginPrompt: {
    padding: 16,
  },
  loginPromptText: {
    fontSize: 14,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
  },
  paymentIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmationContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  confirmationIcon: {
    marginBottom: 24,
  },
  confirmationEmoji: {
    fontSize: 72,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  confirmationDetails: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  confirmationLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  confirmationValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  footerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
