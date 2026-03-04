import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import OfflineDetector from "./components/OfflineDetector";
import Auth from "./pages/Auth";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import Auri from "./pages/Auri";
import Subscription from "./pages/Subscription";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import POS from "./pages/POS";
import POSProductSelect from "./pages/POSProductSelect";
import POSCustomerSelect from "./pages/POSCustomerSelect";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SalesHistory from "./pages/SalesHistory";
import Suppliers from "./pages/Suppliers";
import SupplierForm from "./pages/SupplierForm";
import WeeklyRedemption from "./pages/WeeklyRedemption";
import Employees from "./pages/Employees";
import EmployeeForm from "./pages/EmployeeForm";

import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
            <Route path="/produtos/novo" element={<ProductForm />} />
            <Route path="/produtos/editar/:id" element={<ProductForm />} />
            <Route path="/pdv" element={<POS />} />
            <Route path="/pdv/produtos" element={<POSProductSelect />} />
            <Route path="/pdv/clientes" element={<POSCustomerSelect />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/clientes/novo" element={<CustomerForm />} />
            <Route path="/clientes/editar/:id" element={<CustomerForm />} />
            <Route path="/historico" element={<SalesHistory />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/fornecedores/novo" element={<SupplierForm />} />
            <Route path="/fornecedores/editar/:id" element={<SupplierForm />} />
            <Route path="/resgate-semanal" element={<WeeklyRedemption />} />
            <Route path="/funcionarios" element={<Employees />} />
            <Route path="/funcionarios/novo" element={<EmployeeForm />} />
            <Route path="/funcionarios/editar/:id" element={<EmployeeForm />} />
            <Route path="/auri" element={<Auri />} />
            
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
