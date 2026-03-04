import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PermissionKey } from "@/lib/permissions";

interface PermissionsState {
  isAdmin: boolean;
  isEmployee: boolean;
  adminId: string | null;
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
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
  const employeeIdRef = useRef<string | null>(null);

  // Reusable function to reload permissions for the current employee
  const reloadEmployeePermissions = useCallback(async (empId: string) => {
    const { data: perms } = await supabase
      .from("employee_permissions" as any)
      .select("permission_key, allowed")
      .eq("employee_id", empId);

    const permMap: Record<string, boolean> = {};
    if (perms) {
      (perms as any[]).forEach((p) => {
        permMap[p.permission_key] = p.allowed;
      });
    }
    setPermissions(permMap);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        // 1) Sempre priorizar vínculo de funcionário
        const { data: employee } = await supabase
          .from("employees" as any)
          .select("id, admin_id, is_active")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (employee) {
          const emp = employee as any;
          employeeIdRef.current = emp.id;
          setIsAdmin(false);
          setIsEmployee(true);
          setAdminId(emp.admin_id);
          await reloadEmployeePermissions(emp.id);
          setLoading(false);
          return;
        }

        employeeIdRef.current = null;

        // 2) Sem vínculo de funcionário, verificar role admin
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (adminRole) {
          setIsAdmin(true);
          setIsEmployee(false);
          setAdminId(null);
          setPermissions({});
        } else {
          setIsAdmin(true);
          setIsEmployee(false);
          setAdminId(null);
          setPermissions({});
        }
      } catch (err) {
        console.error("Error loading permissions:", err);
        setIsAdmin(true);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userId, reloadEmployeePermissions]);

  // Realtime subscription: reload permissions whenever employee_permissions changes
  useEffect(() => {
    if (!employeeIdRef.current) return;

    const empId = employeeIdRef.current;

    const channel = supabase
      .channel(`employee-perms-${empId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_permissions",
          filter: `employee_id=eq.${empId}`,
        },
        () => {
          // Any INSERT/UPDATE/DELETE on this employee's permissions → reload
          reloadEmployeePermissions(empId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEmployee, reloadEmployeePermissions]);

  const hasPermission = useCallback(
    (key: PermissionKey): boolean => {
      if (isAdmin) return true;
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
