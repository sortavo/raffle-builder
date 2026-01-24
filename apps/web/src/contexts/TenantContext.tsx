import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateAllTrackingScripts, generateGTMScript, generateGA4Script, generateMetaPixelScript, generateTikTokPixelScript, sanitizeCustomScript } from "@/lib/tracking-scripts";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import DOMPurify from "dompurify";

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  favicon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  custom_css: string | null;
  white_label_enabled: boolean;
  powered_by_visible: boolean;
  // Tracking (only loaded for verified custom domains)
  tracking_enabled: boolean;
  tracking_gtm_id: string | null;
  tracking_meta_pixel_id: string | null;
  tracking_ga4_id: string | null;
  tracking_tiktok_pixel_id: string | null;
  tracking_custom_scripts: string | null;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  isLoading: boolean;
  isMultiTenant: boolean;
  subdomainSlug: string | null;
  detectTenantFromPath: (slug: string) => Promise<TenantConfig | null>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

// Reserved subdomains that are NOT tenants - lista completa sincronizada
const RESERVED_SUBDOMAINS = [
  // Infraestructura
  'www', 'app', 'api', 'admin', 'staging', 'dev', 'test',
  // Autenticación
  'login', 'register', 'auth', 'signin', 'signup',
  // Rutas de app
  'settings', 'account', 'billing', 'dashboard', 'pricing',
  // Soporte
  'help', 'support', 'status', 'docs', 'blog',
  // Técnico
  'mail', 'email', 'cdn', 'assets', 'static', 'media'
];
const ROOT_DOMAIN = 'sortavo.com';

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  
  // Detect if it's a subdomain of ROOT_DOMAIN
  const isSubdomain = hostname.endsWith(`.${ROOT_DOMAIN}`) && 
    hostname !== `www.${ROOT_DOMAIN}`;
  
  // Extract subdomain slug if applicable
  const subdomainSlug = isSubdomain 
    ? hostname.replace(`.${ROOT_DOMAIN}`, '') 
    : null;
  
  // Check for custom domain (not sortavo.com or localhost)
  const isCustomDomain = 
    hostname !== "localhost" && 
    !hostname.includes("sortavo.com") && 
    !hostname.includes("lovable.app") &&
    !hostname.includes("127.0.0.1") &&
    !hostname.includes("vercel.app");

  useEffect(() => {
    const detectTenant = async () => {
      console.log('[TenantContext] Detecting tenant...', { hostname, subdomainSlug, isCustomDomain });
      
      let tenantSlug: string | null = null;
      
      // Priority 1: Subdomain (cliente1.sortavo.com)
      if (subdomainSlug && !RESERVED_SUBDOMAINS.includes(subdomainSlug.toLowerCase())) {
        tenantSlug = subdomainSlug;
        console.log('[TenantContext] Detected subdomain tenant:', tenantSlug);
      }
      // Priority 2: Custom domain (cliente1.com)
      else if (isCustomDomain) {
        console.log('[TenantContext] Checking custom domain:', hostname);
        try {
          const { data } = await supabase.rpc("get_organization_by_domain", {
            p_domain: hostname,
          });

          if (data && data.length > 0) {
            const org = data[0];
            console.log('[TenantContext] Found org for custom domain:', org.slug);
            
            // Fetch tracking data separately (RPC may not include new columns)
            const { data: trackingData } = await supabase
              .from("organizations")
              .select("tracking_enabled, tracking_gtm_id, tracking_meta_pixel_id, tracking_ga4_id, tracking_tiktok_pixel_id, tracking_custom_scripts")
              .eq("id", org.id)
              .single();
            
            setTenant({
              id: org.id,
              name: org.name,
              slug: org.slug,
              logo_url: org.logo_url,
              brand_color: org.brand_color || "#2563EB",
              favicon_url: org.favicon_url,
              meta_title: org.meta_title,
              meta_description: org.meta_description,
              custom_css: org.custom_css,
              white_label_enabled: org.white_label_enabled || false,
              powered_by_visible: org.powered_by_visible !== false,
              // Tracking fields (only for custom domains)
              tracking_enabled: trackingData?.tracking_enabled || false,
              tracking_gtm_id: trackingData?.tracking_gtm_id || null,
              tracking_meta_pixel_id: trackingData?.tracking_meta_pixel_id || null,
              tracking_ga4_id: trackingData?.tracking_ga4_id || null,
              tracking_tiktok_pixel_id: trackingData?.tracking_tiktok_pixel_id || null,
              tracking_custom_scripts: trackingData?.tracking_custom_scripts || null,
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error detecting tenant by domain:", error);
        }
      }
      
      // If we have a tenant slug from subdomain, load the tenant config
      if (tenantSlug) {
        console.log('[TenantContext] Loading config for subdomain tenant:', tenantSlug);
        const config = await detectTenantFromPath(tenantSlug);
        if (config) {
          setTenant(config);
        }
      }
      
      console.log('[TenantContext] Detection complete, setting isLoading=false');
      setIsLoading(false);
    };

    detectTenant();
  }, [hostname, subdomainSlug, isCustomDomain]);

  const detectTenantFromPath = async (slug: string): Promise<TenantConfig | null> => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          id,
          name,
          slug,
          logo_url,
          brand_color,
          favicon_url,
          meta_title,
          meta_description,
          custom_css,
          white_label_enabled,
          powered_by_visible
        `)
        .eq("slug", slug)
        .single();

      if (error || !data) return null;

      // For subdomain access, tracking is NOT loaded (security)
      const config: TenantConfig = {
        id: data.id,
        name: data.name,
        slug: data.slug || "",
        logo_url: data.logo_url,
        brand_color: data.brand_color || "#2563EB",
        favicon_url: data.favicon_url,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        custom_css: data.custom_css,
        white_label_enabled: data.white_label_enabled || false,
        powered_by_visible: data.powered_by_visible !== false,
        // Tracking disabled for subdomain access
        tracking_enabled: false,
        tracking_gtm_id: null,
        tracking_meta_pixel_id: null,
        tracking_ga4_id: null,
        tracking_tiktok_pixel_id: null,
        tracking_custom_scripts: null,
      };

      return config;
    } catch (error) {
      console.error("Error detecting tenant from path:", error);
      return null;
    }
  };

  // Apply tenant branding
  useEffect(() => {
    if (tenant) {
      // Set CSS custom property for brand color
      document.documentElement.style.setProperty(
        "--tenant-brand-color",
        tenant.brand_color
      );

      // Set favicon if custom
      if (tenant.favicon_url) {
        const existingFavicon = document.querySelector("link[rel='icon']");
        if (existingFavicon) {
          existingFavicon.setAttribute("href", tenant.favicon_url);
        }
      }

      // Inject custom CSS if provided (with sanitization)
      if (tenant.custom_css) {
        const styleId = "tenant-custom-css";
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        // Sanitize CSS: remove any javascript: URLs, expressions, and behavior properties
        const sanitizedCSS = tenant.custom_css
          .replace(/javascript\s*:/gi, '')
          .replace(/expression\s*\(/gi, '')
          .replace(/behavior\s*:/gi, '')
          .replace(/@import/gi, '')
          .replace(/url\s*\(\s*["']?\s*data:/gi, 'url(blocked:');
        styleEl.textContent = sanitizedCSS;
      }

    }
  }, [tenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        isMultiTenant: (isCustomDomain || !!subdomainSlug) && !!tenant,
        subdomainSlug,
        detectTenantFromPath,
      }}
    >
      {children}
      {/* Inject tracking scripts based on cookie consent */}
      {tenant && isCustomDomain && <TrackingScriptInjector tenant={tenant} />}
    </TenantContext.Provider>
  );
}

// Separate component to handle tracking injection with consent
function TrackingScriptInjector({ tenant }: { tenant: TenantConfig }) {
  const { canLoadAnalytics, canLoadMarketing, hasConsented } = useCookieConsent();

  useEffect(() => {
    // Only inject if tracking is enabled AND user has consented
    if (!tenant.tracking_enabled || !hasConsented) {
      return;
    }

    const trackingContainerId = "tenant-tracking-scripts";
    let trackingContainer = document.getElementById(trackingContainerId);
    
    // Clear previous scripts
    if (trackingContainer) {
      trackingContainer.innerHTML = "";
    } else {
      trackingContainer = document.createElement("div");
      trackingContainer.id = trackingContainerId;
      document.head.appendChild(trackingContainer);
    }

    const injectScript = (html: string) => {
      if (!html.trim()) return;
      
      // SECURITY: Sanitize HTML before processing to prevent XSS
      // Allow only script-related tags and safe attributes
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['script', 'noscript', 'iframe'],
        ALLOWED_ATTR: ['src', 'async', 'defer', 'id', 'data-*', 'width', 'height', 'style', 'frameborder', 'allowfullscreen'],
        ALLOW_DATA_ATTR: true,
        // Don't strip unknown protocols - allow https for external scripts
        ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
      });
      
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = sanitizedHtml;
      
      const scripts = tempDiv.querySelectorAll("script");
      scripts.forEach((script) => {
        const newScript = document.createElement("script");
        if (script.src) {
          // Validate src is HTTPS only
          if (script.src.startsWith('https://')) {
            newScript.src = script.src;
            newScript.async = script.async;
          } else {
            console.warn('[TenantContext] Blocked non-HTTPS script:', script.src);
            return;
          }
        } else {
          newScript.textContent = script.textContent;
        }
        trackingContainer!.appendChild(newScript);
      });

      const noscripts = tempDiv.querySelectorAll("noscript");
      noscripts.forEach((noscript) => {
        trackingContainer!.appendChild(noscript.cloneNode(true));
      });
    };

    // GTM: Analytics category
    if (canLoadAnalytics && tenant.tracking_gtm_id) {
      injectScript(generateGTMScript(tenant.tracking_gtm_id));
    }

    // GA4: Analytics category
    if (canLoadAnalytics && tenant.tracking_ga4_id) {
      injectScript(generateGA4Script(tenant.tracking_ga4_id));
    }

    // Meta Pixel: Marketing category
    if (canLoadMarketing && tenant.tracking_meta_pixel_id) {
      injectScript(generateMetaPixelScript(tenant.tracking_meta_pixel_id));
    }

    // TikTok Pixel: Marketing category
    if (canLoadMarketing && tenant.tracking_tiktok_pixel_id) {
      injectScript(generateTikTokPixelScript(tenant.tracking_tiktok_pixel_id));
    }

    // Custom scripts: Load if either analytics OR marketing is enabled
    if ((canLoadAnalytics || canLoadMarketing) && tenant.tracking_custom_scripts) {
      const sanitized = sanitizeCustomScript(tenant.tracking_custom_scripts);
      injectScript(sanitized);
    }

    return () => {
      const container = document.getElementById(trackingContainerId);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [tenant, canLoadAnalytics, canLoadMarketing, hasConsented]);

  return null;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
