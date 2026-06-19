# Banco de dados

O instalador único `supabase/setup_complete.sql` cria perfil, receitas, despesas, cartões, compras, parcelas, faturas, metas, aportes, investimentos, movimentações de investimentos, eventos, contas recorrentes, categorias, orçamentos, triggers, índices, RLS e o bucket privado de Storage.

O saldo disponível é calculado por regime de caixa: entram receitas recebidas e resgates; saem despesas e faturas pagas, aportes e aplicações. Compras no cartão afetam limite e fatura, mas não o caixa até o pagamento.

Todas as entidades privadas possuem `user_id`, timestamps, índices e RLS. A policy exige `auth.uid() = user_id` em leitura e escrita. Valores usam `numeric(14,2)` e datas de competência usam `date`; timestamps são armazenados com timezone.

Para uma instalação nova, execute somente `supabase/setup_complete.sql` no SQL Editor. As migrations individuais continuam versionadas apenas para manutenção futura e uso automatizado pela Supabase CLI.
