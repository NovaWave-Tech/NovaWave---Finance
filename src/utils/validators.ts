export const isPositiveMoney = (value: number) =>
  Number.isFinite(value) && value > 0;
export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
import type { FinanceRecord, FinanceTable } from "../types/database";

const positiveTables = new Set<FinanceTable>([
  "receitas",
  "despesas",
  "compras_cartao",
  "parcelas_cartao",
  "aportes_metas",
  "movimentacoes_investimentos",
  "contas_recorrentes",
]);
const statuses: Partial<Record<FinanceTable, string[]>> = {
  receitas: ["recebida", "pendente", "cancelada"],
  despesas: ["pago", "pendente", "atrasado", "cancelado"],
  compras_cartao: ["ativa", "cancelada", "estornada"],
  faturas_cartao: ["aberta", "fechada", "paga", "atrasada", "cancelada"],
  metas_financeiras: ["em_andamento", "concluida", "pausada", "cancelada"],
};
export function validateFinanceRecord(
  table: FinanceTable,
  record: FinanceRecord,
  userId: string,
) {
  if (!userId)
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  if (!record.id)
    throw new Error("O registro não possui um identificador válido.");
  if (
    positiveTables.has(table) &&
    (record.valor ?? record.valor_total ?? 0) <= 0
  )
    throw new Error("O valor deve ser maior que zero.");
  if (table === "metas_financeiras" && (record.valor_alvo ?? 0) <= 0)
    throw new Error("O valor alvo deve ser maior que zero.");
  if (table === "cartoes" && (record.limite ?? 0) < 0)
    throw new Error("O limite do cartão não pode ser negativo.");
  if (
    table === "compras_cartao" &&
    (!record.quantidade_parcelas || record.quantidade_parcelas < 1)
  )
    throw new Error("A compra precisa ter pelo menos uma parcela.");
  const date =
    record.data ??
    record.data_compra ??
    record.data_objetivo ??
    record.data_investimento;
  if (date && Number.isNaN(new Date(`${date.slice(0, 10)}T12:00:00`).getTime()))
    throw new Error("Informe uma data válida.");
  const allowed = statuses[table];
  if (record.status && allowed && !allowed.includes(record.status))
    throw new Error(`Status inválido para ${table.replaceAll("_", " ")}.`);
}
