# InLove Ecommerce App

Aplicacao React/TypeScript para gestao de ecommerce e loja fisica, com modulos de produtos, clientes, vendas, consignacao, atacado, financeiro e notas fiscais.

## Requisitos

- Node.js 18 ou superior
- npm
- Projeto Supabase configurado para uso real

## Instalacao

```bash
npm install
```

## Ambiente

Copie `.env.example` para `.env.local` e preencha apenas valores publicos do frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nao use `service_role` no frontend. Tokens fiscais, certificados, senhas administrativas e outros segredos devem ficar fora do navegador, em backend proprio ou Supabase Edge Functions.

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy no GitHub Pages

O workflow da raiz do repositorio roda `npm ci` e `npm run build` dentro desta pasta. A base publica e detectada automaticamente pelo nome do repositorio no GitHub Actions.

## Dados de exemplo

Os arquivos em `src/data/*.json` sao dados anonimizados para demo local. Eles nao devem ser substituidos por dados reais de clientes, vendas, notas fiscais ou colaboradores em repositorios publicos.

## Checklist antes de producao

- Configurar Supabase Auth.
- Revisar e ativar RLS nas tabelas.
- Criar bucket de imagens com politicas adequadas.
- Mover operacoes administrativas para backend/server-side.
- Configurar emissao fiscal apenas em ambiente seguro.
