-- NovaWave Finance — instalação completa do Supabase
-- Execute este arquivo uma única vez no SQL Editor.

begin;
set local timezone = 'America/Sao_Paulo';

-- NovaWave Finance — schema inicial (timezone da aplicação: America/Sao_Paulo)
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.perfil (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text, email text, moeda text not null default 'BRL', timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null, valor numeric(14,2) not null check(valor > 0), categoria text not null, data date not null, forma_recebimento text not null default 'Pix', observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null, valor numeric(14,2) not null check(valor > 0), categoria text not null, data date not null,
  forma_pagamento text not null check(forma_pagamento in ('Pix','Dinheiro','Débito','Crédito','Boleto','Transferência')), status text not null default 'pago' check(status in ('pendente','pago')), observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null, banco text not null, limite numeric(14,2) not null check(limite >= 0), dia_fechamento smallint not null check(dia_fechamento between 1 and 31), dia_vencimento smallint not null check(dia_vencimento between 1 and 31), cor text not null default '#0F62FE',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.compras_cartao (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, cartao_id uuid not null references public.cartoes(id) on delete cascade,
  descricao text not null, valor_total numeric(14,2) not null check(valor_total > 0), quantidade_parcelas int not null default 1 check(quantidade_parcelas > 0), valor_parcela numeric(14,2) not null check(valor_parcela > 0), data_compra date not null, categoria text not null, observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.parcelas_cartao (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  compra_id uuid not null references public.compras_cartao(id) on delete cascade, cartao_id uuid not null references public.cartoes(id) on delete cascade,
  numero int not null check(numero > 0), total int not null check(total > 0), valor numeric(14,2) not null check(valor > 0), competencia date not null, status text not null default 'pendente' check(status in ('pendente','paga')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(compra_id,numero)
);
create table if not exists public.faturas_cartao (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  cartao_id uuid not null references public.cartoes(id) on delete cascade, competencia date not null, data_fechamento date not null, data_vencimento date not null,
  valor numeric(14,2) not null default 0, status text not null default 'aberta' check(status in ('aberta','fechada','paga','atrasada','cancelada')), paga_em timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(cartao_id,competencia)
);
create table if not exists public.metas_financeiras (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null, valor_alvo numeric(14,2) not null check(valor_alvo > 0), valor_atual numeric(14,2) not null default 0 check(valor_atual >= 0), aporte_mensal numeric(14,2) not null default 0 check(aporte_mensal >= 0), data_objetivo date not null, categoria text not null, observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.aportes_metas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  meta_id uuid not null references public.metas_financeiras(id) on delete cascade, valor numeric(14,2) not null check(valor > 0), data date not null, observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.investimentos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null, tipo text not null check(tipo in ('CDB','Tesouro Direto','Ações','Fundo','Cripto','Outros')), valor_investido numeric(14,2) not null check(valor_investido > 0), data_investimento date not null, instituicao text not null, observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.movimentacoes_investimentos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  investimento_id uuid not null references public.investimentos(id) on delete cascade, tipo text not null check(tipo in ('aplicacao','resgate','rendimento')),
  valor numeric(14,2) not null check(valor > 0), data date not null, status text not null default 'confirmada' check(status in ('pendente','confirmada','cancelada')), observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.eventos_financeiros (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null, tipo text not null, data date not null, recorrente boolean not null default false, status text not null default 'pendente' check(status in ('pendente','pago')), valor numeric(14,2), observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.contas_recorrentes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null, valor numeric(14,2) not null check(valor > 0), categoria text not null, dia_vencimento smallint not null check(dia_vencimento between 1 and 31), forma_pagamento text not null, ativa boolean not null default true, ultima_geracao date, observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null, tipo text not null check(tipo in ('receita','despesa','meta','investimento')), cor text not null default '#0F62FE', icone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,nome,tipo)
);
create table if not exists public.orcamentos_categoria (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.categorias_financeiras(id) on delete cascade, competencia date not null, limite numeric(14,2) not null check(limite > 0), alerta_percentual numeric(5,2) not null default 80,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,categoria_id,competencia)
);
create table if not exists public.contas_financeiras (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null, tipo text not null, banco text, cor text not null default '#0F62FE',
  saldo_inicial numeric(14,2) not null default 0, status text not null default 'ativa', observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transferencias_internas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conta_origem_id uuid references public.contas_financeiras(id) on delete set null,
  conta_destino_id uuid references public.contas_financeiras(id) on delete set null,
  destino_tipo text not null default 'conta', destino_id uuid,
  valor numeric(14,2) not null check(valor > 0), data date not null, status text not null default 'confirmada', observacao text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Evoluções incrementais para instalações que já possuíam as tabelas.
alter table public.receitas add column if not exists forma_recebimento text not null default 'Pix';
-- CREATE TABLE IF NOT EXISTS não adiciona colunas ausentes em tabelas antigas.
alter table public.perfil add column if not exists moeda text not null default 'BRL';
alter table public.perfil add column if not exists timezone text not null default 'America/Sao_Paulo';
alter table public.perfil add column if not exists telefone text;
alter table public.perfil add column if not exists avatar_url text;
alter table public.perfil add column if not exists tema text not null default 'dark';
alter table public.perfil add column if not exists dia_salario smallint;
alter table public.perfil add column if not exists salario_previsto numeric(14,2);
alter table public.perfil add column if not exists forma_recebimento_salario text not null default 'Pix';
alter table public.perfil add column if not exists salario_recorrente boolean not null default false;
alter table public.perfil add column if not exists salario_auto_recebido boolean not null default false;
alter table public.perfil add column if not exists objetivo_principal text;
alter table public.perfil add column if not exists banco_principal text;
alter table public.perfil add column if not exists conta_principal text;
alter table public.perfil add column if not exists visualizacao_inicial text not null default 'dashboard';
alter table public.perfil add column if not exists notificacoes boolean not null default true;
alter table public.perfil add column if not exists salary_recurring_enabled boolean not null default false;
alter table public.perfil add column if not exists salary_confirm_on_day boolean not null default false;
alter table public.perfil add column if not exists salary_day smallint;
alter table public.perfil add column if not exists monthly_salary numeric(14,2);
alter table public.perfil add column if not exists main_bank text;
alter table public.perfil add column if not exists main_account text;
alter table public.perfil add column if not exists default_currency text not null default 'BRL';
alter table public.perfil add column if not exists financial_main_goal text;
alter table public.perfil add column if not exists alert_invoice_due_enabled boolean not null default false;
alter table public.perfil add column if not exists alert_expense_due_enabled boolean not null default false;
alter table public.perfil add column if not exists alert_budget_80_enabled boolean not null default false;
alter table public.perfil add column if not exists alert_goal_delay_enabled boolean not null default false;
alter table public.perfil add column if not exists alert_salary_received_enabled boolean not null default false;
alter table public.perfil add column if not exists alert_days_before integer not null default 3;
update public.perfil set
  salary_recurring_enabled = coalesce(salary_recurring_enabled, salario_recorrente, false),
  salary_confirm_on_day = coalesce(salary_confirm_on_day, salario_auto_recebido, false),
  salary_day = coalesce(salary_day, dia_salario),
  monthly_salary = coalesce(monthly_salary, salario_previsto),
  main_bank = coalesce(main_bank, banco_principal),
  main_account = coalesce(main_account, conta_principal),
  default_currency = coalesce(default_currency, moeda, 'BRL'),
  financial_main_goal = coalesce(financial_main_goal, objetivo_principal),
  salario_recorrente = coalesce(salario_recorrente, salary_recurring_enabled, false),
  salario_auto_recebido = coalesce(salario_auto_recebido, salary_confirm_on_day, false),
  dia_salario = coalesce(dia_salario, salary_day),
  salario_previsto = coalesce(salario_previsto, monthly_salary),
  banco_principal = coalesce(banco_principal, main_bank),
  conta_principal = coalesce(conta_principal, main_account),
  moeda = coalesce(moeda, default_currency, 'BRL'),
  objetivo_principal = coalesce(objetivo_principal, financial_main_goal);
alter table public.receitas add column if not exists status text not null default 'recebida';
alter table public.receitas add column if not exists recorrente boolean not null default false;
alter table public.receitas add column if not exists dia_recebimento smallint;
alter table public.receitas add column if not exists origem text;
alter table public.receitas add column if not exists competencia date;
alter table public.receitas add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.receitas add column if not exists tipo text not null default 'avulsa';
alter table public.despesas add column if not exists status text not null default 'pago';
alter table public.despesas add column if not exists tipo text not null default 'variavel';
alter table public.despesas add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.compras_cartao add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.metas_financeiras add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.investimentos add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.contas_recorrentes add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete set null;
alter table public.despesas add column if not exists origem text;
alter table public.despesas add column if not exists competencia date;
alter table public.cartoes add column if not exists status text not null default 'ativa';
alter table public.metas_financeiras add column if not exists status text not null default 'em_andamento';
alter table public.investimentos add column if not exists status text not null default 'ativo';
alter table public.aportes_metas add column if not exists status text not null default 'confirmado';
alter table public.aportes_metas add column if not exists origem text;
alter table public.aportes_metas add column if not exists competencia date;
alter table public.movimentacoes_investimentos add column if not exists origem text;
alter table public.movimentacoes_investimentos add column if not exists competencia date;
alter table public.contas_recorrentes add column if not exists tipo text not null default 'despesa';
alter table public.contas_recorrentes add column if not exists status text not null default 'ativa';
alter table public.contas_recorrentes add column if not exists origem text;
alter table public.contas_recorrentes add column if not exists meta_id uuid references public.metas_financeiras(id) on delete set null;
alter table public.contas_recorrentes add column if not exists investimento_id uuid references public.investimentos(id) on delete set null;
alter table public.categorias_financeiras add column if not exists status text not null default 'ativa';
alter table public.eventos_financeiros add column if not exists status text not null default 'pendente';
alter table public.eventos_financeiros add column if not exists origem text;
alter table public.eventos_financeiros add column if not exists competencia date;
alter table public.cartoes add column if not exists ativo boolean not null default true;
alter table public.compras_cartao add column if not exists status text not null default 'ativa';
alter table public.compras_cartao add column if not exists primeira_competencia date;
alter table public.compras_cartao add column if not exists estabelecimento text;
alter table public.compras_cartao add column if not exists tags text[] not null default '{}';
alter table public.parcelas_cartao add column if not exists fatura_id uuid references public.faturas_cartao(id) on delete set null;
alter table public.parcelas_cartao add column if not exists data_vencimento date;
update public.parcelas_cartao p
set fatura_id = f.id,
    data_vencimento = coalesce(p.data_vencimento, f.data_vencimento)
from public.faturas_cartao f
where p.fatura_id is null
  and p.user_id = f.user_id
  and p.cartao_id = f.cartao_id
  and date_trunc('month', p.competencia) = date_trunc('month', f.competencia);
alter table public.receitas add column if not exists conta_id uuid references public.contas_financeiras(id) on delete set null;
alter table public.despesas add column if not exists conta_id uuid references public.contas_financeiras(id) on delete set null;
alter table public.faturas_cartao add column if not exists conta_id uuid references public.contas_financeiras(id) on delete set null;
alter table public.aportes_metas add column if not exists conta_id uuid references public.contas_financeiras(id) on delete set null;
alter table public.movimentacoes_investimentos add column if not exists conta_id uuid references public.contas_financeiras(id) on delete set null;
alter table public.contas_financeiras add column if not exists banco text;
alter table public.contas_financeiras add column if not exists cor text not null default '#0F62FE';
alter table public.contas_financeiras add column if not exists saldo_inicial numeric(14,2) not null default 0;
alter table public.contas_financeiras add column if not exists status text not null default 'ativa';
alter table public.transferencias_internas add column if not exists status text not null default 'confirmada';

alter table public.receitas drop constraint if exists receitas_status_check;
alter table public.receitas add constraint receitas_status_check check(status in ('recebida','pendente','cancelada'));
alter table public.despesas drop constraint if exists despesas_status_check;
alter table public.despesas add constraint despesas_status_check check(status in ('pendente','pago','atrasado','cancelado'));
alter table public.despesas drop constraint if exists despesas_tipo_check;
alter table public.despesas add constraint despesas_tipo_check check(tipo in ('fixa','variavel','recorrente','avulsa','pagamento_cartao'));
alter table public.compras_cartao drop constraint if exists compras_cartao_status_check;
alter table public.compras_cartao add constraint compras_cartao_status_check check(status in ('ativa','cancelada','estornada'));
alter table public.parcelas_cartao drop constraint if exists parcelas_cartao_status_check;
alter table public.parcelas_cartao add constraint parcelas_cartao_status_check check(status in ('pendente','faturada','paga','cancelada','estornada'));

create unique index if not exists receitas_salario_competencia_uidx on public.receitas(user_id,origem,competencia) where origem='salario_perfil';
create unique index if not exists receitas_recorrencia_competencia_uidx on public.receitas(user_id,origem,competencia) where origem like 'recorrencia:%';
create unique index if not exists despesas_recorrencia_competencia_uidx on public.despesas(user_id,origem,competencia) where origem like 'recorrencia:%';
create unique index if not exists despesas_pagamento_fatura_uidx on public.despesas(user_id,origem) where origem like 'fatura:%';
create unique index if not exists aportes_recorrencia_competencia_uidx on public.aportes_metas(user_id,origem,competencia) where origem like 'recorrencia:%';
create unique index if not exists investimentos_recorrencia_competencia_uidx on public.movimentacoes_investimentos(user_id,origem,competencia) where origem like 'recorrencia:%';
create unique index if not exists contas_recorrentes_origem_uidx on public.contas_recorrentes(user_id,origem) where origem is not null;
create unique index if not exists eventos_excecao_calendario_uidx on public.eventos_financeiros(user_id,origem,competencia) where tipo='excecao_calendario';
create index if not exists receitas_conta_id_idx on public.receitas(conta_id);
create index if not exists despesas_conta_id_idx on public.despesas(conta_id);
create index if not exists faturas_cartao_conta_id_idx on public.faturas_cartao(conta_id);
create index if not exists parcelas_cartao_fatura_id_idx on public.parcelas_cartao(fatura_id);
create index if not exists parcelas_cartao_competencia_idx on public.parcelas_cartao(user_id,competencia);
create index if not exists aportes_metas_conta_id_idx on public.aportes_metas(conta_id);
create index if not exists movimentacoes_investimentos_conta_id_idx on public.movimentacoes_investimentos(conta_id);
create index if not exists transferencias_internas_origem_idx on public.transferencias_internas(conta_origem_id);
create index if not exists transferencias_internas_destino_idx on public.transferencias_internas(conta_destino_id);

alter table public.categorias_financeiras drop constraint if exists categorias_financeiras_tipo_check;
alter table public.categorias_financeiras add constraint categorias_financeiras_tipo_check check(tipo in ('receita','despesa','cartao','meta','investimento','transferencia'));
alter table public.metas_financeiras drop constraint if exists metas_financeiras_status_check;
alter table public.metas_financeiras add constraint metas_financeiras_status_check check(status in ('em_andamento','concluida','pausada','cancelada'));
alter table public.cartoes drop constraint if exists cartoes_status_check;
alter table public.cartoes add constraint cartoes_status_check check(status in ('ativa','inativa'));
alter table public.contas_recorrentes drop constraint if exists contas_recorrentes_tipo_check;
alter table public.contas_recorrentes add constraint contas_recorrentes_tipo_check check(tipo in ('despesa','receita','assinatura','aporte','investimento'));
alter table public.contas_recorrentes drop constraint if exists contas_recorrentes_status_check;
alter table public.contas_recorrentes add constraint contas_recorrentes_status_check check(status in ('ativa','pausada','cancelada'));
alter table public.movimentacoes_investimentos drop constraint if exists movimentacoes_investimentos_tipo_check;
alter table public.movimentacoes_investimentos add constraint movimentacoes_investimentos_tipo_check check(tipo in ('aplicacao','resgate','rendimento','ajuste'));
alter table public.contas_financeiras drop constraint if exists contas_financeiras_tipo_check;
alter table public.contas_financeiras add constraint contas_financeiras_tipo_check check(tipo in ('Conta Corrente','Conta Poupança','Conta Investimento','Carteira','Caixa'));
alter table public.contas_financeiras drop constraint if exists contas_financeiras_status_check;
alter table public.contas_financeiras add constraint contas_financeiras_status_check check(status in ('ativa','inativa','arquivada'));
alter table public.transferencias_internas drop constraint if exists transferencias_internas_destino_tipo_check;
alter table public.transferencias_internas add constraint transferencias_internas_destino_tipo_check check(destino_tipo in ('conta','meta','investimento','reserva'));
alter table public.transferencias_internas drop constraint if exists transferencias_internas_status_check;
alter table public.transferencias_internas add constraint transferencias_internas_status_check check(status in ('pendente','confirmada','cancelada'));

do $$ declare t text; begin
  foreach t in array array['perfil','receitas','despesas','cartoes','compras_cartao','parcelas_cartao','faturas_cartao','metas_financeiras','aportes_metas','investimentos','movimentacoes_investimentos','eventos_financeiros','contas_recorrentes','categorias_financeiras','orcamentos_categoria','contas_financeiras','transferencias_internas'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "Usuário acessa apenas os próprios dados" on public.%I',t);
    execute format('create policy "Usuário acessa apenas os próprios dados" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',t);
    execute format('drop trigger if exists set_%I_updated_at on public.%I',t,t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
    execute format('create index if not exists %I on public.%I(user_id)',t||'_user_id_idx',t);
  end loop;
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.perfil(user_id,email,nome,salario_previsto,objetivo_principal)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'nome',''),nullif(new.raw_user_meta_data->>'salario_previsto','')::numeric,new.raw_user_meta_data->>'objetivo_principal')
  on conflict(user_id) do nothing;
  insert into public.categorias_financeiras(user_id,nome,tipo,cor,icone) values
    (new.id,'Salário','receita','#22C55E','WalletCards'),(new.id,'Freelance','receita','#0F62FE','BriefcaseBusiness'),
    (new.id,'Alimentação','despesa','#F59E0B','Utensils'),(new.id,'Moradia','despesa','#6C3BFF','House'),
    (new.id,'Transporte','despesa','#0F62FE','Car'),(new.id,'Saúde','despesa','#EF4444','HeartPulse'),
    (new.id,'Investimentos','investimento','#22C55E','TrendingUp'),(new.id,'Objetivos','meta','#6C3BFF','Target')
  on conflict(user_id,nome,tipo) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Bucket privado para anexos financeiros; caminhos devem começar pelo UUID do usuário.
insert into storage.buckets (id, name, public) values ('finance-files', 'finance-files', false) on conflict (id) do nothing;
drop policy if exists "Usuário lê os próprios arquivos" on storage.objects;
drop policy if exists "Usuário envia os próprios arquivos" on storage.objects;
drop policy if exists "Usuário atualiza os próprios arquivos" on storage.objects;
drop policy if exists "Usuário remove os próprios arquivos" on storage.objects;
create policy "Usuário lê os próprios arquivos" on storage.objects for select to authenticated using (bucket_id = 'finance-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Usuário envia os próprios arquivos" on storage.objects for insert to authenticated with check (bucket_id = 'finance-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Usuário atualiza os próprios arquivos" on storage.objects for update to authenticated using (bucket_id = 'finance-files' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'finance-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Usuário remove os próprios arquivos" on storage.objects for delete to authenticated using (bucket_id = 'finance-files' and (storage.foldername(name))[1] = auth.uid()::text);


commit;
