# InLove Ecommerce

Sistema web de gestao comercial para uma loja de moda intima, criado como projeto de portfolio. A aplicacao cobre fluxos de varejo, atacado, consignacao, clientes, estoque, financeiro, notas fiscais e dashboards operacionais.

Este repositorio foi higienizado para compartilhamento publico: nao inclui chaves reais, certificados, notas fiscais, dados de clientes reais, arquivos `.env`, `node_modules` ou builds gerados.

## Stack

- React
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- shadcn/ui
- React Router

## Estrutura

- `in-love-barbara-main/`: aplicacao principal.
- `.github/workflows/deploy-pages.yml`: build automatico para GitHub Pages.
- `in-love-barbara-main/docs/`: notas tecnicas e orientacoes de seguranca.

## Configuracao obrigatoria

Antes de usar com backend real, crie `in-love-barbara-main/.env.local` a partir de `in-love-barbara-main/.env.example` e configure:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nao coloque `service_role`, senhas administrativas, tokens fiscais, certificados ou qualquer segredo privado em variaveis `VITE_`. Tudo que comeca com `VITE_` entra no bundle publico do navegador.

Operacoes administrativas devem ficar em Supabase Edge Functions, backend proprio ou outro ambiente server-side.

## Desenvolvimento

```bash
cd in-love-barbara-main
npm install
npm run dev
```

## Build

```bash
cd in-love-barbara-main
npm run build
```

## Status de seguranca deste snapshot

- Sem historico Git antigo.
- Sem chaves reais no codigo atual.
- Sem dados fiscais ou certificados.
- Dados locais em `src/data/*.json` sao exemplos anonimizados para demo.
- Dependencias auditadas com `npm audit --omit=dev`.

## Portfolio

Este projeto demonstra habilidades em frontend moderno, modelagem de fluxos comerciais, integracao com backend como servico, organizacao de componentes, telas administrativas e preocupacoes praticas com seguranca de credenciais.
