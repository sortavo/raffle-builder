import { Toaster } from "@/components/ui/toaster";
import Settings from "./pages/dashboard/Settings";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

import { InstallPrompt } from "@/components/pwa/InstallPrompt";
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
import Pricing from "./pages/Pricing";
import AcceptInvite from "./pages/AcceptInvite";
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Coupons from "./pages/dashboard/Coupons";
import Marketing from "./pages/dashboard/Marketing";
import HelpCenter from "./pages/HelpCenter";
import OrganizationHome from "./pages/OrganizationHome";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            
            <InstallPrompt />
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
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard/coupons" element={<Coupons />} />
              <Route path="/dashboard/marketing" element={<Marketing />} />
              {/* Public Routes */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/help" element={<HelpCenter />} />
              {/* Organization-based public routes */}
              <Route path="/org/:orgSlug" element={<OrganizationHome />} />
              <Route path="/org/:orgSlug/:slug" element={<PublicRaffle />} />
              <Route path="/org/:orgSlug/:slug/payment" element={<PaymentInstructions />} />
              {/* Legacy raffle routes */}
              <Route path="/r/:slug" element={<PublicRaffle />} />
              <Route path="/r/:slug/payment" element={<PaymentInstructions />} />
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/ticket/:ticketId" element={<TicketVerification />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              {/* Legal Routes */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
