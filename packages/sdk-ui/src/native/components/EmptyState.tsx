// Empty State Component - Reusable empty state display
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '../theme';

export type EmptyStateVariant =
  | 'no-raffles'
  | 'no-tickets'
  | 'no-notifications'
  | 'no-results'
  | 'no-internet'
  | 'error'
  | 'coming-soon'
  | 'custom';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: string;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: any;
  testID?: string;
}

const VARIANT_ICONS: Record<EmptyStateVariant, string> = {
  'no-raffles': '🎟️',
  'no-tickets': '🎫',
  'no-notifications': '🔔',
  'no-results': '🔍',
  'no-internet': '📡',
  'error': '😕',
  'coming-soon': '🚀',
  'custom': '📭',
};

export function EmptyState({
  variant = 'custom',
  icon,
  imageUrl,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  testID,
}: EmptyStateProps) {
  const theme = useTheme();
  const displayIcon = icon || VARIANT_ICONS[variant];

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Icon or Image */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={styles.icon}>{displayIcon}</Text>
        </View>
      )}

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg },
              ]}
              onPress={onAction}
            >
              <Text style={styles.primaryButtonText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: theme.colors.primary, borderRadius: theme.borderRadius.lg },
              ]}
              onPress={onSecondaryAction}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                {secondaryActionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Preset empty states for common scenarios
export function NoRafflesEmpty({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      variant="no-raffles"
      title="No hay rifas disponibles"
      subtitle="Vuelve pronto para ver nuevas rifas emocionantes"
      actionLabel={onExplore ? "Explorar" : undefined}
      onAction={onExplore}
    />
  );
}

export function NoTicketsEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      variant="no-tickets"
      title="No tienes boletos aún"
      subtitle="Participa en una rifa para ver tus boletos aquí"
      actionLabel={onBrowse ? "Ver rifas" : undefined}
      onAction={onBrowse}
    />
  );
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      variant="no-notifications"
      title="Sin notificaciones"
      subtitle="Te avisaremos cuando haya actualizaciones importantes"
    />
  );
}

export function NoSearchResultsEmpty({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      variant="no-results"
      title="Sin resultados"
      subtitle={query ? `No encontramos resultados para "${query}"` : 'Intenta con otros términos'}
      actionLabel={onClear ? "Limpiar búsqueda" : undefined}
      onAction={onClear}
    />
  );
}

export function NoInternetEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="no-internet"
      title="Sin conexión"
      subtitle="Verifica tu conexión a internet e intenta de nuevo"
      actionLabel={onRetry ? "Reintentar" : undefined}
      onAction={onRetry}
    />
  );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Algo salió mal"
      subtitle="Ocurrió un error inesperado. Por favor intenta de nuevo."
      actionLabel={onRetry ? "Reintentar" : undefined}
      onAction={onRetry}
    />
  );
}

export function ComingSoonEmpty() {
  return (
    <EmptyState
      variant="coming-soon"
      title="Próximamente"
      subtitle="Esta función estará disponible muy pronto"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  image: {
    width: 200,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actions: {
    marginTop: 24,
    gap: 12,
    width: '100%',
    maxWidth: 240,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
