// My Tickets Screen
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useMyTickets } from '@sortavo/sdk/react';
import { Ionicons } from '@expo/vector-icons';

export default function MyTicketsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { tickets, isLoading } = useMyTickets();

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="ticket-outline" size={64} color="#9CA3AF" />
        <Text style={styles.title}>Inicia sesión para ver tus boletos</Text>
        <Text style={styles.subtitle}>
          Podrás ver todos los boletos que has comprado
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando boletos...</Text>
      </View>
    );
  }

  if (tickets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="ticket-outline" size={64} color="#9CA3AF" />
        <Text style={styles.title}>No tienes boletos aún</Text>
        <Text style={styles.subtitle}>
          Explora las rifas disponibles y compra tus primeros boletos
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.exploreButtonText}>Ver rifas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.ticketCard}
            onPress={() => router.push(`/raffle/${item.raffleId}`)}
          >
            <View style={styles.ticketNumber}>
              <Text style={styles.ticketNumberText}>{item.number}</Text>
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketStatus}>
                {item.status === 'sold' ? 'Confirmado' : item.status}
              </Text>
              {item.purchasedAt && (
                <Text style={styles.ticketDate}>
                  Comprado: {new Date(item.purchasedAt).toLocaleDateString('es-MX')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exploreButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ticketNumber: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 16,
  },
  ticketStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ticketDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
