import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const authService = {
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para acessar os dados reais.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { id: data.user.id, email: data.user.email ?? email };
  },
  async signOut() { if (isSupabaseConfigured) { const { error } = await supabase.auth.signOut(); if (error) throw error; } },
  getSession() { return supabase.auth.getSession(); },
  onAuthStateChange: supabase.auth.onAuthStateChange.bind(supabase.auth),
};
