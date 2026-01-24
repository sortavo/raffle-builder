// React Provider for Sortavo SDK
import React, { createContext, useContext, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { SortavoClient, createSortavoClient } from '../client';
import { useSortavoStore } from '../store';
import type { SortavoConfig, SortavoUser } from '../types';

interface SortavoContextValue {
  client: SortavoClient;
  config: SortavoConfig;
  isInitialized: boolean;
}

const SortavoContext = createContext<SortavoContextValue | null>(null);

export interface SortavoProviderProps {
  config: SortavoConfig;
  children: ReactNode;
}

export function SortavoProvider({ config, children }: SortavoProviderProps) {
  const { initialize, setUser, isInitialized } = useSortavoStore();

  // Create client instance
  const client = useMemo(() => createSortavoClient(config), [config]);

  // Initialize SDK and setup auth listener
  useEffect(() => {
    initialize(config);

    // Fetch initial user
    client.getCurrentUser().then((result) => {
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    });
  }, [client, config, initialize, setUser]);

  const contextValue = useMemo<SortavoContextValue>(
    () => ({ client, config, isInitialized }),
    [client, config, isInitialized]
  );

  return (
    <SortavoContext.Provider value={contextValue}>
      {children}
    </SortavoContext.Provider>
  );
}

export function useSortavoContext(): SortavoContextValue {
  const context = useContext(SortavoContext);
  if (!context) {
    throw new Error('useSortavoContext must be used within a SortavoProvider');
  }
  return context;
}

export function useSortavoClient(): SortavoClient {
  return useSortavoContext().client;
}
