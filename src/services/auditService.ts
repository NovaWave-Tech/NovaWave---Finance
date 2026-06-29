import type { FinanceRecord } from "../types/database";
import type { FinanceData } from "./financialEngine";
import { calculateAvailableLimit } from "../utils/calculations";

export type AuditNotification = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: "info" | "media" | "alta";
  date: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function buildAuditNotifications(data: FinanceData): AuditNotification[] {
  const today = todayISO();
  const inDays = (date?: string) => {
    if (!date) return 999;
    return Math.ceil(
      (new Date(`${date.slice(0, 10)}T12:00:00`).getTime() -
        new Date(`${today}T12:00:00`).getTime()) /
        86400000,
    );
  };
  const notifications: AuditNotification[] = [
    ...data.parcelas_cartao
      .filter(
        (item) =>
          !["paga", "cancelada", "estornada"].includes(item.status ?? "") &&
          inDays(item.data_vencimento ?? item.competencia) >= 0 &&
          inDays(item.data_vencimento ?? item.competencia) <= 3,
      )
      .map((item) => ({
        id: `installment-${item.id}`,
        title: "Parcela próxima do vencimento",
        description: `${data.compras_cartao.find((purchase) => purchase.id === item.compra_id)?.descricao ?? "Compra parcelada"} · ${item.numero}/${item.total}.`,
        category: "Cartões",
        severity: "media" as const,
        date: item.data_vencimento ?? item.competencia ?? today,
      })),
    ...data.cartoes
      .filter((card) => {
        const limit = card.limite ?? 0;
        if (!limit || (card.status ?? "ativa") !== "ativa") return false;
        const available = calculateAvailableLimit(
          card,
          data.parcelas_cartao,
          data.compras_cartao,
        );
        return ((limit - available) / limit) * 100 >= 80;
      })
      .map((card) => ({
        id: `card-limit-${card.id}`,
        title: "Limite do cartão acima de 80%",
        description: card.nome ?? "Cartão",
        category: "Cartões",
        severity: "alta" as const,
        date: today,
      })),
    ...data.faturas_cartao
      .filter((item) => item.status !== "paga" && inDays(item.data_vencimento) <= 5)
      .map((item) => ({
        id: `invoice-${item.id}`,
        title: "Fatura próxima do vencimento",
        description: `Vence em ${Math.max(0, inDays(item.data_vencimento))} dia(s). Valor: ${item.valor ?? 0}.`,
        category: "Cartões",
        severity: "alta" as const,
        date: item.data_vencimento ?? today,
      })),
    ...data.despesas
      .filter((item) => item.status !== "pago" && inDays(item.data) <= 3)
      .map((item) => ({
        id: `expense-${item.id}`,
        title: item.data && item.data < today ? "Conta vencida" : "Conta próxima",
        description: item.descricao ?? "Despesa pendente",
        category: "Despesas",
        severity: item.data && item.data < today ? ("alta" as const) : ("media" as const),
        date: item.data ?? today,
      })),
    ...data.metas_financeiras
      .filter((item) => (item.valor_alvo ?? 0) > 0 && ((item.valor_atual ?? 0) / (item.valor_alvo ?? 1)) >= 0.8)
      .map((item) => ({
        id: `goal-${item.id}`,
        title: "Meta acima de 80%",
        description: item.nome ?? "Meta financeira",
        category: "Metas",
        severity: "info" as const,
        date: item.updated_at?.slice(0, 10) ?? today,
      })),
    ...data.orcamentos_categoria
      .map<AuditNotification | null>((budget) => {
        const category = data.categorias_financeiras.find((item) => item.id === budget.categoria_id);
        const month = budget.competencia?.slice(0, 7) ?? today.slice(0, 7);
        const spent = data.despesas
          .filter(
            (expense) =>
              expense.status !== "cancelado" &&
              expense.data?.startsWith(month) &&
              (expense.categoria_id === category?.id || expense.categoria === category?.nome),
          )
          .reduce((total, expense) => total + (expense.valor ?? 0), 0);
        const percent = budget.limite ? (spent / budget.limite) * 100 : 0;
        if (percent < 80) return null;
        return {
          id: `budget-${budget.id}`,
          title: percent >= 100 ? "Orçamento estourado" : "Orçamento em 80%",
          description: `${category?.nome ?? "Categoria"} consumiu ${percent.toFixed(0)}% do limite.`,
          category: "Orçamentos",
          severity: percent >= 100 ? ("alta" as const) : ("media" as const),
          date: budget.competencia ?? today,
        };
      })
      .filter((item): item is AuditNotification => item !== null),
    ...data.movimentacoes_investimentos
      .filter((item) => item.status === "confirmada" && item.data?.startsWith(today.slice(0, 7)))
      .map((item) => ({
        id: `investment-${item.id}`,
        title: "Investimento realizado",
        description: `${item.tipo ?? "Movimentação"} de ${item.valor ?? 0}.`,
        category: "Investimentos",
        severity: "info" as const,
        date: item.data ?? today,
      })),
  ];
  return notifications.sort((a, b) => b.date.localeCompare(a.date));
}

export function buildAuditChecks(data: FinanceData) {
  const duplicatedIds = Object.entries(data).flatMap(([table, rows]) => {
    const seen = new Set<string>();
    return (rows as FinanceRecord[])
      .filter((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          return false;
        }
        return true;
      })
      .map((item) => `${table}:${item.id}`);
  });
  return [
    {
      label: "IDs duplicados",
      ok: duplicatedIds.length === 0,
      detail: duplicatedIds.length ? `${duplicatedIds.length} duplicidade(s)` : "Nenhuma duplicidade encontrada.",
    },
    {
      label: "Receitas sem conta",
      ok: data.contas_financeiras.length === 0 || data.receitas.every((item) => item.conta_id || item.is_virtual),
      detail: "Ajuda a manter saldo real por conta.",
    },
    {
      label: "Despesas sem conta",
      ok: data.contas_financeiras.length === 0 || data.despesas.every((item) => item.conta_id || item.status !== "pago"),
      detail: "Despesas pagas devem indicar de qual conta saíram.",
    },
    {
      label: "Transferências consistentes",
      ok: data.transferencias_internas.every((item) => item.conta_origem_id && item.valor && item.valor > 0),
      detail: "Toda transferência precisa de origem e valor.",
    },
  ];
}
