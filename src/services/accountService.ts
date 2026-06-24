import type { FinanceRecord } from "../types/database";
import type { FinanceData } from "./financialEngine";

const active = (item: FinanceRecord) =>
  !["cancelada", "cancelado", "estornada", "inativa", "arquivada"].includes(
    item.status ?? "",
  ) && item.ativa !== false;

const sum = (items: FinanceRecord[], field: keyof FinanceRecord = "valor") =>
  items.reduce((total, item) => total + (Number(item[field]) || 0), 0);

export type AccountBalance = FinanceRecord & {
  entradas: number;
  saidas: number;
  transferenciasEntrada: number;
  transferenciasSaida: number;
  saldo: number;
};

export function calculateAccountBalances(data: FinanceData): AccountBalance[] {
  return data.contas_financeiras
    .filter(active)
    .map((account) => {
      const receitas = data.receitas.filter(
        (item) =>
          active(item) &&
          item.status !== "pendente" &&
          item.conta_id === account.id,
      );
      const despesas = data.despesas.filter(
        (item) =>
          active(item) &&
          item.status === "pago" &&
          item.conta_id === account.id,
      );
      const faturas = data.faturas_cartao.filter(
        (item) => item.status === "paga" && item.conta_id === account.id,
      );
      const aportes = data.aportes_metas.filter(
        (item) =>
          active(item) &&
          item.status !== "pendente" &&
          !String(item.origem ?? "").startsWith("transferencia:") &&
          item.conta_id === account.id,
      );
      const investimentos = data.movimentacoes_investimentos.filter(
        (item) =>
          active(item) &&
          item.status !== "pendente" &&
          !String(item.origem ?? "").startsWith("transferencia:") &&
          item.conta_id === account.id,
      );
      const transferenciasEntrada = data.transferencias_internas.filter(
        (item) =>
          active(item) &&
          item.status !== "pendente" &&
          item.conta_destino_id === account.id,
      );
      const transferenciasSaida = data.transferencias_internas.filter(
        (item) =>
          active(item) &&
          item.status !== "pendente" &&
          item.conta_origem_id === account.id,
      );
      const applications = investimentos.filter((item) => item.tipo === "aplicacao");
      const redemptions = investimentos.filter((item) => item.tipo === "resgate");
      const entradas = sum(receitas) + sum(redemptions);
      const saidas = sum(despesas) + sum(faturas) + sum(aportes) + sum(applications);
      const saldo =
        Number(account.saldo_inicial ?? 0) +
        entradas +
        sum(transferenciasEntrada) -
        saidas -
        sum(transferenciasSaida);
      return {
        ...account,
        entradas,
        saidas,
        transferenciasEntrada: sum(transferenciasEntrada),
        transferenciasSaida: sum(transferenciasSaida),
        saldo,
      };
    });
}

export function getConsolidatedAccountBalance(data: FinanceData) {
  return calculateAccountBalances(data).reduce(
    (total, account) => total + account.saldo,
    0,
  );
}
