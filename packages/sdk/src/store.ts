// SDK State Management with Zustand
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SortavoConfig, SortavoUser, Raffle, Ticket, SortavoError } from './types';

interface SortavoState {
  // Configuration
  config: SortavoConfig | null;
  isInitialized: boolean;

  // Authentication
  user: SortavoUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  // Current context
  currentRaffle: Raffle | null;
  selectedTickets: Ticket[];

  // Cache
  raffles: Map<string, Raffle>;
  tickets: Map<string, Ticket[]>;

  // UI State
  isLoading: boolean;
  error: SortavoError | null;

  // Actions
  initialize: (config: SortavoConfig) => void;
  setUser: (user: SortavoUser | null) => void;
  setCurrentRaffle: (raffle: Raffle | null) => void;
  addSelectedTicket: (ticket: Ticket) => void;
  removeSelectedTicket: (ticketId: string) => void;
  clearSelectedTickets: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: SortavoError | null) => void;
  cacheRaffle: (raffle: Raffle) => void;
  cacheTickets: (raffleId: string, tickets: Ticket[]) => void;
  reset: () => void;
}

const initialState = {
  config: null,
  isInitialized: false,
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  currentRaffle: null,
  selectedTickets: [],
  raffles: new Map(),
  tickets: new Map(),
  isLoading: false,
  error: null,
};

export const useSortavoStore = create<SortavoState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    initialize: (config: SortavoConfig) => {
      set({
        config,
        isInitialized: true,
        isAuthLoading: true,
      });
    },

    setUser: (user: SortavoUser | null) => {
      const { config } = get();
      set({
        user,
        isAuthenticated: !!user,
        isAuthLoading: false,
      });
      config?.onAuthChange?.(user);
    },

    setCurrentRaffle: (raffle: Raffle | null) => {
      set({ currentRaffle: raffle, selectedTickets: [] });
      if (raffle) {
        get().cacheRaffle(raffle);
      }
    },

    addSelectedTicket: (ticket: Ticket) => {
      set((state) => ({
        selectedTickets: [...state.selectedTickets, ticket],
      }));
    },

    removeSelectedTicket: (ticketId: string) => {
      set((state) => ({
        selectedTickets: state.selectedTickets.filter((t) => t.id !== ticketId),
      }));
    },

    clearSelectedTickets: () => {
      set({ selectedTickets: [] });
    },

    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    setError: (error: SortavoError | null) => {
      const { config } = get();
      set({ error });
      if (error) {
        config?.onError?.(error);
      }
    },

    cacheRaffle: (raffle: Raffle) => {
      set((state) => {
        const raffles = new Map(state.raffles);
        raffles.set(raffle.id, raffle);
        return { raffles };
      });
    },

    cacheTickets: (raffleId: string, tickets: Ticket[]) => {
      set((state) => {
        const ticketsMap = new Map(state.tickets);
        ticketsMap.set(raffleId, tickets);
        return { tickets: ticketsMap };
      });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selectors for performance optimization
export const selectConfig = (state: SortavoState) => state.config;
export const selectUser = (state: SortavoState) => state.user;
export const selectIsAuthenticated = (state: SortavoState) => state.isAuthenticated;
export const selectCurrentRaffle = (state: SortavoState) => state.currentRaffle;
export const selectSelectedTickets = (state: SortavoState) => state.selectedTickets;
export const selectIsLoading = (state: SortavoState) => state.isLoading;
export const selectError = (state: SortavoState) => state.error;
