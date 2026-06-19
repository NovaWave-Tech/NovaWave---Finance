# Monetização

Monetização não está ativa na versão pessoal. Quando aprovada, deve ser implementada exclusivamente por Edge Functions para checkout, portal e webhook.

O webhook será a fonte de verdade da assinatura, com validação de assinatura Stripe, eventos idempotentes e liberação Premium apenas após persistência no banco. Nenhuma chave secreta será enviada ao navegador.
