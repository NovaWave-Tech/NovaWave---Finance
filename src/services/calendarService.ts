import type { FinanceRecord, Profile } from "../types/database";
import type { FinanceData } from "./financialEngine";
import {
  getCalendarSkipKeys,
  isCalendarSkipEvent,
  isSkippedThisMonth,
} from "./calendarExceptions";
import { getMonthlyFinancialData, getSalaryForCompetence } from "./salaryService";

const event = (
  id: string,
  titulo: string,
  tipo: string,
  data: string | undefined,
  valor: number | undefined,
  status: string | undefined,
  sourceTable: string,
): FinanceRecord => ({
  id: `${sourceTable}:${id}`,
  titulo,
  tipo,
  data,
  valor,
  status,
  origem: sourceTable,
  source: sourceTable,
  is_virtual: sourceTable === "profile_salary",
});
export function buildFinancialCalendar(
  data: FinanceData,
  month: string,
  profile?: Profile | null,
) {
  data = getMonthlyFinancialData({ data, profile, month });
  const skipped = getCalendarSkipKeys(data, month);
  const events: FinanceRecord[] = [];
  const salary = getSalaryForCompetence({
    profile,
    incomes: data.receitas,
    month,
  });
  if (
    salary &&
    !isSkippedThisMonth(skipped, "profile_salary", "profile_salary") &&
    !isSkippedThisMonth(skipped, "receitas", salary.id)
  )
    events.push(
      event(
        salary.id,
        salary.descricao ?? "Salário mensal",
        "Salário",
        salary.data,
        salary.valor,
        salary.status,
        salary.is_virtual ? "profile_salary" : "receitas",
      ),
    );
  data.receitas
    .filter(
      (x) =>
        x.status !== "cancelada" &&
        x.data?.startsWith(month) &&
        !isSkippedThisMonth(skipped, "receitas", x.id) &&
        x.id !== salary?.id,
    )
    .forEach((x) =>
      events.push(
        event(
          x.id,
          x.descricao ?? "Receita",
          x.origem === "salario_perfil" ? "Salário" : "Receita",
          x.data,
          x.valor,
          x.status,
          "receitas",
        ),
      ),
    );
  data.despesas
    .filter(
      (x) =>
        x.status !== "cancelado" &&
        x.tipo !== "pagamento_cartao" &&
        x.data?.startsWith(month),
    )
    .forEach((x) =>
      events.push(
        event(
          x.id,
          x.descricao ?? "Despesa",
          "Despesa",
          x.data,
          x.valor,
          x.status,
          "despesas",
        ),
      ),
    );
  data.faturas_cartao
    .filter((x) => x.status !== "cancelada" && x.data_vencimento?.startsWith(month))
    .forEach((x) =>
      events.push(
        event(
          x.id,
          "Fatura de cartão",
          "Fatura",
          x.data_vencimento,
          x.valor,
          x.status,
          "faturas_cartao",
        ),
      ),
    );
  data.faturas_cartao
    .filter((x) => x.status !== "cancelada" && x.data_fechamento?.startsWith(month))
    .forEach((x) =>
      events.push(
        event(
          `${x.id}:fechamento`,
          "Fechamento de cartão",
          "Fechamento",
          x.data_fechamento,
          x.valor,
          x.status,
          "faturas_cartao",
        ),
      ),
    );
  const cardsWithInvoice = new Set(
    data.faturas_cartao
      .filter((x) => x.competencia?.startsWith(month))
      .map((x) => x.cartao_id),
  );
  data.cartoes
    .filter(
      (x) =>
        (x.status ?? "ativa") === "ativa" && !cardsWithInvoice.has(x.id),
    )
    .forEach((x) => {
      const closingDay = Math.min(
        x.dia_fechamento ?? 1,
        new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(),
      );
      const dueDay = Math.min(
        x.dia_vencimento ?? 1,
        new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(),
      );
      if (isSkippedThisMonth(skipped, "cartoes", x.id)) return;
      events.push(
        event(
          `${x.id}:fechamento-previsto`,
          `Fechamento · ${x.nome ?? "Cartão"}`,
          "Fechamento",
          `${month}-${String(closingDay).padStart(2, "0")}`,
          0,
          "previsto",
          "cartoes",
        ),
      );
      events.push(
        event(
          `${x.id}:vencimento-previsto`,
          `Vencimento · ${x.nome ?? "Cartão"}`,
          "Fatura",
          `${month}-${String(dueDay).padStart(2, "0")}`,
          0,
          "previsto",
          "cartoes",
        ),
      );
    });
  data.parcelas_cartao
    .filter(
      (x) =>
        x.status !== "paga" &&
        x.competencia?.startsWith(month) &&
        !isSkippedThisMonth(skipped, "parcelas_cartao", x.id) &&
        !cardsWithInvoice.has(x.cartao_id),
    )
    .forEach((x) => {
      const card = data.cartoes.find((card) => card.id === x.cartao_id);
      const day = Math.min(
        card?.dia_vencimento ?? 1,
        new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate(),
      );
      events.push(
        event(
          x.id,
          `Parcela ${x.numero}/${x.total} · ${card?.nome ?? "Cartão"}`,
          "Fatura",
          `${month}-${String(day).padStart(2, "0")}`,
          x.valor,
          "pendente",
          "parcelas_cartao",
        ),
      );
    });
  if (month >= new Date().toISOString().slice(0, 7))
    data.metas_financeiras
      .filter(
        (x) =>
          (x.status ?? "em_andamento") === "em_andamento" &&
          (x.aporte_mensal ?? 0) > 0 &&
          !isSkippedThisMonth(skipped, "metas_financeiras", x.id),
      )
      .forEach((x) => {
        const contributed = data.aportes_metas
          .filter(
            (item) =>
              item.meta_id === x.id &&
              item.status !== "pendente" &&
              item.data?.startsWith(month),
          )
          .reduce((total, item) => total + (item.valor ?? 0), 0);
        const remaining = Math.max(0, (x.aporte_mensal ?? 0) - contributed);
        if (!remaining) return;
        events.push(
          event(
            x.id,
            `Aporte planejado · ${x.nome}`,
            "Meta",
            `${month}-01`,
            remaining,
            "pendente",
            "metas_financeiras",
          ),
        );
      });
  data.aportes_metas
    .filter((x) => x.data?.startsWith(month))
    .forEach((x) =>
      events.push(
        event(
          x.id,
          `Aporte · ${data.metas_financeiras.find((goal) => goal.id === x.meta_id)?.nome ?? "Meta"}`,
          "Meta",
          x.data,
          x.valor,
          x.status ?? "confirmado",
          "aportes_metas",
        ),
      ),
    );
  data.movimentacoes_investimentos
    .filter((x) => x.status !== "cancelada" && x.data?.startsWith(month))
    .forEach((x) =>
      events.push(
        event(
          x.id,
          x.status === "pendente"
            ? "Investimento planejado"
            : `Movimentação · ${x.tipo}`,
          x.tipo === "resgate" ? "Resgate" : "Investimento",
          x.data,
          x.valor,
          x.status,
          "movimentacoes_investimentos",
        ),
      ),
    );
  data.contas_recorrentes
    .filter(
      (x) =>
        x.ativa !== false &&
        (x.status ?? "ativa") === "ativa" &&
        !isSkippedThisMonth(skipped, "contas_recorrentes", x.id) &&
        !x.ultima_geracao?.startsWith(month),
    )
    .forEach((x) => {
      const day = Math.min(
        x.dia_vencimento ?? 1,
        new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate(),
      );
      events.push(
        event(
          x.id,
          x.descricao ?? "Recorrência",
          x.tipo ?? "Recorrente",
          `${month}-${String(day).padStart(2, "0")}`,
          x.valor,
          "pendente",
          "contas_recorrentes",
        ),
      );
    });
  data.eventos_financeiros
    .filter((x) => x.data?.startsWith(month) && !isCalendarSkipEvent(x))
    .forEach((x) => events.push({ ...x, id: `eventos_financeiros:${x.id}` }));
  return [...new Map(events.map((item) => [item.id, item])).values()].sort(
    (a, b) => (a.data ?? "").localeCompare(b.data ?? ""),
  );
}
