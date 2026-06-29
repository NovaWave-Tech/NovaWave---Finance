import type { FinanceRecord } from "../types/database";

export const sumMoney = (
  items: FinanceRecord[],
  field: keyof FinanceRecord = "valor",
) => items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
export const goalProgress = (current: number, target: number) =>
  target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
export const monthlySavingsRate = (income: number, expenses: number) =>
  income > 0 ? ((income - expenses) / income) * 100 : 0;
export const calculateTotalIncome = (received: FinanceRecord[]) =>
  sumMoney(received);
export const calculateTotalExpenses = (
  expenses: FinanceRecord[],
  paidInvoices: FinanceRecord[] = [],
) => sumMoney(expenses) + sumMoney(paidInvoices);
export const calculateCardInvoices = (
  invoices: FinanceRecord[],
  installments: FinanceRecord[] = [],
) => sumMoney(invoices) + sumMoney(installments);
export const calculateAvailableLimit = (
  card: FinanceRecord,
  installments: FinanceRecord[],
  purchases: FinanceRecord[] = [],
) => {
  const activePurchases = new Set(
    purchases
      .filter(
        (item) => !["cancelada", "estornada"].includes(item.status ?? "ativa"),
      )
      .map((item) => item.id),
  );
  const used = sumMoney(
    installments.filter(
      (item) =>
        item.cartao_id === card.id &&
        item.status !== "paga" &&
        !["cancelada", "estornada"].includes(item.status ?? "") &&
        (!item.compra_id || activePurchases.has(item.compra_id)),
    ),
  );
  return Math.max(0, (card.limite ?? 0) - used);
};
export const calculateGoalsTotal = (goals: FinanceRecord[]) =>
  sumMoney(
    goals.filter(
      (item) => !["cancelada", "cancelado"].includes(item.status ?? ""),
    ),
    "valor_atual",
  );
export const calculateInvestmentsTotal = (investments: FinanceRecord[]) =>
  sumMoney(
    investments.filter(
      (item) => !["cancelado", "cancelada"].includes(item.status ?? ""),
    ),
    "valor_investido",
  );
export const calculateRealBalance = (
  income: number,
  expenses: number,
  paidInvoices: number,
  contributions: number,
  applications: number,
  redemptions: number,
) =>
  income - expenses - paidInvoices - contributions - applications + redemptions;
export const calculateCommittedMoney = (
  pendingExpenses: number,
  invoices: number,
  recurring: number,
  plannedGoals: number,
  plannedInvestments: number,
) => pendingExpenses + invoices + recurring + plannedGoals + plannedInvestments;
export const calculateProjectedBalance = (
  realBalance: number,
  predictedIncome: number,
  committedMoney: number,
) => realBalance + predictedIncome - committedMoney;
export const calculateNetWorth = (
  realBalance: number,
  goals: number,
  investments: number,
) => realBalance + goals + investments;
export const calculateSalaryCommitment = (committed: number, salary: number) =>
  salary > 0 ? (committed / salary) * 100 : 0;
export const validateDashboardData = (values: Record<string, number>) =>
  Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([key]) => key);
