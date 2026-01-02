import { useParams, Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";
import PublicRaffle from "@/pages/PublicRaffle";
import OrganizationHome from "@/pages/OrganizationHome";
import PaymentInstructions from "@/pages/PaymentInstructions";
import Index from "@/pages/Index";

/**
 * TenantAwareOrgOrRaffle
 * 
 * Intelligently routes /:slug based on whether a custom domain tenant is detected:
 * - Custom domain (e.g., monram.com.mx/reyestech): slug is a raffleSlug
 * - Main domain (e.g., sortavo.com/rifasmanolormz): slug is an orgSlug
 */
export function TenantAwareOrgOrRaffle() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If tenant detected from custom domain, treat slug as raffleSlug
  if (tenant) {
    return <PublicRaffle tenantOrgSlug={tenant.slug} />;
  }

  // Otherwise, slug is an orgSlug (normal Sortavo behavior)
  return <OrganizationHome />;
}

/**
 * TenantHome
 * 
 * Routes the root path based on tenant context:
 * - Custom domain: Show organization home for that tenant
 * - Main domain: Show landing page
 */
export function TenantHome() {
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (tenant) {
    return <OrganizationHome orgSlugOverride={tenant.slug} />;
  }

  return <Index />;
}

/**
 * TenantAwarePayment
 * 
 * Routes payment instructions based on tenant context:
 * - Custom domain: Use tenant's org for context
 * - Main domain: Use standard /:orgSlug/:slug/payment pattern
 */
export function TenantAwarePayment() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ultra-dark">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If tenant detected from custom domain, we're at /:raffleSlug/payment
  if (tenant) {
    return <PaymentInstructions tenantOrgSlug={tenant.slug} />;
  }

  // Otherwise, this route shouldn't exist (use /:orgSlug/:slug/payment)
  return <Navigate to="/" replace />;
}
