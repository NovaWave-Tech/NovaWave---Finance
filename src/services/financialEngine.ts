import type { FinanceRecord, FinanceTable, Profile } from "../types/database";
import { formatPercent } from "../utils/formatters";
import {
  calculateCommittedMoney,
  calculateGoalsTotal,
  calculateInvestmentsTotal,
  calculateNetWorth,
  calculateProjectedBalance,
  calculateRealBalance,
  calculateSalaryCommitment,
  validateDashboardData,
} from "../utils/calculations";

export type FinanceData = Record<FinanceTable, FinanceRecord[]>;
const sum = (items: FinanceRecord[], field: keyof FinanceRecord = "valor") =>
  items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
const active = (item: FinanceRecord) =>
  !["cancelada", "cancelado", "estornada", "inativa"].includes(
    item.status ?? "",
  ) && item.ativa !== false;
const inMonth = (
  item: FinanceRecord,
  month: string,
  field: keyof FinanceRecord = "data",
) => String(item[field] ?? "").startsWith(month);
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const percent = (value: number, total: number) =>
  total ? (value / total) * 100 : 0;

export function calculateFinancialSnapshot(
  data: FinanceData,
  reference = new Date(),
  profile?: Profile | null,
) {
  const today = reference.toISOString().slice(0, 10),
    currentMonth = monthKey(reference);
  const receivedAll = data.receitas.filter(
    (x) => active(x) && x.status !== "pendente" && (x.data ?? "") <= today,
  );
  const paidExpensesAll = data.despesas.filter(
    (x) =>
      active(x) &&
      x.status === "pago" &&
      x.tipo !== "pagamento_cartao" &&
      (x.data ?? "") <= today,
  );
  const paidInvoicesAll = data.faturas_cartao.filter(
    (x) => x.status === "paga",
  );
  const contributionsAll = data.aportes_metas.filter(
    (x) => active(x) && x.status !== "pendente" && (x.data ?? "") <= today,
  );
  const confirmedMoves = data.movimentacoes_investimentos.filter(
    (x) => active(x) && x.status !== "pendente" && (x.data ?? "") <= today,
  );
  const applicationsAll = confirmedMoves.filter((x) => x.tipo === "aplicacao"),
    redemptionsAll = confirmedMoves.filter((x) => x.tipo === "resgate");
  const availableBalance = calculateRealBalance(
    sum(receivedAll),
    sum(paidExpensesAll),
    sum(paidInvoicesAll),
    sum(contributionsAll),
    sum(applicationsAll),
    sum(redemptionsAll),
  );
  const goalsTotal = calculateGoalsTotal(data.metas_financeiras);
  const investedTotal = calculateInvestmentsTotal(data.investimentos);
  const monthReceived = receivedAll.filter((x) => inMonth(x, currentMonth));
  const monthPredicted = data.receitas.filter(
    (x) =>
      active(x) &&
      inMonth(x, currentMonth) &&
      (x.status === "pendente" || (x.data ?? "") > today),
  );
  const monthPaidExpenses = paidExpensesAll.filter((x) =>
    inMonth(x, currentMonth),
  );
  const monthPendingExpenses = data.despesas.filter(
    (x) => active(x) && inMonth(x, currentMonth) && x.status !== "pago",
  );
  const monthPaidInvoices = paidInvoicesAll.filter((x) =>
    inMonth(x, currentMonth, "paga_em"),
  );
  const monthContributions = contributionsAll.filter((x) =>
    inMonth(x, currentMonth),
  );
  const monthApplications = applicationsAll.filter((x) =>
      inMonth(x, currentMonth),
    ),
    monthRedemptions = redemptionsAll.filter((x) => inMonth(x, currentMonth));
  const overdueExpenses = data.despesas.filter(
    (x) => active(x) && x.status !== "pago" && (x.data ?? "") < today,
  );
  const openInvoices = data.faturas_cartao.filter(
    (x) =>
      ["aberta", "fechada", "atrasada"].includes(x.status ?? "") &&
      inMonth(x, currentMonth, "competencia"),
  );
  const storedOpenInvoiceValue = sum(
    openInvoices.filter((x) => x.status === "aberta"),
  );
  const closedInvoiceValue = sum(
    openInvoices.filter((x) =>
      ["fechada", "atrasada"].includes(x.status ?? ""),
    ),
  );
  const paidInvoiceValue = sum(monthPaidInvoices);
  const invoiceCards = new Set(openInvoices.map((x) => x.cartao_id));
  const validPurchases = new Set(
    data.compras_cartao.filter(active).map((x) => x.id),
  );
  const forecastInstallments = data.parcelas_cartao.filter(
    (x) =>
      active(x) &&
      x.status !== "paga" &&
      inMonth(x, currentMonth, "competencia") &&
      (!x.compra_id || validPurchases.has(x.compra_id)) &&
      !invoiceCards.has(x.cartao_id),
  );
  const openInvoiceTotal = sum(openInvoices) + sum(forecastInstallments);
  const openInvoiceValue = storedOpenInvoiceValue + sum(forecastInstallments);
  const recurringNotGenerated = data.contas_recorrentes.filter(
    (x) =>
      active(x) &&
      (x.status ?? "ativa") === "ativa" &&
      !["receita", "aporte", "investimento"].includes(x.tipo ?? "despesa") &&
      !String(x.ultima_geracao ?? "").startsWith(currentMonth),
  );
  const recurringCommitment = sum(recurringNotGenerated);
  const plannedGoalTotal = data.metas_financeiras
    .filter((x) => active(x) && (x.status ?? "em_andamento") === "em_andamento")
    .reduce((total, goal) => total + (goal.aporte_mensal ?? 0), 0);
  const plannedContributions = Math.max(
    0,
    plannedGoalTotal - sum(monthContributions),
  );
  const plannedInvestments = sum(
    data.movimentacoes_investimentos.filter(
      (x) =>
        active(x) &&
        x.status === "pendente" &&
        x.tipo === "aplicacao" &&
        inMonth(x, currentMonth),
    ),
  );
  const salaryRecord = data.receitas.find(
    (x) =>
      x.origem === "salario_perfil" && inMonth(x, currentMonth, "competencia"),
  );
  const salaryExpected = Number(
    profile?.salario_previsto ?? salaryRecord?.valor ?? 0,
  );
  const salaryReceived =
    salaryRecord && salaryRecord.status !== "pendente"
      ? Number(salaryRecord.valor ?? 0)
      : 0;
  const received = sum(monthReceived),
    predictedRevenue = received + sum(monthPredicted);
  const paidExpenses = sum(monthPaidExpenses),
    pendingExpenses = sum(monthPendingExpenses);
  const contributions = sum(monthContributions),
    appliedInvestments = sum(monthApplications),
    redeemedInvestments = sum(monthRedemptions);
  const realCommitment =
    paidExpenses +
    sum(monthPaidInvoices) +
    contributions +
    appliedInvestments -
    redeemedInvestments;
  const committedMoney = calculateCommittedMoney(
    pendingExpenses,
    openInvoiceTotal,
    recurringCommitment,
    plannedContributions,
    plannedInvestments,
  );
  const freeReal = received - realCommitment,
    freePredicted = calculateProjectedBalance(
      freeReal,
      sum(monthPredicted),
      committedMoney,
    );
  const categoryMap = monthPaidExpenses.reduce<Record<string, number>>(
    (acc, item) => {
      const key = item.categoria ?? "Sem categoria";
      acc[key] = (acc[key] ?? 0) + (item.valor ?? 0);
      return acc;
    },
    {},
  );
  const paymentMap = monthPaidExpenses.reduce<Record<string, number>>(
    (acc, item) => {
      const key = item.forma_pagamento ?? "Não informado";
      acc[key] = (acc[key] ?? 0) + (item.valor ?? 0);
      return acc;
    },
    {},
  );
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      reference.getFullYear(),
      reference.getMonth() - 5 + index,
      1,
    );
    return {
      key: monthKey(date),
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
    };
  });
  let running =
    sum(
      data.receitas.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          (x.data ?? "") < months[0].key,
      ),
    ) -
    sum(
      data.despesas.filter(
        (x) =>
          active(x) &&
          x.status === "pago" &&
          x.tipo !== "pagamento_cartao" &&
          (x.data ?? "") < months[0].key,
      ),
    ) -
    sum(
      data.faturas_cartao.filter(
        (x) => x.status === "paga" && (x.paga_em ?? "") < months[0].key,
      ),
    ) -
    sum(
      data.aportes_metas.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          (x.data ?? "") < months[0].key,
      ),
    ) -
    sum(
      data.movimentacoes_investimentos.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          x.tipo === "aplicacao" &&
          (x.data ?? "") < months[0].key,
      ),
    ) +
    sum(
      data.movimentacoes_investimentos.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          x.tipo === "resgate" &&
          (x.data ?? "") < months[0].key,
      ),
    );
  const timeline = months.map((month) => {
    const receitas = sum(
      data.receitas.filter(
        (x) => active(x) && x.status !== "pendente" && inMonth(x, month.key),
      ),
    );
    const despesas = sum(
      data.despesas.filter(
        (x) =>
          active(x) &&
          x.status === "pago" &&
          x.tipo !== "pagamento_cartao" &&
          inMonth(x, month.key),
      ),
    );
    const faturas = sum(
      data.faturas_cartao.filter(
        (x) => x.status === "paga" && inMonth(x, month.key, "paga_em"),
      ),
    );
    const aportes = sum(
      data.aportes_metas.filter(
        (x) => active(x) && x.status !== "pendente" && inMonth(x, month.key),
      ),
    );
    const aplicacoes = sum(
      data.movimentacoes_investimentos.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          x.tipo === "aplicacao" &&
          inMonth(x, month.key),
      ),
    );
    const resgates = sum(
      data.movimentacoes_investimentos.filter(
        (x) =>
          active(x) &&
          x.status !== "pendente" &&
          x.tipo === "resgate" &&
          inMonth(x, month.key),
      ),
    );
    running += receitas - despesas - faturas - aportes - aplicacoes + resgates;
    return {
      ...month,
      receitas,
      despesas: despesas + faturas + aportes + aplicacoes - resgates,
      faturas,
      aportes,
      aplicacoes,
      resgates,
      saldo: running,
      patrimonio: running + goalsTotal + investedTotal,
    };
  });
  const budgets = data.orcamentos_categoria.map((budget) => {
    const category = data.categorias_financeiras.find(
      (x) => x.id === budget.categoria_id,
    );
    const spent = categoryMap[category?.nome ?? ""] ?? 0,
      limit = budget.limite ?? 0;
    return {
      ...budget,
      nome: category?.nome ?? "Categoria",
      gasto: spent,
      percentual: percent(spent, limit),
    };
  });
  const alerts = [
    ...overdueExpenses.slice(0, 3).map((item) => ({
      type: "danger",
      title: "Despesa atrasada",
      description: `${item.descricao} · ${item.data}`,
    })),
    ...openInvoices.slice(0, 2).map((item) => ({
      type: "warning",
      title: "Fatura a vencer",
      description: `Vencimento ${item.data_vencimento}`,
    })),
    ...monthPredicted.slice(0, 2).map((item) => ({
      type: "info",
      title: "Receita pendente",
      description: item.descricao ?? "Receita prevista",
    })),
    ...budgets
      .filter((x) => x.percentual >= 80)
      .map((item) => ({
        type: item.percentual >= 100 ? "danger" : "warning",
        title: "Orçamento em alerta",
        description: `${item.nome}: ${formatPercent(item.percentual)} utilizado`,
      })),
  ];
  const patrimony = calculateNetWorth(
    availableBalance,
    goalsTotal,
    investedTotal,
  );
  const incomeCommitment = calculateSalaryCommitment(
    committedMoney,
    salaryExpected || predictedRevenue,
  );
  const validationErrors = validateDashboardData({
    availableBalance,
    freePredicted,
    patrimony,
    committedMoney,
    incomeCommitment,
  });
  return {
    currentMonth,
    availableBalance,
    goalsTotal,
    investedTotal,
    patrimony,
    realBalance: availableBalance,
    projectedBalance: freePredicted,
    committedMoney,
    validationErrors,
    salaryExpected,
    salaryReceived,
    salaryPending: Math.max(0, salaryExpected - salaryReceived),
    received,
    predictedIncome: sum(monthPredicted),
    predictedRevenue,
    paidExpenses,
    pendingExpenses,
    overdueExpenses: sum(overdueExpenses),
    openInvoiceTotal,
    openInvoiceValue,
    closedInvoiceValue,
    paidInvoiceValue,
    contributions,
    plannedContributions,
    plannedInvestments,
    appliedInvestments,
    redeemedInvestments,
    recurringCommitment,
    freeReal,
    freePredicted,
    economy: freeReal,
    savingsRate: percent(contributions + appliedInvestments, received),
    incomeCommitment,
    cardSalaryPercent: percent(openInvoiceTotal, salaryExpected),
    fixedSalaryPercent: percent(
      paidExpenses + pendingExpenses + recurringCommitment,
      salaryExpected,
    ),
    goalsSalaryPercent: percent(
      contributions + plannedContributions,
      salaryExpected,
    ),
    investmentSalaryPercent: percent(appliedInvestments, salaryExpected),
    categories: Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    })),
    paymentMethods: Object.entries(paymentMap).map(([name, value]) => ({
      name,
      value,
    })),
    timeline,
    budgets,
    alerts,
  };
}
