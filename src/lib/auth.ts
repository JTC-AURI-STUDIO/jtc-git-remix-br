import { supabase } from "@/integrations/supabase/client";

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  referredByCode?: string;
}

export const signUp = async (data: SignUpData) => {
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${window.location.origin}/confirmar-email`,
      data: {
        full_name: data.fullName,
        cpf: data.cpf,
        phone: data.phone,
        cep: data.cep,
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        referred_by_code: data.referredByCode || null,
      },
    },
  });

  if (error) {
    if (error.message && error.message.toLowerCase().includes("database error saving new user")) {
      throw new Error("Já existe um usuário cadastrado com este CPF ou e-mail.");
    }

    throw error;
  }

  // Supabase returns a "fake" user with no session and no identities when
  // the email is already registered (security measure to not reveal existing accounts).
  // Detect this and show a clear error instead of going to the confirmation screen.
  if (
    signUpData?.user &&
    (!signUpData.user.identities || signUpData.user.identities.length === 0)
  ) {
    throw new Error("Este e-mail já está cadastrado. Se você esqueceu sua senha, tente recuperá-la na tela de login.");
  }
};

export const signIn = async (identifier: string, password: string) => {
  // Verificar se é CPF ou email (aceitando com ou sem pontuação)
  const originalIdentifier = identifier;
  const cleanIdentifier = identifier.replace(/\D/g, "");
  const isCPF = /^\d{11}$/.test(cleanIdentifier);
  
  if (isCPF) {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_user_email_by_cpf', { search_cpf: cleanIdentifier });

      let emailFromCpf: string | null = null;

      if (!rpcError && data && data.length > 0) {
        emailFromCpf = data[0].email;
      } else if (originalIdentifier !== cleanIdentifier) {
        const { data: dataFormatted, error: rpcErrorFormatted } = await (supabase.rpc as any)('get_user_email_by_cpf', { search_cpf: originalIdentifier });
        if (!rpcErrorFormatted && dataFormatted && dataFormatted.length > 0) {
          emailFromCpf = dataFormatted[0].email;
        }
      }

      if (!emailFromCpf) {
        throw new Error("CPF não encontrado. Verifique se digitou corretamente ou crie uma conta.");
      }

      identifier = emailFromCpf;
    } catch (err: any) {
      if (err.message?.includes("CPF não encontrado")) throw err;
      throw new Error("CPF não encontrado. Verifique se digitou corretamente ou crie uma conta.");
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    // Supabase pode retornar "Email not confirmed" diretamente
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      throw new Error("email_not_confirmed");
    }
    throw error;
  }

  // Garante que o usuário só consiga entrar após confirmar o e-mail.
  // (Em alguns cenários/configurações o backend pode retornar sessão mesmo sem confirmação.)
  const confirmedAt = (data.user as any)?.email_confirmed_at ?? (data.user as any)?.confirmed_at;
  if (!confirmedAt) {
    await supabase.auth.signOut();
    throw new Error("email_not_confirmed");
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Validar código de convite usando função segura do banco
export const validateInviteCode = async (code: string): Promise<{ valid: boolean; alreadyUsed: boolean }> => {
  try {
    const { data, error } = await (supabase.rpc as any)('validate_invite_code', { code: code.toUpperCase() });

    if (error || !data || data.length === 0) {
      console.error("Erro ao validar código:", error);
      return { valid: false, alreadyUsed: false };
    }

    const result = data[0];
    return { 
      valid: result.is_valid === true, 
      alreadyUsed: result.is_already_used === true 
    };
  } catch {
    return { valid: false, alreadyUsed: false };
  }
};
