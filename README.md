# NovaWave Finance

Gestão financeira pessoal com React, Chakra UI, Supabase e Vercel. Inclui autenticação, dashboard responsivo, receitas, despesas, metas e aportes, cartões e parcelas, investimentos, calendário, recorrências, categorias e relatórios.

## Executar

```bash
npm install
copy .env.example .env.local
npm run dev
```

O sistema funciona exclusivamente com dados reais do Supabase. Crie o projeto, execute apenas `supabase/setup_complete.sql` no SQL Editor e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Sem essas variáveis, o acesso fica bloqueado e nenhum dado substituto é exibido.

## Segurança e localização

- Row Level Security em todas as tabelas; cada usuário acessa somente seus dados.
- Sessão persistente via Supabase Auth.
- Valores em BRL, datas em pt-BR e timezone `America/Sao_Paulo`.
- Formulários validados e feedback por toast.

O deploy na Vercel é direto; o `vercel.json` já contém o rewrite necessário para SPA.
