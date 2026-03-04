import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PermissionKey } from "@/lib/permissions";

interface PermissionsState {
  isAdmin: boolean;
  isEmployee: boolean;
  adminId: string | null; // If employee, the admin's user_id
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
  /** For employees, returns admin's user_id. For admins, returns own user_id. */
  getEffectiveUserId: () => string | null;
}

const PermissionsContext = createContext<PermissionsState>({
  isAdmin: true,
  isEmployee: false,
  adminId: null,
  permissions: {},
  loading: true,
  hasPermission: () => true,
  getEffectiveUserId: () => null,
});

export const usePermissions = () => useContext(PermissionsContext);

export function PermissionsProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [isAdmin, setIsAdmin] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        // Check if user has admin role
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (adminRole) {
          // User is admin - has all permissions
          setIsAdmin(true);
          setIsEmployee(false);
          setAdminId(null);
          setPermissions({});
          setLoading(false);
          return;
        }

        // Check if user is an employee
        const { data: employee } = await supabase
          .from("employees" as any)
          .select("id, admin_id, is_active")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (employee) {
          const emp = employee as any;
          setIsAdmin(false);
          setIsEmployee(true);
          setAdminId(emp.admin_id);

          // Load permissions
          const { data: perms } = await supabase
            .from("employee_permissions" as any)
            .select("permission_key, allowed")
            .eq("employee_id", emp.id);

          const permMap: Record<string, boolean> = {};
          if (perms) {
            (perms as any[]).forEach((p) => {
              permMap[p.permission_key] = p.allowed;
            });
          }
          setPermissions(permMap);
        } else {
          // Neither admin nor employee — treat as admin (new user, role pending)
          setIsAdmin(true);
          setIsEmployee(false);
          setAdminId(null);
          setPermissions({});
        }
      } catch (err) {
        console.error("Error loading permissions:", err);
        // Default to admin on error to not lock users out
        setIsAdmin(true);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userId]);

  const hasPermission = useCallback(
    (key: PermissionKey): boolean => {
      if (isAdmin) return true; // Admins have all permissions
      return permissions[key] === true;
    },
    [isAdmin, permissions]
  );

  const getEffectiveUserId = useCallback((): string | null => {
    if (isEmployee && adminId) return adminId;
    return userId;
  }, [isEmployee, adminId, userId]);

  return (
    <PermissionsContext.Provider
      value={{ isAdmin, isEmployee, adminId, permissions, loading, hasPermission, getEffectiveUserId }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}
