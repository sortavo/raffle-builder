// Checkout Screen - Ticket Reservation (payments handled on web)
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRaffle, useAuth } from '@sortavo/sdk/react';
import { formatCurrency } from '@sortavo/sdk-ui/native';
import { Ionicons } from '@expo/vector-icons';

export default function CheckoutScreen() {
  const { raffleId, packageId } = useLocalSearchParams<{ raffleId: string; packageId: string }>();
  const router = useRouter();
  const { raffle } = useRaffle(raffleId);
  const { user } = useAuth();

  const selectedPackage = raffle?.packages?.find((p: { id: string }) => p.id === packageId);

  const handleContinueToPayment = async () => {
    if (!raffle || !selectedPackage) return;

    // Open web checkout in browser
    const webCheckoutUrl = `https://sortavo.com/checkout/${raffle.id}?package=${packageId}`;

    try {
      const supported = await Linking.canOpenURL(webCheckoutUrl);
      if (supported) {
        await Linking.openURL(webCheckoutUrl);
      } else {
        Alert.alert(
          'Continuar en web',
          'Para completar tu compra, visita sortavo.com desde tu navegador',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No pudimos abrir el enlace de pago');
    }
  };

  if (!raffle || !selectedPackage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const totalAmount = selectedPackage.price;
  const pricePerTicket = selectedPackage.price / selectedPackage.quantity;

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
                {formatCurrency(pricePerTicket, raffle.currency)}
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
            <View style={[styles.orderRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalAmount, raffle.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* User Info */}
        {user && (
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
        )}

        {/* Payment Info */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="globe-outline" size={24} color="#6366F1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Pago seguro en web</Text>
              <Text style={styles.infoDescription}>
                Al continuar serás redirigido a nuestra página web segura para completar tu pago con tarjeta o en OXXO.
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Al continuar aceptas nuestros{' '}
            <Text style={styles.termsLink}>Términos y Condiciones</Text> y{' '}
            <Text style={styles.termsLink}>Política de Privacidad</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total a pagar</Text>
          <Text style={styles.footerTotalAmount}>
            {formatCurrency(totalAmount, raffle.currency)}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleContinueToPayment}
          >
            <Text style={styles.confirmButtonText}>Continuar al pago</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
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
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
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
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    paddingBottom: 32,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerTotalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerTotalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
