// Checkout Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRaffle, usePurchase, useAuth } from '@sortavo/sdk/react';
import { PurchaseSummary, formatCurrency } from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';

export default function CheckoutScreen() {
  const { raffleId, packageId } = useLocalSearchParams<{ raffleId: string; packageId: string }>();
  const router = useRouter();
  const { raffle } = useRaffle(raffleId);
  const { user } = useAuth();
  const { createPurchase, isProcessing } = usePurchase();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo'>('card');

  const selectedPackage = raffle?.packages.find((p) => p.id === packageId);

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;

    try {
      const result = await createPurchase();

      if (result.success) {
        Alert.alert(
          '¡Compra exitosa!',
          'Tus boletos han sido comprados correctamente',
          [
            {
              text: 'Ver mis boletos',
              onPress: () => router.replace('/my-tickets'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error?.message || 'No pudimos procesar la compra');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al procesar la compra');
    }
  };

  if (!raffle || !selectedPackage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del pedido</Text>

          <View style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Rifa</Text>
              <Text style={styles.orderValue} numberOfLines={1}>{raffle.title}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Boletos</Text>
              <Text style={styles.orderValue}>{selectedPackage.quantity}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Precio por boleto</Text>
              <Text style={styles.orderValue}>
                {formatCurrency(selectedPackage.price / selectedPackage.quantity, raffle.currency)}
              </Text>
            </View>
            {selectedPackage.discount && selectedPackage.discount > 0 && (
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, styles.discountLabel]}>Descuento</Text>
                <Text style={[styles.orderValue, styles.discountValue]}>
                  -{selectedPackage.discount}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de pago</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'card' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Ionicons
              name="card-outline"
              size={24}
              color={paymentMethod === 'card' ? '#6366F1' : '#6B7280'}
            />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Tarjeta de crédito/débito</Text>
              <Text style={styles.paymentDescription}>Visa, Mastercard, AMEX</Text>
            </View>
            <View
              style={[
                styles.radio,
                paymentMethod === 'card' && styles.radioSelected,
              ]}
            >
              {paymentMethod === 'card' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'oxxo' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('oxxo')}
          >
            <View style={styles.oxxoIcon}>
              <Text style={styles.oxxoText}>OXXO</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Pago en OXXO</Text>
              <Text style={styles.paymentDescription}>Paga en efectivo en cualquier OXXO</Text>
            </View>
            <View
              style={[
                styles.radio,
                paymentMethod === 'oxxo' && styles.radioSelected,
              ]}
            >
              {paymentMethod === 'oxxo' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del comprador</Text>

          <View style={styles.userCard}>
            <View style={styles.userRow}>
              <Ionicons name="person-outline" size={18} color="#6B7280" />
              <Text style={styles.userValue}>{user?.name || 'Usuario'}</Text>
            </View>
            <View style={styles.userRow}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={styles.userValue}>{user?.email}</Text>
            </View>
            {user?.phone && (
              <View style={styles.userRow}>
                <Ionicons name="call-outline" size={18} color="#6B7280" />
                <Text style={styles.userValue}>{user.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Al confirmar tu compra aceptas nuestros{' '}
            <Text style={styles.termsLink}>Términos y Condiciones</Text> y{' '}
            <Text style={styles.termsLink}>Política de Privacidad</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <PurchaseSummary
        ticketCount={selectedPackage.quantity}
        totalAmount={selectedPackage.price}
        currency={raffle.currency}
        onConfirm={handleConfirmPurchase}
        onCancel={() => router.back()}
        isLoading={isProcessing}
        showBreakdown={false}
      />
    </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    color: '#6B7280',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
  },
  discountLabel: {
    color: '#059669',
  },
  discountValue: {
    color: '#059669',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: '#6366F1',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  paymentDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  oxxoIcon: {
    width: 48,
    height: 32,
    backgroundColor: '#FFD600',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oxxoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#6366F1',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  userValue: {
    fontSize: 14,
    color: '#111827',
  },
  termsContainer: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#6366F1',
  },
});
