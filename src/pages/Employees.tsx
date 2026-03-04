import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Edit, Eye, EyeOff, ChevronRight, ChevronLeft, Shield, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  is_active: boolean;
  created_at: string;
}

interface EmployeePermission {
  permission_key: string;
  allowed: boolean;
}

const Employees = () => {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [showEditPermsDialog, setShowEditPermsDialog] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    password: "",
  });

  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => { initial[p.key] = false; }));
    return initial;
  });

  useEffect(() => { fetchEmployees(); }, []);

  // Redirect non-admins
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees" as any)
        .select("id, user_id, full_name, cpf, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees((data as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const resetForm = () => {
    setForm({ full_name: "", cpf: "", password: "" });
    const initial: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => { initial[p.key] = false; }));
    setPermissions(initial);
    setStep(1);
    setShowDialog(false);
  };

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.cpf.trim() || !form.password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const permsArray = Object.entries(permissions).map(([key, allowed]) => ({ key, allowed }));

      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: {
          full_name: form.full_name,
          cpf: form.cpf.replace(/\D/g, ""),
          password: form.password,
          permissions: permsArray,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Funcionário criado com sucesso!" });
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      toast({ title: err.message || "Erro ao criar funcionário", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Tem certeza que deseja remover ${employee.full_name}?`)) return;

    setIsDeleting(employee.id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-employee", {
        body: { employee_id: employee.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Funcionário removido com sucesso!" });
      fetchEmployees();
    } catch (err: any) {
      toast({ title: err.message || "Erro ao remover", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditPermissions = async (employee: Employee) => {
    setEditingEmployee(employee);
    // Load current permissions
    try {
      const { data } = await supabase
        .from("employee_permissions" as any)
        .select("permission_key, allowed")
        .eq("employee_id", employee.id);

      const permMap: Record<string, boolean> = {};
      PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => { permMap[p.key] = false; }));
      if (data) {
        (data as any[]).forEach((p) => { permMap[p.permission_key] = p.allowed; });
      }
      setEditPermissions(permMap);
      setShowEditPermsDialog(true);
    } catch (err) {
      console.error(err);
    }
  };

  const saveEditPermissions = async () => {
    if (!editingEmployee) return;
    setSavingPerms(true);
    try {
      // Delete existing and re-insert
      await supabase
        .from("employee_permissions" as any)
        .delete()
        .eq("employee_id", editingEmployee.id);

      const rows = Object.entries(editPermissions).map(([key, allowed]) => ({
        employee_id: editingEmployee.id,
        permission_key: key,
        allowed,
      }));

      const { error } = await supabase.from("employee_permissions" as any).insert(rows);
      if (error) throw error;

      toast({ title: "Permissões atualizadas!" });
      setShowEditPermsDialog(false);
      setEditingEmployee(null);
    } catch (err: any) {
      toast({ title: "Erro ao salvar permissões", variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  };

  if (loading) {
    return (
      <PageLoader pageName="Funcionários">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLoader>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os funcionários da sua loja</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Employee list */}
      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Adicionar" para criar seu primeiro funcionário</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{emp.full_name}</p>
                  <p className="text-sm text-muted-foreground">CPF: {formatCPF(emp.cpf)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditPermissions(emp)} title="Editar permissões">
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(emp)}
                    disabled={isDeleting === emp.id}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Novo Funcionário - Dados" : "Novo Funcionário - Permissões"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nome do funcionário" />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.full_name.trim() || !form.cpf.trim() || !form.password.trim()) {
                  toast({ title: "Preencha todos os campos", variant: "destructive" });
                  return;
                }
                if (form.password.length < 6) {
                  toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
                  return;
                }
                setStep(2);
              }}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="font-semibold text-sm mb-3 text-primary">{group.label}</h3>
                  <div className="space-y-3">
                    {group.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between">
                        <span className="text-sm">{perm.label}</span>
                        <Switch
                          checked={permissions[perm.key] || false}
                          onCheckedChange={(checked) => setPermissions({ ...permissions, [perm.key]: checked })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button className="flex-1" onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? "Criando..." : "Criar Funcionário"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={showEditPermsDialog} onOpenChange={(open) => { if (!open) { setShowEditPermsDialog(false); setEditingEmployee(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões - {editingEmployee?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="font-semibold text-sm mb-3 text-primary">{group.label}</h3>
                <div className="space-y-3">
                  {group.permissions.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="text-sm">{perm.label}</span>
                      <Switch
                        checked={editPermissions[perm.key] || false}
                        onCheckedChange={(checked) => setEditPermissions({ ...editPermissions, [perm.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button className="w-full" onClick={saveEditPermissions} disabled={savingPerms}>
              {savingPerms ? "Salvando..." : "Salvar Permissões"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
