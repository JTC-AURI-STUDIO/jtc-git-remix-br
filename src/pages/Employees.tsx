import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Users } from "lucide-react";
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

const Employees = () => {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => { fetchEmployees(); }, []);

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
        <Button onClick={() => navigate("/funcionarios/novo")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

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
                  <Button variant="outline" size="icon" onClick={() => navigate(`/funcionarios/editar/${emp.id}`)} title="Editar permissões">
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
    </div>
  );
};

export default Employees;
