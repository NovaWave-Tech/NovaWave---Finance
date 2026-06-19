# Arquitetura

O NovaWave Finance usa React, TypeScript, Vite e Chakra UI no frontend; Supabase para Auth, PostgreSQL, Storage e RLS; e Vercel para hospedagem.

## Responsabilidades

- `pages`: composição e fluxo das telas.
- `components`: UI reutilizável; componentes exclusivos permanecem dentro da página.
- `hooks`: estado reutilizável, autenticação e carregamento assíncrono.
- `services`: única fronteira de comunicação com Supabase e APIs externas.
- `utils`: funções puras, cálculos, datas, formatação e validação.
- `types`: contratos compartilhados.
- `theme`: tokens, foundations e overrides Chakra.
- `routes`: guards para sessão, assinatura e administrador.

O produto atual é pessoal. As fronteiras Premium/Admin existem para evolução futura, mas não fazem parte do fluxo liberado.

## Próxima extração

O protótipo visual inicial ainda está consolidado em `App.tsx`. Novos módulos devem nascer na estrutura acima; as telas existentes podem ser extraídas incrementalmente sem alterar comportamento ou banco.
