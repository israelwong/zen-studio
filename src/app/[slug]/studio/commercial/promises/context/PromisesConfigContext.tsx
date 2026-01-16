'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PromisesConfigContextType {
  openConfigCatalog: () => void;
  isConfigCatalogOpen: boolean;
  closeConfigCatalog: () => void;
}

const PromisesConfigContext = createContext<PromisesConfigContextType | undefined>(undefined);

export function PromisesConfigProvider({ children }: { children: React.ReactNode }) {
  const [isConfigCatalogOpen, setIsConfigCatalogOpen] = useState(false);

  const openConfigCatalog = useCallback(() => {
    setIsConfigCatalogOpen(true);
  }, []);

  const closeConfigCatalog = useCallback(() => {
    setIsConfigCatalogOpen(false);
  }, []);

  return (
    <PromisesConfigContext.Provider
      value={{
        openConfigCatalog,
        isConfigCatalogOpen,
        closeConfigCatalog,
      }}
    >
      {children}
    </PromisesConfigContext.Provider>
  );
}

export function usePromisesConfig() {
  const context = useContext(PromisesConfigContext);
  if (!context) {
    return null;
  }
  return context;
}
