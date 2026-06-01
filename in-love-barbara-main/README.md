# InLove Ecommerce App

Aplicação React/TypeScript para gestão de ecommerce e loja física, com módulos de produtos, clientes, vendas, consignação, atacado, financeiro e notas fiscais.

## Requisitos

- Node.js 18 ou superior
- npm
- Projeto Supabase configurado para uso real

## Instalação

```bash
npm install
```

## Ambiente

Copie `.env.example` para `.env.local` e preencha apenas valores públicos do frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Não use `service_role` no frontend. Tokens fiscais, certificados, senhas administrativas e outros segredos devem ficar fora do navegador, em backend próprio ou Supabase Edge Functions.

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy no GitHub Pages

O workflow da raiz do repositório roda `npm ci` e `npm run build` dentro desta pasta. A base pública é detectada automaticamente pelo nome do repositório no GitHub Actions.

## Dados de exemplo

Os arquivos em `src/data/*.json` são dados anonimizados para demo local. Eles não devem ser substituídos por dados reais de clientes, vendas, notas fiscais ou colaboradores em repositórios públicos.

## Checklist antes de produção

- Configurar Supabase Auth.
- Revisar e ativar RLS nas tabelas.
- Criar bucket de imagens com políticas adequadas.
- Mover operações administrativas para backend/server-side.
- Configurar emissão fiscal apenas em ambiente seguro.
