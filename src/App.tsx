// Updated for production - 2026-01-21 - Added lazyWithRetry for Mobile Safari resilience
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { SimulationBanner } from "@/components/admin/SimulationBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Loader2 } from "lucide-react";

import { SentryErrorBoundary } from "@/components/errors/SentryErrorBoundary";
import { SortavoTrackingProvider } from "@/components/tracking/SortavoTrackingProvider";
import { CookieNotice } from "@/components/CookieNotice";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

// Critical pages - loaded immediately (first paint)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Tenant-aware routing components
import { TenantAwareOrgOrRaffle, TenantHome, TenantAwarePayment } from "@/components/routing/TenantAwareRouter";

// Lazy loaded pages with retry - Dashboard (heavy)
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const RafflesList = lazyWithRetry(() => import("./pages/dashboard/RafflesList"));
const RaffleWizard = lazyWithRetry(() => import("./pages/dashboard/RaffleWizard"));
const RaffleDetail = lazyWithRetry(() => import("./pages/dashboard/RaffleDetail"));
const DrawWinner = lazyWithRetry(() => import("./pages/dashboard/DrawWinner"));
const Settings = lazyWithRetry(() => import("./pages/dashboard/Settings"));
const Approvals = lazyWithRetry(() => import("./pages/dashboard/Approvals"));
const Buyers = lazyWithRetry(() => import("./pages/dashboard/Buyers"));
const Analytics = lazyWithRetry(() => import("./pages/dashboard/Analytics"));
const Subscription = lazyWithRetry(() => import("./pages/dashboard/Subscription"));
const AuditLog = lazyWithRetry(() => import("./pages/dashboard/AuditLog"));
const Coupons = lazyWithRetry(() => import("./pages/dashboard/Coupons"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));

// Lazy loaded pages with retry - Admin (heavy, rarely accessed)
const AdminOverview = lazyWithRetry(() => import("./pages/admin/AdminOverview"));
const AdminFinancial = lazyWithRetry(() => import("./pages/admin/AdminFinancial"));
const AdminActivity = lazyWithRetry(() => import("./pages/admin/AdminActivity"));
const AdminUsersDashboard = lazyWithRetry(() => import("./pages/admin/AdminUsersDashboard"));
const AdminOrganizations = lazyWithRetry(() => import("./pages/admin/AdminOrganizations"));
const AdminOrganizationDetail = lazyWithRetry(() => import("./pages/admin/AdminOrganizationDetail"));
const AdminSubscriptions = lazyWithRetry(() => import("./pages/admin/AdminSubscriptions"));
const AdminDomains = lazyWithRetry(() => import("./pages/admin/AdminDomains"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminDemos = lazyWithRetry(() => import("./pages/admin/AdminDemos"));

// Lazy loaded pages with retry - Public (can be deferred)
const PublicRaffle = lazyWithRetry(() => import("./pages/PublicRaffle"));
const PaymentInstructions = lazyWithRetry(() => import("./pages/PaymentInstructions"));
const MyTickets = lazyWithRetry(() => import("./pages/MyTickets"));
const TicketVerification = lazyWithRetry(() => import("./pages/TicketVerification"));
const OrderVerification = lazyWithRetry(() => import("./pages/OrderVerification"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const PlanComparison = lazyWithRetry(() => import("./pages/PlanComparison"));
const AcceptInvite = lazyWithRetry(() => import("./pages/AcceptInvite"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));
const OrganizationHome = lazyWithRetry(() => import("./pages/OrganizationHome"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const SystemStatus = lazyWithRetry(() => import("./pages/SystemStatus"));
const Features = lazyWithRetry(() => import("./pages/Features"));

// Lazy loaded pages with retry - Legal & misc
const TermsOfService = lazyWithRetry(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const LogoPreview = lazyWithRetry(() => import("./pages/LogoPreview"));
const ColorPalette = lazyWithRetry(() => import("./components/design-system/ColorPalette"));
const SentryTest = lazyWithRetry(() => import("./pages/SentryTest"));

// Lazy loaded pages with retry - SEO Guides
const GuidesIndex = lazyWithRetry(() => import("./pages/guides/GuidesIndex"));
const ComoOrganizarRifaLegal = lazyWithRetry(() => import("./pages/guides/ComoOrganizarRifaLegal"));
const MejoresPremiosRifas = lazyWithRetry(() => import("./pages/guides/MejoresPremiosRifas"));
const ComoVenderBoletosOnline = lazyWithRetry(() => import("./pages/guides/ComoVenderBoletosOnline"));

// Page loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof Error && 
            (error.message.includes('401') || 
             error.message.includes('AUTH_ERROR') ||
             error.message.includes('Unauthorized') ||
             error.message.includes('Authentication required'))) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Adaptive toaster that positions based on route
function AdaptiveToaster() {
  const location = useLocation();
  // Check if we're on a public raffle page (either /r/:slug or /:orgSlug/:slug)
  const isPublicRaffle = location.pathname.startsWith('/r/') || 
    // Detect /:orgSlug/:slug pattern (2 segments, not reserved routes)
    (location.pathname.split('/').filter(Boolean).length === 2 &&
     !location.pathname.startsWith('/dashboard') &&
     !location.pathname.startsWith('/admin') &&
     !location.pathname.startsWith('/pricing') &&
     !location.pathname.startsWith('/help') &&
     !location.pathname.startsWith('/guias') &&
     !location.pathname.startsWith('/terms') &&
     !location.pathname.startsWith('/privacy') &&
     !location.pathname.startsWith('/contact') &&
     !location.pathname.startsWith('/status') &&
     !location.pathname.startsWith('/design-system') &&
     !location.pathname.startsWith('/logo-preview') &&
     !location.pathname.startsWith('/sentry-test') &&
     !location.pathname.startsWith('/auth') &&
     !location.pathname.startsWith('/onboarding') &&
     !location.pathname.startsWith('/my-tickets') &&
     !location.pathname.startsWith('/ticket') &&
     !location.pathname.startsWith('/order') &&
     !location.pathname.startsWith('/invite'));
  
  return (
    <Sonner 
      position={isPublicRaffle ? "top-center" : "bottom-center"}
      theme={isPublicRaffle ? "dark" : undefined}
      toastOptions={isPublicRaffle ? {
        duration: 1500,
        classNames: {
          toast: "group toast group-[.toaster]:bg-white/10 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl",
          description: "group-[.toast]:text-white/70",
          actionButton: "group-[.toast]:bg-emerald-500 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/70",
        },
      } : undefined}
    />
  );
}

const App = () => (
  <SentryErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <TenantProvider>
                <SimulationProvider>
                  <SortavoTrackingProvider />
                  <CookieNotice />
                  <AdaptiveToaster />
                  <ScrollToTop />
                  <SimulationBanner />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Root route - tenant-aware */}
                      <Route path="/" element={<TenantHome />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/dashboard/raffles" element={<RafflesList />} />
                      <Route path="/dashboard/raffles/new" element={<RaffleWizard />} />
                      <Route path="/dashboard/raffles/:id" element={<RaffleDetail />} />
                      <Route path="/dashboard/raffles/:id/edit" element={<RaffleWizard />} />
                      <Route path="/dashboard/raffles/:id/draw" element={<DrawWinner />} />
                      <Route path="/dashboard/settings" element={<Settings />} />
                      <Route path="/dashboard/approvals" element={<Approvals />} />
                      <Route path="/dashboard/buyers" element={<Buyers />} />
                      <Route path="/dashboard/analytics" element={<Analytics />} />
                      <Route path="/dashboard/subscription" element={<Subscription />} />
                      <Route path="/dashboard/audit-log" element={<AuditLog />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/dashboard/coupons" element={<Coupons />} />
                      {/* Admin Routes - Before public routes */}
                      <Route path="/admin" element={<AdminOverview />} />
                      <Route path="/admin/financial" element={<AdminFinancial />} />
                      <Route path="/admin/activity" element={<AdminActivity />} />
                      <Route path="/admin/users-dashboard" element={<AdminUsersDashboard />} />
                      <Route path="/admin/organizations" element={<AdminOrganizations />} />
                      <Route path="/admin/organizations/:id" element={<AdminOrganizationDetail />} />
                      <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                      <Route path="/admin/domains" element={<AdminDomains />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/demos" element={<AdminDemos />} />
                      {/* Public Routes */}
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/pricing/compare" element={<PlanComparison />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/help" element={<HelpCenter />} />
                      {/* SEO Guides */}
                      <Route path="/guias" element={<GuidesIndex />} />
                      <Route path="/guias/como-organizar-rifa-legal-mexico" element={<ComoOrganizarRifaLegal />} />
                      <Route path="/guias/mejores-premios-para-rifas" element={<MejoresPremiosRifas />} />
                      <Route path="/guias/como-vender-boletos-online" element={<ComoVenderBoletosOnline />} />
                      {/* Legacy raffle routes */}
                      <Route path="/r/:slug" element={<PublicRaffle />} />
                      <Route path="/r/:slug/payment" element={<PaymentInstructions />} />
                      <Route path="/my-tickets" element={<MyTickets />} />
                      <Route path="/ticket/:ticketId" element={<TicketVerification />} />
                      <Route path="/order/:referenceCode" element={<OrderVerification />} />
                      <Route path="/invite/:token" element={<AcceptInvite />} />
                      {/* Legal Routes */}
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/status" element={<SystemStatus />} />
                      <Route path="/design-system" element={<ColorPalette />} />
                      <Route path="/logo-preview" element={<LogoPreview />} />
                      <Route path="/sentry-test" element={<SentryTest />} />
                      {/* Redirects for common reserved slugs */}
                      <Route path="/login" element={<Navigate to="/auth" replace />} />
                      <Route path="/signup" element={<Navigate to="/auth" replace />} />
                      <Route path="/register" element={<Navigate to="/auth" replace />} />
                      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
                      <Route path="/account" element={<Navigate to="/dashboard/settings" replace />} />
                      <Route path="/billing" element={<Navigate to="/dashboard/subscription" replace />} />
                      <Route path="/profile" element={<Navigate to="/dashboard/settings" replace />} />
                      <Route path="/support" element={<Navigate to="/help" replace />} />
                      <Route path="/faq" element={<Navigate to="/help" replace />} />
                      <Route path="/contacto" element={<Navigate to="/contact" replace />} />
                      <Route path="/estado" element={<Navigate to="/status" replace />} />
                      {/* Tenant-aware single-slug routes - handles custom domains */}
                      <Route path="/:slug/payment" element={<TenantAwarePayment />} />
                      {/* Organization-based public routes - MUST be last before catch-all */}
                      {/* This handles both org home AND custom domain raffle pages */}
                      <Route path="/:orgSlug" element={<TenantAwareOrgOrRaffle />} />
                      <Route path="/:orgSlug/:slug" element={<PublicRaffle />} />
                      <Route path="/:orgSlug/:slug/payment" element={<PaymentInstructions />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </SimulationProvider>
              </TenantProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </SentryErrorBoundary>
);

export default App;
