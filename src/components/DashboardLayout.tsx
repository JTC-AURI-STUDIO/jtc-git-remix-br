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
  Sun,
  Moon,
  UsersRound,
} from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo.jpg";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlocker } from "@/components/SubscriptionBlocker";
import { useThemeContext } from "@/components/ThemeProvider";
import { PermissionsProvider, usePermissions } from "@/hooks/usePermissions";
import { MENU_PERMISSIONS, ROUTE_PERMISSIONS } from "@/lib/permissions";

// Rotas permitidas mesmo com assinatura expirada
const ALLOWED_WHEN_EXPIRED = ["/dashboard", "/configuracoes", "/assinatura"];

const DashboardLayoutInner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isExpired, isTrial } = useSubscription();
  const { theme, toggleTheme } = useThemeContext();
  const { isAdmin, hasPermission, loading: permLoading } = usePermissions();

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        supabase.functions.invoke("ensure-admin-role").catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const allMenuItems = [
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
    // Only admins see Funcionários
    ...(isAdmin ? [{ icon: UsersRound, label: "Funcionários", path: "/funcionarios" }] : []),
  ];

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter((item) => {
    // Dashboard always visible
    if (item.path === "/dashboard") return true;
    // Funcionários only for admins (already filtered above)
    if (item.path === "/funcionarios") return true;
    // Check permission
    const permKey = MENU_PERMISSIONS[item.path];
    if (permKey) return hasPermission(permKey);
    return true;
  });

  // Check if current route is allowed for this employee
  useEffect(() => {
    if (permLoading || isAdmin) return;

    const path = location.pathname;
    // Dashboard and funcionarios are always accessible (funcionarios redirects itself)
    if (path === "/dashboard") return;

    // Find matching route permission
    let requiredPerm = ROUTE_PERMISSIONS[path];
    if (!requiredPerm) {
      // Check prefix matches (e.g., /produtos/editar/123)
      for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
        if (path.startsWith(route)) {
          requiredPerm = perm;
          break;
        }
      }
    }

    if (requiredPerm && !hasPermission(requiredPerm)) {
      navigate("/dashboard");
    }
  }, [location.pathname, permLoading, isAdmin, hasPermission, navigate]);

  if (loading || !user || !session || permLoading) {
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
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
                    <Link to={item.path} onClick={() => setIsMobileMenuOpen(false)}>
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
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
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
          {isExpired && !ALLOWED_WHEN_EXPIRED.includes(location.pathname) ? (
            <SubscriptionBlocker isTrial={isTrial} />
          ) : (
            <Outlet />
          )}
        </motion.div>
      </main>
    </div>
  );
};

// Wrapper that provides PermissionsProvider
const DashboardLayout = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <PermissionsProvider userId={userId}>
      <DashboardLayoutInner />
    </PermissionsProvider>
  );
};

export default DashboardLayout;
