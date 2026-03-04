import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  History,
  Truck,
  Gift,
} from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo.jpg";
import { AuriChat } from "@/components/AuriChat";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fire-and-forget, não bloqueia UI
      supabase.functions.invoke("ensure-admin-role").catch(() => {});
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
        return;
      }

      supabase.functions.invoke("ensure-admin-role").catch(() => {});
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Package, label: "Produtos", path: "/produtos" },
    { icon: ShoppingCart, label: "Venda", path: "/pdv" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: Truck, label: "Fornecedores", path: "/fornecedores" },
    { icon: History, label: "Histórico", path: "/historico" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    { icon: Settings, label: "Configurações", path: "/configuracoes" },
    { icon: CreditCard, label: "Assinatura", path: "/assinatura" },
    { icon: Gift, label: "Resgate Semanal", path: "/resgate-semanal" },
  ];

  if (loading || !user || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <img src={logo} alt="JTC FluxPDV Logo" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-xl font-bold text-primary">JTC FluxPDV</h1>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </header>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-background pt-16"
          >
            <nav className="p-4 space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 transition-all duration-150 active:scale-[0.97]"
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: menuItems.length * 0.04, duration: 0.2 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive transition-all duration-150 active:scale-[0.97]"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  Sair
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 min-h-screen overflow-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="p-4 md:p-8 w-full max-w-full overflow-hidden"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Auri Chat Bot - esconde na página /auri */}
      {location.pathname !== "/auri" && <AuriChat />}
    </div>
  );
};

export default DashboardLayout;