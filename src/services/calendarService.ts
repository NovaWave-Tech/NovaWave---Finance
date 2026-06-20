import type { FinanceRecord } from "../types/database";
import type { FinanceData } from "./financialEngine";

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
});
export function buildFinancialCalendar(data: FinanceData, month: string) {
  const events: FinanceRecord[] = [];
  data.receitas
    .filter((x) => x.status !== "cancelada" && x.data?.startsWith(month))
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
    .filter(
      (x) => x.status !== "cancelada" && x.data_vencimento?.startsWith(month),
    )
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
  const cardsWithInvoice = new Set(
    data.faturas_cartao
      .filter((x) => x.competencia?.startsWith(month))
      .map((x) => x.cartao_id),
  );
  data.parcelas_cartao
    .filter(
      (x) =>
        x.status !== "paga" &&
        x.competencia?.startsWith(month) &&
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
  data.metas_financeiras
    .filter(
      (x) =>
        (x.status ?? "em_andamento") === "em_andamento" &&
        (x.aporte_mensal ?? 0) > 0,
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
    .filter((x) => x.data?.startsWith(month))
    .forEach((x) => events.push({ ...x, id: `eventos_financeiros:${x.id}` }));
  return [...new Map(events.map((item) => [item.id, item])).values()].sort(
    (a, b) => (a.data ?? "").localeCompare(b.data ?? ""),
  );
}
