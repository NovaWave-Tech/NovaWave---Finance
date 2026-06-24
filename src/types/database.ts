export type FinanceTable =
  | "receitas"
  | "despesas"
  | "metas_financeiras"
  | "investimentos"
  | "cartoes"
  | "compras_cartao"
  | "parcelas_cartao"
  | "faturas_cartao"
  | "aportes_metas"
  | "movimentacoes_investimentos"
  | "orcamentos_categoria"
  | "eventos_financeiros"
  | "contas_recorrentes"
  | "categorias_financeiras"
  | "contas_financeiras"
  | "transferencias_internas";

export interface FinanceRecord {
  id: string;
  user_id?: string;
  descricao?: string;
  nome?: string;
  valor?: number;
  categoria?: string;
  data?: string;
  forma_pagamento?: string;
  observacao?: string;
  valor_alvo?: number;
  valor_atual?: number;
  aporte_mensal?: number;
  data_objetivo?: string;
  valor_investido?: number;
  data_investimento?: string;
  tipo?: string;
  instituicao?: string;
  forma_recebimento?: string;
  banco?: string;
  limite?: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  cor?: string;
  valor_total?: number;
  quantidade_parcelas?: number;
  valor_parcela?: number;
  cartao_id?: string;
  data_compra?: string;
  compra_id?: string;
  numero?: number;
  total?: number;
  competencia?: string;
  meta_id?: string;
  titulo?: string;
  recorrente?: boolean;
  status?: string;
  ativa?: boolean;
  ultima_geracao?: string | null;
  icone?: string;
  categoria_id?: string;
  conta_id?: string | null;
  conta_origem_id?: string | null;
  conta_destino_id?: string | null;
  destino_tipo?: string;
  destino_id?: string | null;
  saldo_inicial?: number;
  dia_recebimento?: number;
  origem?: string;
  data_fechamento?: string;
  data_vencimento?: string;
  paga_em?: string;
  investimento_id?: string;
  rendimento?: number;
  alerta_percentual?: number;
  limite_categoria?: number;
  created_at?: string;
  updated_at?: string;
  is_virtual?: boolean;
  source?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  moeda: string;
  timezone: string;
  telefone?: string | null;
  avatar_url?: string | null;
  tema?: string;
  dia_salario?: number | null;
  salario_previsto?: number | null;
  forma_recebimento_salario?: string;
  salario_recorrente?: boolean;
  salario_auto_recebido?: boolean;
  objetivo_principal?: string | null;
  banco_principal?: string | null;
  conta_principal?: string | null;
  visualizacao_inicial?: string;
  notificacoes?: boolean;
  alert_invoice_due_enabled?: boolean;
  alert_expense_due_enabled?: boolean;
  alert_budget_80_enabled?: boolean;
  alert_goal_delay_enabled?: boolean;
  alert_salary_received_enabled?: boolean;
  alert_days_before?: number | null;
  salary_recurring_enabled?: boolean;
  salary_confirm_on_day?: boolean;
  salary_day?: number | null;
  monthly_salary?: number | null;
  main_bank?: string | null;
  main_account?: string | null;
  default_currency?: string | null;
  financial_main_goal?: string | null;
}
