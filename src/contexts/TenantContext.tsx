import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

// Reserved subdomains that are NOT tenants
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'staging', 'dev'];
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
      let tenantSlug: string | null = null;
      
      // Priority 1: Subdomain (cliente1.sortavo.com)
      if (subdomainSlug && !RESERVED_SUBDOMAINS.includes(subdomainSlug.toLowerCase())) {
        tenantSlug = subdomainSlug;
      }
      // Priority 2: Custom domain (cliente1.com)
      else if (isCustomDomain) {
        try {
          const { data } = await supabase.rpc("get_organization_by_domain", {
            p_domain: hostname,
          });

          if (data && data.length > 0) {
            const org = data[0];
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
        const config = await detectTenantFromPath(tenantSlug);
        if (config) {
          setTenant(config);
        }
      }
      
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

      // Inject custom CSS if provided
      if (tenant.custom_css) {
        const styleId = "tenant-custom-css";
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = tenant.custom_css;
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
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
