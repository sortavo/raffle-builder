import { Toaster } from "@/components/ui/toaster";
import Settings from "./pages/dashboard/Settings";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { SimulationBanner } from "@/components/admin/SimulationBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { SentryErrorBoundary } from "@/components/errors/SentryErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import RafflesList from "./pages/dashboard/RafflesList";
import RaffleWizard from "./pages/dashboard/RaffleWizard";
import RaffleDetail from "./pages/dashboard/RaffleDetail";
import DrawWinner from "./pages/dashboard/DrawWinner";
import PublicRaffle from "./pages/PublicRaffle";
import PaymentInstructions from "./pages/PaymentInstructions";
import MyTickets from "./pages/MyTickets";
import TicketVerification from "./pages/TicketVerification";
import OrderVerification from "./pages/OrderVerification";
import Pricing from "./pages/Pricing";
import PlanComparison from "./pages/PlanComparison";
import AcceptInvite from "./pages/AcceptInvite";
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Coupons from "./pages/dashboard/Coupons";
import Marketing from "./pages/dashboard/Marketing";
import HelpCenter from "./pages/HelpCenter";
import OrganizationHome from "./pages/OrganizationHome";
import Buyers from "./pages/dashboard/Buyers";
import Analytics from "./pages/dashboard/Analytics";
import Subscription from "./pages/dashboard/Subscription";
import AuditLog from "./pages/dashboard/AuditLog";
import Contact from "./pages/Contact";
import SystemStatus from "./pages/SystemStatus";
import LogoPreview from "./pages/LogoPreview";
import ColorPalette from "./components/design-system/ColorPalette";
import SentryTest from "./pages/SentryTest";

// Admin pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminUsersDashboard from "./pages/admin/AdminUsersDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminOrganizationDetail from "./pages/admin/AdminOrganizationDetail";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminUsers from "./pages/admin/AdminUsers";


const queryClient = new QueryClient();

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
              <SimulationProvider>
                <AdaptiveToaster />
                <ScrollToTop />
                <SimulationBanner />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/raffles" element={<RafflesList />} />
                  <Route path="/dashboard/raffles/new" element={<RaffleWizard />} />
                  <Route path="/dashboard/raffles/:id" element={<RaffleDetail />} />
                  <Route path="/dashboard/raffles/:id/edit" element={<RaffleWizard />} />
                  <Route path="/dashboard/raffles/:id/draw" element={<DrawWinner />} />
                  <Route path="/dashboard/settings" element={<Settings />} />
                  <Route path="/dashboard/buyers" element={<Buyers />} />
                  <Route path="/dashboard/analytics" element={<Analytics />} />
                  <Route path="/dashboard/subscription" element={<Subscription />} />
                  <Route path="/dashboard/audit-log" element={<AuditLog />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard/coupons" element={<Coupons />} />
                  <Route path="/dashboard/marketing" element={<Marketing />} />
                  {/* Admin Routes - Before public routes */}
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/financial" element={<AdminFinancial />} />
                  <Route path="/admin/activity" element={<AdminActivity />} />
                  <Route path="/admin/users-dashboard" element={<AdminUsersDashboard />} />
                  <Route path="/admin/organizations" element={<AdminOrganizations />} />
                  <Route path="/admin/organizations/:id" element={<AdminOrganizationDetail />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  {/* Public Routes */}
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/pricing/compare" element={<PlanComparison />} />
                  <Route path="/help" element={<HelpCenter />} />
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
                  {/* Organization-based public routes - MUST be last before catch-all */}
                  <Route path="/:orgSlug" element={<OrganizationHome />} />
                  <Route path="/:orgSlug/:slug" element={<PublicRaffle />} />
                  <Route path="/:orgSlug/:slug/payment" element={<PaymentInstructions />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SimulationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </SentryErrorBoundary>
);

export default App;
