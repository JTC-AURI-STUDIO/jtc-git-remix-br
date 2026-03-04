import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { ChevronLeft, Eye, EyeOff, Save } from "lucide-react";
import PageLoader from "@/components/PageLoader";

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [employeeName, setEmployeeName] = useState("");

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

  useEffect(() => {
    if (isEditing) {
      loadEmployee();
    }
  }, [id]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const loadEmployee = async () => {
    try {
      const { data: emp, error } = await supabase
        .from("employees" as any)
        .select("id, full_name, cpf, is_active")
        .eq("id", id)
        .maybeSingle();

      if (error || !emp) {
        toast({ title: "Funcionário não encontrado", variant: "destructive" });
        navigate("/funcionarios");
        return;
      }

      const employee = emp as any;
      setEmployeeName(employee.full_name);
      setForm({ full_name: employee.full_name, cpf: formatCPF(employee.cpf), password: "" });

      // Load permissions
      const { data: perms } = await supabase
        .from("employee_permissions" as any)
        .select("permission_key, allowed")
        .eq("employee_id", id);

      const permMap: Record<string, boolean> = {};
      PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => { permMap[p.key] = false; }));
      if (perms) {
        (perms as any[]).forEach((p) => { permMap[p.permission_key] = p.allowed; });
      }
      setPermissions(permMap);
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
      navigate("/funcionarios");
    } catch (err: any) {
      toast({ title: err.message || "Erro ao criar funcionário", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      // Delete existing permissions and re-insert
      await supabase
        .from("employee_permissions" as any)
        .delete()
        .eq("employee_id", id);

      const rows = Object.entries(permissions).map(([key, allowed]) => ({
        employee_id: id,
        permission_key: key,
        allowed,
      }));

      const { error } = await supabase.from("employee_permissions" as any).insert(rows);
      if (error) throw error;

      toast({ title: "Permissões atualizadas!" });
      navigate("/funcionarios");
    } catch (err: any) {
      toast({ title: "Erro ao salvar permissões", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLoader pageName="Funcionário">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLoader>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/funcionarios")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? `Editar - ${employeeName}` : "Novo Funcionário"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Edite as permissões do funcionário" : "Preencha os dados e defina as permissões"}
          </p>
        </div>
      </div>

      {/* Form fields - only show for new employee */}
      {!isEditing && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nome do funcionário"
              />
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
          </CardContent>
        </Card>
      )}

      {/* Permissions */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h2 className="text-lg font-semibold">Permissões</h2>
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
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={isEditing ? handleUpdate : handleCreate}
        disabled={isSaving}
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Salvando..." : isEditing ? "Salvar Permissões" : "Criar Funcionário"}
      </Button>
    </div>
  );
};

export default EmployeeForm;
