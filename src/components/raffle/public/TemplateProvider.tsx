// ============================================================================
// TIER S: Template Provider - Context for Design Token System
// ============================================================================
// Applies CSS variables to DOM and provides hook for accessing template tokens.
// Handles Google Fonts loading with fallbacks and smooth transitions.

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { 
  generateTemplateTokens, 
  TemplateConfig, 
  CustomizationOverrides,
  TemplateTokens,
  isLightBackground 
} from '@/lib/template-tokens';

interface TemplateContextValue {
  tokens: TemplateTokens;
  isLight: boolean;
  primaryColor: string;
  applyTokensTo: (element: HTMLElement | null) => void;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

interface TemplateProviderProps {
  template: TemplateConfig;
  customization?: CustomizationOverrides;
  children: React.ReactNode;
  className?: string;
}

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();

/**
 * Loads Google Font asynchronously with error handling
 */
function loadGoogleFont(fontFamily: string): void {
  if (loadedFonts.has(fontFamily)) return;
  
  const fontName = fontFamily.replace(/ /g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700;800;900&display=swap`;
  
  link.onerror = () => {
    console.warn(`Failed to load font: ${fontFamily}, using fallback`);
  };
  
  link.onload = () => {
    loadedFonts.add(fontFamily);
  };
  
  document.head.appendChild(link);
}

/**
 * Applies token CSS variables to an element
 */
function applyTokensToElement(element: HTMLElement | null, tokens: TemplateTokens): void {
  if (!element) return;
  
  Object.entries(tokens).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

export function TemplateProvider({ 
  template, 
  customization, 
  children,
  className 
}: TemplateProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate tokens with memoization
  const tokens = useMemo(() => 
    generateTemplateTokens(template, customization),
    [template, customization]
  );
  
  // Determine if template is light
  const bgColor = customization?.background_color || template.colors.background;
  const isLight = isLightBackground(bgColor);
  const primaryColor = customization?.primary_color || template.colors.primary;
  
  // Load fonts when template changes
  useEffect(() => {
    if (template.fonts?.title) {
      loadGoogleFont(template.fonts.title);
    }
    if (template.fonts?.body && template.fonts.body !== template.fonts?.title) {
      loadGoogleFont(template.fonts.body);
    }
  }, [template.fonts?.title, template.fonts?.body]);
  
  // Apply tokens to container
  useEffect(() => {
    if (containerRef.current) {
      applyTokensToElement(containerRef.current, tokens);
    }
  }, [tokens]);
  
  // Function to apply tokens to external elements (like modals)
  const applyTokensTo = (element: HTMLElement | null) => {
    applyTokensToElement(element, tokens);
  };
  
  const contextValue = useMemo(() => ({
    tokens,
    isLight,
    primaryColor,
    applyTokensTo,
  }), [tokens, isLight, primaryColor]);
  
  return (
    <TemplateContext.Provider value={contextValue}>
      <div 
        ref={containerRef}
        className={className}
        style={{
          // Base styles with CSS variable fallbacks
          backgroundColor: 'var(--template-bg)',
          color: 'var(--template-text)',
          fontFamily: 'var(--template-font-body)',
          // Smooth transitions for color changes
          transition: 'background-color 300ms ease, color 300ms ease',
        }}
      >
        {children}
      </div>
    </TemplateContext.Provider>
  );
}

/**
 * Hook to access template tokens and utilities
 */
export function useTemplateTokens(): TemplateContextValue {
  const context = useContext(TemplateContext);
  
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      tokens: {},
      isLight: true,
      primaryColor: '#10B981',
      applyTokensTo: () => {},
    };
  }
  
  return context;
}

/**
 * Hook to get specific token value
 */
export function useTemplateToken(tokenName: string): string {
  const { tokens } = useTemplateTokens();
  return tokens[tokenName] || '';
}

/**
 * Hook to check if template is light or dark
 */
export function useIsLightTemplate(): boolean {
  const { isLight } = useTemplateTokens();
  return isLight;
}
