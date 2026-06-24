import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

const normalizeProfile = (profile: Partial<Profile>) => ({
  ...profile,
  salario_recorrente:
    profile.salario_recorrente ?? profile.salary_recurring_enabled ?? false,
  salario_auto_recebido:
    profile.salario_auto_recebido ?? profile.salary_confirm_on_day ?? false,
  dia_salario: profile.dia_salario ?? profile.salary_day ?? null,
  salario_previsto: profile.salario_previsto ?? profile.monthly_salary ?? null,
  banco_principal: profile.banco_principal ?? profile.main_bank ?? null,
  conta_principal: profile.conta_principal ?? profile.main_account ?? null,
  moeda: profile.moeda ?? profile.default_currency ?? "BRL",
  objetivo_principal:
    profile.objetivo_principal ?? profile.financial_main_goal ?? null,
  salary_recurring_enabled:
    profile.salary_recurring_enabled ?? profile.salario_recorrente ?? false,
  salary_confirm_on_day:
    profile.salary_confirm_on_day ?? profile.salario_auto_recebido ?? false,
  salary_day: profile.salary_day ?? profile.dia_salario ?? null,
  monthly_salary: profile.monthly_salary ?? profile.salario_previsto ?? null,
  main_bank: profile.main_bank ?? profile.banco_principal ?? null,
  main_account: profile.main_account ?? profile.conta_principal ?? null,
  default_currency: profile.default_currency ?? profile.moeda ?? "BRL",
  financial_main_goal:
    profile.financial_main_goal ?? profile.objetivo_principal ?? null,
  alert_invoice_due_enabled: profile.alert_invoice_due_enabled ?? false,
  alert_expense_due_enabled: profile.alert_expense_due_enabled ?? false,
  alert_budget_80_enabled: profile.alert_budget_80_enabled ?? false,
  alert_goal_delay_enabled: profile.alert_goal_delay_enabled ?? false,
  alert_salary_received_enabled:
    profile.alert_salary_received_enabled ?? false,
  alert_days_before: profile.alert_days_before ?? 3,
});

export const profileService = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from("perfil")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return normalizeProfile(data as Profile) as Profile;
  },
  async update(userId: string, profile: Partial<Profile>) {
    const payload = normalizeProfile(profile);
    const { data, error } = await supabase
      .from("perfil")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return normalizeProfile(data as Profile) as Profile;
  },
  async uploadAvatar(userId: string, file: File) {
    const extension = file.name.split(".").pop() || "jpg",
      path = `${userId}/avatar.${extension}`;
    const { error } = await supabase.storage
      .from("finance-files")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data, error: signError } = await supabase.storage
      .from("finance-files")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError) throw signError;
    return data?.signedUrl ?? "";
  },
  async updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  },
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
};
