import { isSupabaseConfigured, supabase } from "../lib/supabase";

export const authService = {
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured)
      throw new Error(
        "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para acessar os dados reais.",
      );
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { id: data.user.id, email: data.user.email ?? email };
  },
  async signOut() {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },
  async signUp({
    nome,
    email,
    password,
    salario_previsto,
    objetivo_principal,
  }: {
    nome: string;
    email: string;
    password: string;
    salario_previsto?: number;
    objetivo_principal?: string;
  }) {
    if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, salario_previsto, objetivo_principal } },
    });
    if (error) throw error;
    return data;
  },
  async resetPassword(email: string) {
    if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  },
  getSession() {
    return supabase.auth.getSession();
  },
  onAuthStateChange: supabase.auth.onAuthStateChange.bind(supabase.auth),
};
