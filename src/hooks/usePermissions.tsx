import { useState, useEffect, useCallback, createContext, useContext } from "react";
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
  isAdmin: false,
  isEmployee: false,
  adminId: null,
  permissions: {},
  loading: true,
  hasPermission: () => false,
  getEffectiveUserId: () => null,
});

export const usePermissions = () => useContext(PermissionsContext);

export function PermissionsProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const resetToNoAccess = useCallback(() => {
    setIsAdmin(false);
    setIsEmployee(false);
    setAdminId(null);
    setEmployeeId(null);
    setPermissions({});
  }, []);

  const reloadEmployeePermissions = useCallback(async (empId: string) => {
    const { data: perms, error } = await supabase
      .from("employee_permissions" as any)
      .select("permission_key, allowed")
      .eq("employee_id", empId);

    if (error) {
      console.error("Error loading employee permissions:", error);
      setPermissions({});
      return;
    }

    const permMap: Record<string, boolean> = {};
    (perms as any[] | null)?.forEach((p) => {
      permMap[p.permission_key] = p.allowed;
    });
    setPermissions(permMap);
  }, []);

  const loadPermissions = useCallback(async () => {
    if (!userId) {
      resetToNoAccess();
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Funcionário sempre tem prioridade sobre role legada
      const { data: employee, error: employeeError } = await supabase
        .from("employees" as any)
        .select("id, admin_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (employeeError) {
        console.error("Error loading employee link:", employeeError);
        resetToNoAccess();
        return;
      }

      if (employee) {
        const emp = employee as any;
        setIsAdmin(false);
        setIsEmployee(true);
        setAdminId(emp.admin_id);
        setEmployeeId(emp.id);
        await reloadEmployeePermissions(emp.id);
        return;
      }

      const { data: adminRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error loading admin role:", roleError);
        resetToNoAccess();
        return;
      }

      setIsAdmin(!!adminRole);
      setIsEmployee(false);
      setAdminId(null);
      setEmployeeId(null);
      setPermissions({});
    } catch (err) {
      console.error("Error loading permissions:", err);
      resetToNoAccess();
    } finally {
      setLoading(false);
    }
  }, [userId, reloadEmployeePermissions, resetToNoAccess]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Realtime: sempre que permissões do funcionário mudarem, recarrega imediatamente
  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`employee-perms-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_permissions",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          reloadEmployeePermissions(employeeId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, reloadEmployeePermissions]);

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
