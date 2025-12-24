import { Toaster } from "@/components/ui/toaster";
import Settings from "./pages/dashboard/Settings";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import RafflesList from "./pages/dashboard/RafflesList";
import RaffleWizard from "./pages/dashboard/RaffleWizard";
import RaffleDetail from "./pages/dashboard/RaffleDetail";
import PublicRaffle from "./pages/PublicRaffle";
import PaymentInstructions from "./pages/PaymentInstructions";
import MyTickets from "./pages/MyTickets";
import Pricing from "./pages/Pricing";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/raffles" element={<RafflesList />} />
              <Route path="/dashboard/raffles/new" element={<RaffleWizard />} />
              <Route path="/dashboard/raffles/:id" element={<RaffleDetail />} />
              <Route path="/dashboard/raffles/:id/edit" element={<RaffleWizard />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/onboarding" element={<Onboarding />} />
              {/* Public Routes */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/r/:slug" element={<PublicRaffle />} />
              <Route path="/r/:slug/payment" element={<PaymentInstructions />} />
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
