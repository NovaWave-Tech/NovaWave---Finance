import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { FinanceRecord, FinanceTable, Profile } from "../types/database";
import { validateFinanceRecord } from "../utils/validators";

const uuidFields = new Set<keyof FinanceRecord>([
  "id",
  "user_id",
  "cartao_id",
  "compra_id",
  "fatura_id",
  "meta_id",
  "categoria_id",
  "conta_id",
  "conta_origem_id",
  "conta_destino_id",
  "destino_id",
  "investimento_id",
]);

function normalizeRecord(record: FinanceRecord): FinanceRecord {
  const normalized = { ...record } as Record<string, unknown>;
  uuidFields.forEach((field) => {
    if (typeof normalized[field] === "string" && !normalized[field].trim()) {
      normalized[field] = null;
    }
  });
  return normalized as unknown as FinanceRecord;
}

function friendlyDatabaseError(error: { code?: string; message?: string }) {
  if (error.code === "22P02")
    return new Error(
      "Um dos vínculos selecionados é inválido. Escolha novamente a conta, categoria ou item relacionado.",
    );
  if (error.code === "23503")
    return new Error(
      "O item relacionado não existe mais. Atualize a página e selecione outro registro.",
    );
  if (error.code === "23505")
    return new Error("Este registro já existe e não pode ser duplicado.");
  if (error.code === "42501")
    return new Error("Você não tem permissão para alterar este registro.");
  return error;
}

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
    const normalized = normalizeRecord(record);
    validateFinanceRecord(table, normalized, userId);
    const { data, error } = await supabase
      .from(table)
      .upsert({ ...normalized, user_id: userId })
      .select()
      .single();
    if (
      error?.code === "23505" &&
      normalized.origem &&
      normalized.competencia
    ) {
      const { data: existing, error: lookupError } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .eq("origem", normalized.origem)
        .eq("competencia", normalized.competencia)
        .maybeSingle();
      if (lookupError) throw friendlyDatabaseError(lookupError);
      if (existing) return existing as FinanceRecord;
    }
    if (error) throw friendlyDatabaseError(error);
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
    accountId?: string | null,
  ): Promise<FinanceRecord | null> {
    const amount = profile.salario_previsto ?? 0;
    if (!profile.salario_recorrente || amount <= 0 || !accountId) return null;
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
    if (existing?.status === "recebida" && existing.conta_id)
      return existing as FinanceRecord;
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
      conta_id: accountId || null,
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
