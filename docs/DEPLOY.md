# Deploy

1. Crie o projeto no Supabase e execute uma única vez o arquivo `supabase/setup_complete.sql` no SQL Editor.
2. Configure no frontend `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Cadastre `http://localhost:5173` e o domínio oficial nas Redirect URLs do Supabase Auth.
4. Importe o repositório na Vercel e replique somente as variáveis públicas acima.
5. Execute `npm run lint`, `npm test` e `npm run build` antes de publicar.

Nunca coloque `service_role`, segredo Stripe ou tokens administrativos no frontend. Segredos pertencem ao ambiente das Edge Functions.
