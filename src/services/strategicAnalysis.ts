import type { FinanceRecord, FinanceTable, Profile } from "../types/database";
import {
  calculateFinancialSnapshot,
  type FinanceData,
} from "./financialEngine";

const sum = (items: FinanceRecord[], field: keyof FinanceRecord = "valor") =>
  items.reduce((total, item) => total + (Number(item[field]) || 0), 0);

const active = (item: FinanceRecord) =>
  !["cancelada", "cancelado", "estornada", "inativa"].includes(
    item.status ?? "",
  ) && item.ativa !== false;

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const inMonth = (
  item: FinanceRecord,
  month: string,
  field: keyof FinanceRecord = "data",
) => String(item[field] ?? "").startsWith(month);

const percent = (value: number, total: number) =>
  total ? (value / total) * 100 : 0;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export type StrategicData = Record<FinanceTable, FinanceRecord[]>;

export function calculateStrategicAnalysis(
  data: StrategicData,
  profile?: Profile | null,
  reference = new Date(),
) {
  const snapshot = calculateFinancialSnapshot(
    data as FinanceData,
    reference,
    profile,
  );
  const currentMonth = monthKey(reference);
  const previousMonth = monthKey(addMonths(reference, -1));
  const salary = snapshot.salaryExpected || snapshot.predictedRevenue;
  const currentRevenue = sum(
    data.receitas.filter((x) => active(x) && inMonth(x, currentMonth)),
  );
  const previousRevenue = sum(
    data.receitas.filter((x) => active(x) && inMonth(x, previousMonth)),
  );
  const yearlyRevenue = sum(
    data.receitas.filter((x) =>
      String(x.data ?? "").startsWith(String(reference.getFullYear())),
    ),
  );
  const lastYearRevenue = sum(
    data.receitas.filter((x) =>
      String(x.data ?? "").startsWith(String(reference.getFullYear() - 1)),
    ),
  );
  const currentExpenses =
    sum(data.despesas.filter((x) => active(x) && inMonth(x, currentMonth))) +
    snapshot.openInvoiceTotal;
  const previousExpenses = sum(
    data.despesas.filter((x) => active(x) && inMonth(x, previousMonth)),
  );
  const yearlyExpenses = sum(
    data.despesas.filter((x) =>
      String(x.data ?? "").startsWith(String(reference.getFullYear())),
    ),
  );
  const lastYearExpenses = sum(
    data.despesas.filter((x) =>
      String(x.data ?? "").startsWith(String(reference.getFullYear() - 1)),
    ),
  );
  const fixedExpenses = sum(
    data.despesas.filter(
      (x) =>
        active(x) &&
        inMonth(x, currentMonth) &&
        ["fixa", "recorrente", "pagamento_cartao"].includes(x.tipo ?? ""),
    ),
  );
  const variableExpenses = sum(
    data.despesas.filter(
      (x) =>
        active(x) &&
        inMonth(x, currentMonth) &&
        !["fixa", "recorrente", "pagamento_cartao"].includes(x.tipo ?? ""),
    ),
  );
  const emergencyGoals = data.metas_financeiras.filter((x) =>
    `${x.nome ?? ""} ${x.categoria ?? ""}`.toLowerCase().includes("reserva"),
  );
  const emergencyReserve = sum(emergencyGoals, "valor_atual");
  const averageMonthlyExpenses =
    snapshot.timeline.length > 0
      ? snapshot.timeline.reduce((total, item) => total + item.despesas, 0) /
        snapshot.timeline.length
      : currentExpenses;
  const emergencyCoverage = averageMonthlyExpenses
    ? emergencyReserve / averageMonthlyExpenses
    : 0;
  const patrimonyGrowth =
    snapshot.timeline.length > 1
      ? percent(
          snapshot.timeline.at(-1)!.patrimonio - snapshot.timeline[0].patrimonio,
          Math.abs(snapshot.timeline[0].patrimonio) || 1,
        )
      : 0;
  const investedPercent = percent(
    snapshot.appliedInvestments + snapshot.plannedInvestments,
    salary,
  );
  const savedPercent = percent(
    snapshot.contributions + snapshot.freeReal,
    salary,
  );
  const cardDependence = snapshot.cardSalaryPercent;
  const commitment = snapshot.incomeCommitment;
  const score = Math.round(
    clamp(investedPercent * 1.4, 0, 20) +
      clamp(savedPercent * 1.3, 0, 20) +
      clamp(25 - cardDependence * 0.35, 0, 25) +
      clamp(25 - commitment * 0.28, 0, 25) +
      clamp(emergencyCoverage * 3.5, 0, 10) +
      clamp(patrimonyGrowth > 0 ? patrimonyGrowth / 2 : 0, 0, 10),
  );
  const scoreLabel =
    score < 40
      ? "Crítico"
      : score < 60
        ? "Atenção"
        : score < 80
          ? "Bom"
          : "Excelente";
  const recurringIncome = sum(
    data.contas_recorrentes.filter(
      (x) => active(x) && (x.status ?? "ativa") === "ativa" && x.tipo === "receita",
    ),
  );
  const recurringExpenses = sum(
    data.contas_recorrentes.filter(
      (x) =>
        active(x) &&
        (x.status ?? "ativa") === "ativa" &&
        !["receita", "aporte", "investimento"].includes(x.tipo ?? "despesa"),
    ),
  );
  const recurringGoals = sum(
    data.metas_financeiras.filter(
      (x) => active(x) && (x.status ?? "em_andamento") === "em_andamento",
    ),
    "aporte_mensal",
  );
  const recurringInvestments = sum(
    data.contas_recorrentes.filter(
      (x) =>
        active(x) &&
        (x.status ?? "ativa") === "ativa" &&
        x.tipo === "investimento",
    ),
  );
  const monthlyFree =
    salary + recurringIncome - recurringExpenses - recurringGoals - recurringInvestments;
  const project = (months: number, boost = 0) => ({
    months,
    saldo: snapshot.realBalance + (monthlyFree + boost) * months,
    patrimonio:
      snapshot.patrimony +
      (monthlyFree > 0 ? monthlyFree * months : 0) +
      (recurringGoals + recurringInvestments + boost) * months,
  });
  const projections = {
    base: [3, 6, 12].map((months) => project(months)),
    saveMore: [3, 6, 12].map((months) => project(months, salary * 0.05)),
    reduceExpenses: [3, 6, 12].map((months) =>
      project(months, recurringExpenses * 0.1),
    ),
    increaseInvestments: [3, 6, 12].map((months) =>
      project(months, recurringInvestments + salary * 0.03),
    ),
  };
  const goals = data.metas_financeiras.filter(active).map((goal) => {
    const target = goal.valor_alvo ?? 0;
    const current = goal.valor_atual ?? 0;
    const remaining = Math.max(0, target - current);
    const desired = goal.data_objetivo
      ? new Date(`${goal.data_objetivo}T12:00:00`)
      : addMonths(reference, 12);
    const monthsLeft = Math.max(
      1,
      (desired.getFullYear() - reference.getFullYear()) * 12 +
        desired.getMonth() -
        reference.getMonth(),
    );
    const requiredMonthly = remaining / monthsLeft;
    const currentMonthly = goal.aporte_mensal ?? 0;
    const forecastMonths = currentMonthly
      ? Math.ceil(remaining / currentMonthly)
      : Infinity;
    return {
      ...goal,
      remaining,
      progress: percent(current, target),
      requiredMonthly,
      forecastMonths,
      probability: clamp(percent(currentMonthly, requiredMonthly || 1)),
    };
  });
  const subscriptions = data.contas_recorrentes.filter(
    (x) =>
      active(x) &&
      (x.status ?? "ativa") === "ativa" &&
      (x.tipo === "assinatura" ||
        ["spotify", "netflix", "prime", "chatgpt", "disney"].some((name) =>
          (x.descricao ?? "").toLowerCase().includes(name),
        )),
  );
  const nextAlerts = [
    ...data.faturas_cartao
      .filter((x) => active(x) && x.status !== "paga")
      .map((x) => ({
        id: `fatura-${x.id}`,
        severity: "alta",
        category: "Faturas próximas",
        date: x.data_vencimento ?? x.competencia ?? currentMonth,
        title: "Fatura em aberto",
        action: "Reserve saldo para pagamento ou marque a fatura como paga.",
      })),
    ...data.despesas
      .filter((x) => active(x) && x.status !== "pago" && (x.data ?? "") < reference.toISOString().slice(0, 10))
      .map((x) => ({
        id: `despesa-${x.id}`,
        severity: "alta",
        category: "Despesas vencidas",
        date: x.data ?? currentMonth,
        title: x.descricao ?? "Despesa vencida",
        action: "Quite ou renegocie esse compromisso.",
      })),
    ...snapshot.budgets
      .filter((x) => x.percentual >= 80)
      .map((x) => ({
        id: `orcamento-${x.id}`,
        severity: x.percentual >= 100 ? "alta" : "média",
        category: "Gastos acima do orçamento",
        date: currentMonth,
        title: `${x.nome}: ${x.percentual.toFixed(0)}% do limite`,
        action: "Reduza novos gastos nessa categoria até fechar o mês.",
      })),
    ...goals
      .filter((x) => x.probability < 70)
      .map((x) => ({
        id: `meta-${x.id}`,
        severity: "média",
        category: "Metas atrasadas",
        date: x.data_objetivo ?? currentMonth,
        title: x.nome ?? "Meta atrasada",
        action: `Aporte sugerido: ${Math.ceil(x.requiredMonthly)} por mês.`,
      })),
    ...(commitment > 70
      ? [
          {
            id: "comprometimento-renda",
            severity: "alta",
            category: "Salário comprometido em excesso",
            date: currentMonth,
            title: `${commitment.toFixed(0)}% da renda comprometida`,
            action: "Revise faturas, recorrências e despesas fixas.",
          },
        ]
      : []),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const compare = (
    label: string,
    current: number,
    previous: number,
    yearly: number,
    lastYear: number,
  ) => ({
    label,
    current,
    previous,
    monthDiff: current - previous,
    monthPercent: percent(current - previous, Math.abs(previous) || 1),
    yearly,
    lastYear,
    yearPercent: percent(yearly - lastYear, Math.abs(lastYear) || 1),
    trend: current >= previous ? "crescimento" : "queda",
  });
  const comparison = [
    compare("Receitas", currentRevenue, previousRevenue, yearlyRevenue, lastYearRevenue),
    compare("Despesas", currentExpenses, previousExpenses, yearlyExpenses, lastYearExpenses),
    compare("Economia", snapshot.freeReal, previousRevenue - previousExpenses, snapshot.economy, 0),
    compare("Investimentos", snapshot.appliedInvestments, 0, snapshot.investedTotal, 0),
    compare("Metas", snapshot.contributions, 0, snapshot.goalsTotal, 0),
    compare("Cartões", snapshot.openInvoiceTotal, 0, snapshot.openInvoiceTotal, 0),
  ];
  const assets = snapshot.patrimony;
  const liabilities =
    snapshot.openInvoiceTotal +
    snapshot.pendingExpenses +
    snapshot.recurringCommitment +
    snapshot.plannedContributions +
    snapshot.plannedInvestments;
  const insights = [
    snapshot.categories[0]
      ? `Seu maior gasto do mês está em ${snapshot.categories[0].name}.`
      : "Sem concentração relevante de gastos neste mês.",
    cardDependence > 35
      ? "Seu uso do cartão está alto em relação à renda."
      : "O uso do cartão está sob controle.",
    snapshot.freeReal > 0
      ? "Você está fechando o mês com sobra realizada."
      : "O orçamento realizado está apertado neste mês.",
    goals.some((goal) => goal.probability >= 100)
      ? "Pelo menos uma meta está no ritmo certo."
      : "Algumas metas precisam de aportes maiores para chegar no prazo.",
    score >= 80
      ? "Sua saúde financeira está em nível excelente."
      : "Há espaço claro para melhorar reserva, cartão ou comprometimento de renda.",
  ];
  return {
    snapshot,
    health: {
      salary,
      extraIncome: Math.max(0, currentRevenue - salary),
      fixedExpenses,
      variableExpenses,
      cardUse: snapshot.openInvoiceTotal,
      investedTotal: snapshot.investedTotal,
      goalsTotal: snapshot.goalsTotal,
      emergencyReserve,
      patrimony: snapshot.patrimony,
      score,
      scoreLabel,
      emergencyCoverage,
      positives: insights.filter((text) => !text.includes("alto") && !text.includes("apertado")),
      attentions: insights.filter((text) => text.includes("alto") || text.includes("apertado") || text.includes("espaço")),
    },
    projections,
    alerts: nextAlerts,
    comparison,
    goals,
    emergency: {
      averageMonthlyExpenses,
      reserved: emergencyReserve,
      coverage: emergencyCoverage,
      label:
        emergencyCoverage < 1
          ? "Crítica"
          : emergencyCoverage < 3
            ? "Baixa"
            : emergencyCoverage < 6
              ? "Boa"
              : "Excelente",
    },
    monthlyPlan: {
      predictedRevenue: snapshot.predictedRevenue,
      received: snapshot.received,
      predictedExpenses: snapshot.pendingExpenses + snapshot.paidExpenses,
      realizedExpenses: snapshot.paidExpenses,
      plannedInvestments: snapshot.plannedInvestments,
      realizedInvestments: snapshot.appliedInvestments,
      plannedContributions: snapshot.plannedContributions,
      realizedContributions: snapshot.contributions,
      freePredicted: snapshot.freePredicted,
      freeReal: snapshot.freeReal,
      committedMoney: snapshot.committedMoney,
    },
    subscriptions: {
      items: subscriptions,
      monthly: sum(subscriptions),
      yearly: sum(subscriptions) * 12,
    },
    patrimony: {
      assets,
      liabilities,
      netWorth: assets - liabilities,
      timeline: snapshot.timeline,
    },
    insights,
  };
}
