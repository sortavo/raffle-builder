// Ticket Grid Component - Interactive ticket selection grid
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '../theme';
import type { TicketGridProps } from '../../types';
import type { Ticket } from '@sortavo/sdk';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TicketCellProps {
  ticket: Ticket;
  isSelected: boolean;
  onPress: () => void;
  cellSize: number;
  theme: ReturnType<typeof useTheme>;
}

function TicketCell({ ticket, isSelected, onPress, cellSize, theme }: TicketCellProps) {
  const isAvailable = ticket.status === 'available';
  const isSold = ticket.status === 'sold';
  const isReserved = ticket.status === 'reserved';

  const backgroundColor = useMemo(() => {
    if (isSelected) return theme.colors.primary;
    if (isSold) return theme.colors.surface;
    if (isReserved) return theme.colors.warning + '40';
    return theme.colors.background;
  }, [isSelected, isSold, isReserved, theme]);

  const textColor = useMemo(() => {
    if (isSelected) return '#FFFFFF';
    if (isSold) return theme.colors.textSecondary;
    return theme.colors.text;
  }, [isSelected, isSold, theme]);

  const borderColor = useMemo(() => {
    if (isSelected) return theme.colors.primary;
    if (isSold) return 'transparent';
    return theme.colors.surface;
  }, [isSelected, isSold, theme]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isAvailable}
      activeOpacity={0.7}
      style={[
        styles.ticketCell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor,
          borderColor,
          borderRadius: theme.borderRadius.sm,
          opacity: isSold ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.ticketNumber,
          {
            color: textColor,
            fontSize: cellSize > 40 ? 14 : 11,
          },
        ]}
      >
        {ticket.number}
      </Text>
      {isSold && (
        <View style={styles.soldOverlay}>
          <View style={[styles.soldLine, { backgroundColor: theme.colors.error }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function TicketGrid({
  raffleId,
  tickets = [],
  onTicketSelect,
  selectedTickets = [],
  columns = 10,
  showNumbers = true,
  showLegend = true,
  showSearch = true,
  showStats = true,
  maxSelection,
  availableColor,
  selectedColor,
  soldColor,
  reservedColor,
  style,
  testID,
}: TicketGridProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // Calculate cell size based on columns and screen width
  const cellSize = useMemo(() => {
    const padding = 32; // Container padding
    const gap = 4; // Gap between cells
    return Math.floor((SCREEN_WIDTH - padding - gap * (columns - 1)) / columns);
  }, [columns]);

  // Filter tickets based on search
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    return tickets.filter((t) =>
      t.number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const available = tickets.filter((t) => t.status === 'available').length;
    const sold = tickets.filter((t) => t.status === 'sold').length;
    const reserved = tickets.filter((t) => t.status === 'reserved').length;
    return { available, sold, reserved, total: tickets.length };
  }, [tickets]);

  // Check if ticket is selected
  const isSelected = useCallback(
    (ticketId: string) => selectedTickets.some((t) => t.id === ticketId),
    [selectedTickets]
  );

  // Handle ticket press
  const handleTicketPress = useCallback(
    (ticket: Ticket) => {
      if (ticket.status !== 'available') return;

      // Check max selection
      if (maxSelection && !isSelected(ticket.id) && selectedTickets.length >= maxSelection) {
        return;
      }

      onTicketSelect?.(ticket);
    },
    [onTicketSelect, isSelected, selectedTickets.length, maxSelection]
  );

  // Find ticket by number
  const handleSearch = useCallback(() => {
    const ticket = tickets.find(
      (t) => t.number.toLowerCase() === searchQuery.toLowerCase()
    );
    if (ticket && ticket.status === 'available') {
      handleTicketPress(ticket);
      setSearchQuery('');
      setSearchModalVisible(false);
    }
  }, [tickets, searchQuery, handleTicketPress]);

  // Render ticket cell
  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <TicketCell
        ticket={item}
        isSelected={isSelected(item.id)}
        onPress={() => handleTicketPress(item)}
        cellSize={cellSize}
        theme={theme}
      />
    ),
    [isSelected, handleTicketPress, cellSize, theme]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Ticket) => item.id, []);

  // Get item layout for performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: cellSize + 4,
      offset: (cellSize + 4) * Math.floor(index / columns),
      index,
    }),
    [cellSize, columns]
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Stats Bar */}
      {showStats && (
        <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.available}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Disponibles
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {stats.sold}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Vendidos
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {selectedTickets.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Seleccionados
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      {showSearch && (
        <TouchableOpacity
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
          onPress={() => setSearchModalVisible(true)}
        >
          <Text style={[styles.searchIcon]}>🔍</Text>
          <Text style={[styles.searchPlaceholder, { color: theme.colors.textSecondary }]}>
            Buscar número de boleto...
          </Text>
        </TouchableOpacity>
      )}

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.surface },
              ]}
            />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Disponible
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: theme.colors.primary }]}
            />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Seleccionado
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: theme.colors.surface, opacity: 0.5 }]}
            />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Vendido
            </Text>
          </View>
        </View>
      )}

      {/* Grid */}
      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={keyExtractor}
        numColumns={columns}
        key={columns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialNumToRender={columns * 10}
        maxToRenderPerBatch={columns * 5}
        windowSize={5}
        removeClippedSubviews
      />

      {/* Selection Summary */}
      {selectedTickets.length > 0 && (
        <View
          style={[
            styles.selectionSummary,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
        >
          <Text style={styles.selectionText}>
            {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''} seleccionado{selectedTickets.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.selectionNumbers}>
            {selectedTickets.slice(0, 5).map((t) => t.number).join(', ')}
            {selectedTickets.length > 5 ? ` +${selectedTickets.length - 5} más` : ''}
          </Text>
        </View>
      )}

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSearchModalVisible(false)}
        >
          <View
            style={[
              styles.searchModal,
              {
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.xl,
              },
            ]}
          >
            <Text style={[styles.searchModalTitle, { color: theme.colors.text }]}>
              Buscar boleto
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderRadius: theme.borderRadius.md,
                },
              ]}
              placeholder="Ingresa el número"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="default"
              autoFocus
              onSubmitEditing={handleSearch}
            />
            <View style={styles.searchModalActions}>
              <TouchableOpacity
                style={[styles.searchModalButton, { borderColor: theme.colors.surface }]}
                onPress={() => setSearchModalVisible(false)}
              >
                <Text style={[styles.searchModalButtonText, { color: theme.colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.searchModalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSearch}
              >
                <Text style={[styles.searchModalButtonText, { color: '#FFFFFF' }]}>
                  Buscar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendText: {
    fontSize: 11,
  },
  gridContent: {
    paddingBottom: 100,
  },
  gridRow: {
    gap: 4,
    marginBottom: 4,
  },
  ticketCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  ticketNumber: {
    fontWeight: '600',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldLine: {
    position: 'absolute',
    width: '140%',
    height: 1,
    transform: [{ rotate: '-45deg' }],
  },
  selectionSummary: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionNumbers: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    maxWidth: '50%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  searchModal: {
    width: '100%',
    padding: 24,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  searchModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
