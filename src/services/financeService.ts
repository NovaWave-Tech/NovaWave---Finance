import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { FinanceRecord, FinanceTable, Profile } from "../types/database";
import { validateFinanceRecord } from "../utils/validators";

export const financeService = {
  async list(table: FinanceTable): Promise<FinanceRecord[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async save(table: FinanceTable, record: FinanceRecord, userId: string) {
    if (!isSupabaseConfigured) return record;
    validateFinanceRecord(table, record, userId);
    const { data, error } = await supabase
      .from(table)
      .upsert({ ...record, user_id: userId })
      .select()
      .single();
    if (error?.code === "23505" && record.origem && record.competencia) {
      const { data: existing, error: lookupError } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .eq("origem", record.origem)
        .eq("competencia", record.competencia)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) return existing as FinanceRecord;
    }
    if (error) throw error;
    return data as FinanceRecord;
  },
  async remove(table: FinanceTable, id: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
  async ensureMonthlySalary(
    profile: Profile,
    userId: string,
  ): Promise<FinanceRecord | null> {
    const amount = profile.salario_previsto ?? 0;
    if (!profile.salario_recorrente || amount <= 0) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const year = Number(get("year")),
      month = Number(get("month")),
      todayDay = Number(get("day"));
    const competence = `${year}-${String(month).padStart(2, "0")}-01`;
    const payDay = Math.min(
      profile.dia_salario ?? 1,
      new Date(year, month, 0).getDate(),
    );
    const receiptDate = `${year}-${String(month).padStart(2, "0")}-${String(payDay).padStart(2, "0")}`;
    const { data: existing, error: findError } = await supabase
      .from("receitas")
      .select("*")
      .eq("user_id", userId)
      .eq("origem", "salario_perfil")
      .eq("competencia", competence)
      .maybeSingle();
    if (findError) throw findError;
    if (existing?.status === "recebida") return existing as FinanceRecord;
    const payload = {
      user_id: userId,
      descricao: "Salário mensal",
      valor: amount,
      categoria: "Salário",
      data: receiptDate,
      forma_recebimento: profile.forma_recebimento_salario ?? "Pix",
      status:
        profile.salario_auto_recebido && todayDay >= payDay
          ? "recebida"
          : "pendente",
      recorrente: true,
      dia_recebimento: payDay,
      origem: "salario_perfil",
      competencia: competence,
    };
    if (existing) {
      const { data, error } = await supabase
        .from("receitas")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as FinanceRecord;
    }
    const { data, error } = await supabase
      .from("receitas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicate } = await supabase
          .from("receitas")
          .select("*")
          .eq("user_id", userId)
          .eq("origem", "salario_perfil")
          .eq("competencia", competence)
          .single();
        return duplicate as FinanceRecord;
      }
      throw error;
    }
    return data as FinanceRecord;
  },
};
