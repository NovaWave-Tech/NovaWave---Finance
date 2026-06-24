import type { FinanceRecord, FinanceTable, Profile } from "../types/database";

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const parseMonth = (month: string) => ({
  year: Number(month.slice(0, 4)),
  month: Number(month.slice(5, 7)),
});

const toSaoPauloISO = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const getProfileSalaryConfig = (profile?: Profile | null) => ({
  enabled:
    profile?.salary_recurring_enabled ?? profile?.salario_recorrente ?? false,
  confirmOnDay:
    profile?.salary_confirm_on_day ?? profile?.salario_auto_recebido ?? false,
  amount: Number(profile?.monthly_salary ?? profile?.salario_previsto ?? 0),
  day: Number(profile?.salary_day ?? profile?.dia_salario ?? 1) || 1,
  method: profile?.forma_recebimento_salario ?? "Pix",
});

export function isSalaryRecord(record: FinanceRecord, month?: string) {
  const isSalary =
    record.source === "profile_salary" ||
    record.origem === "salario_perfil" ||
    record.origem === "profile_salary" ||
    record.tipo === "salary" ||
    record.tipo === "salario" ||
    record.categoria?.toLowerCase() === "salário" ||
    record.categoria?.toLowerCase() === "salario" ||
    (record.descricao ?? "").toLowerCase().includes("salário") ||
    (record.descricao ?? "").toLowerCase().includes("salario");
  if (!isSalary) return false;
  if (!month) return true;
  return (
    record.competencia?.startsWith(month) ||
    record.data?.startsWith(month) ||
    false
  );
}

export function getSalaryForCompetence({
  profile,
  incomes,
  month,
  today = toSaoPauloISO(),
}: {
  profile?: Profile | null;
  incomes: FinanceRecord[];
  month: string;
  today?: string;
}): FinanceRecord | null {
  const config = getProfileSalaryConfig(profile);
  const existing = incomes.find(
    (income) => income.status !== "cancelada" && isSalaryRecord(income, month),
  );
  if (existing) {
    return {
      ...existing,
      source: existing.source ?? "profile_salary",
      is_virtual: false,
      tipo: existing.tipo ?? "salary",
    };
  }
  const currentMonth = today.slice(0, 7);
  if (month < currentMonth) return null;
  if (!config.enabled || config.amount <= 0) return null;
  const { year, month: monthNumber } = parseMonth(month);
  const day = Math.min(config.day, new Date(year, monthNumber, 0).getDate());
  const date = `${month}-${String(day).padStart(2, "0")}`;
  const status = config.confirmOnDay && today >= date ? "recebida" : "pendente";
  return {
    id: `virtual:profile_salary:${month}`,
    descricao: "Salário mensal",
    titulo: "Salário mensal",
    valor: config.amount,
    categoria: "Salário",
    data: date,
    forma_recebimento: config.method,
    status,
    recorrente: true,
    dia_recebimento: day,
    origem: "profile_salary",
    source: "profile_salary",
    competencia: `${month}-01`,
    tipo: "salary",
    is_virtual: true,
  };
}

export function withSalaryForMonths(
  receitas: FinanceRecord[],
  profile: Profile | null | undefined,
  months: string[],
  today = toSaoPauloISO(),
) {
  const additions = months
    .map((month) =>
      getSalaryForCompetence({ profile, incomes: receitas, month, today }),
    )
    .filter((item): item is FinanceRecord => Boolean(item?.is_virtual));
  const byId = new Map([...receitas, ...additions].map((item) => [item.id, item]));
  return [...byId.values()];
}

export function monthFromDate(date: Date) {
  return monthKey(date.getFullYear(), date.getMonth() + 1);
}

export function surroundingMonths(reference: Date, before = 6, after = 12) {
  return Array.from({ length: before + after + 1 }, (_, index) => {
    const date = new Date(
      reference.getFullYear(),
      reference.getMonth() - before + index,
      1,
    );
    return monthFromDate(date);
  });
}

export function getMonthlyFinancialData<T extends Record<FinanceTable, FinanceRecord[]>>({
  data,
  profile,
  month,
  today,
}: {
  data: T;
  profile?: Profile | null;
  month: string;
  today?: string;
}) {
  return {
    ...data,
    receitas: withSalaryForMonths(data.receitas, profile, [month], today),
  };
}
