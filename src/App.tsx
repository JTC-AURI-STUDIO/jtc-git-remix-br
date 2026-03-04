import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OfflineDetector from "./components/OfflineDetector";
import Auth from "./pages/Auth";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import Auri from "./pages/Auri";
import Subscription from "./pages/Subscription";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SalesHistory from "./pages/SalesHistory";
import Suppliers from "./pages/Suppliers";
import WeeklyRedemption from "./pages/WeeklyRedemption";
import DeleteAccount from "./pages/DeleteAccount";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineDetector />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/confirmar-email" element={<ConfirmEmail />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assinatura" element={<Subscription />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/pdv" element={<POS />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/historico" element={<SalesHistory />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/resgate-semanal" element={<WeeklyRedemption />} />
            <Route path="/auri" element={<Auri />} />
            <Route path="/excluir-minha-conta" element={<DeleteAccount />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
