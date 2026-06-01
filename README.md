<div align="center">
  <img src="in-love-barbara-main/public/in-love-logo-new.png" alt="InLove" width="120" />

  <h1>InLove Ecommerce</h1>

  <p>
    Plataforma web para gestao comercial de moda intima, reunindo vendas, estoque,
    consignacao, atacado, financeiro e notas fiscais em uma experiencia unica.
  </p>

  <p>
    <a href="https://culasss.github.io/InLove-Ecommerce/">Acessar demonstracao</a>
    |
    <a href="#funcionalidades">Funcionalidades</a>
    |
    <a href="#tecnologias">Tecnologias</a>
    |
    <a href="#execucao-local">Execucao local</a>
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=fff" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-ready-3FCF8E?style=for-the-badge&logo=supabase&logoColor=111" />
  </p>
</div>

---

## Visao geral

O **InLove Ecommerce** e um sistema administrativo criado para centralizar a operacao de uma loja de moda intima. A aplicacao organiza rotinas de venda, cadastro, estoque, consignacao, atacado, financeiro e apoio fiscal em uma interface responsiva, com foco em uso diario por equipes comerciais.

O projeto foi estruturado como uma entrega completa de produto: separacao clara de modulos, componentes reutilizaveis, integracao preparada para Supabase, dados de demonstracao higienizados e pipeline de publicacao via GitHub Pages.

## Funcionalidades

| Modulo | Recursos principais |
| --- | --- |
| **Varejo** | Carrinho, itens de venda, pagamentos, historico, devolucoes e relatorios. |
| **Atacado** | Vendas por cliente, controle de pagamentos, devolucoes, analises e emissao auxiliar de documentos. |
| **Consignacao** | Criacao de folhas, controle de lotes, comissoes, devolucoes, pagamentos e acertos. |
| **Produtos e estoque** | Cadastro de produtos, marcas, categorias, fornecedores, estoque minimo, etiquetas e QR Code. |
| **Clientes** | Cadastro, edicao, filtros por tipo de atendimento e apoio a aniversariantes. |
| **Financeiro** | Visao de pagamentos, fechamento, consolidacao e acompanhamento operacional. |
| **Notas fiscais** | Importacao de XML, reconciliacao de produtos, visualizacao, exportacao e apoio a validacao. |
| **Scanner** | Leitura de codigos para acelerar vendas, devolucoes e movimentacoes. |

## Experiencia

- Interface responsiva para desktop e telas menores.
- Componentes consistentes com shadcn/ui e Radix UI.
- Carregamento segmentado por rotas e modulos.
- Estados de carregamento, dialogs, drawers, filtros e controles de busca.
- Fluxos pensados para rotina operacional, com telas densas e objetivas.

## Tecnologias

- **React 18** para a interface.
- **TypeScript** para tipagem e manutencao.
- **Vite** para desenvolvimento e build.
- **Supabase** para autenticacao, banco e storage.
- **TanStack Query** para sincronizacao de dados.
- **Tailwind CSS** e **shadcn/ui** para o design system.
- **React Router** para navegacao.
- **jsPDF**, XML parser e utilitarios fiscais para documentos e apoio a NF-e.

## Estrutura do projeto

```text
.
|-- .github/workflows/          # Deploy automatico no GitHub Pages
|-- in-love-barbara-main/
|   |-- docs/                   # Notas tecnicas e seguranca
|   |-- public/                 # Assets publicos
|   |-- scripts/                # Scripts SQL e utilitarios
|   |-- src/
|   |   |-- components/         # Componentes por dominio
|   |   |-- contexts/           # Contextos globais
|   |   |-- data/               # Dados anonimizados de demonstracao
|   |   |-- hooks/              # Hooks de dados e UI
|   |   |-- integrations/       # Clientes externos
|   |   |-- lib/                # Servicos, adapters e utilitarios
|   |   `-- pages/              # Paginas da aplicacao
|   `-- supabase/               # Configuracoes e migrations
`-- README.md
```

## Seguranca e configuracao

Este snapshot publico foi preparado sem credenciais reais, certificados, XMLs fiscais, dados de clientes ou arquivos de ambiente.

Para conectar a um backend real, crie `in-love-barbara-main/.env.local` a partir de `in-love-barbara-main/.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

> Variaveis `VITE_*` sao incluidas no bundle do navegador. Nunca coloque `service_role`, tokens fiscais, senhas administrativas, certificados ou chaves privadas no frontend.

Operacoes administrativas devem ser executadas em ambiente server-side, como Supabase Edge Functions ou backend proprio. Antes de producao, revise as politicas de RLS, permissoes de storage e fluxo fiscal.

## Execucao local

```bash
git clone https://github.com/cuLasss/InLove-Ecommerce.git
cd InLove-Ecommerce/in-love-barbara-main
npm install
npm run dev
```

O app ficara disponivel em:

```text
http://localhost:8080
```

## Build

```bash
cd in-love-barbara-main
npm run build
```

## Validacao

Comandos usados para validar este snapshot:

```bash
npm ci
npm audit --omit=dev
npm run build
```

Resultado esperado:

- Auditoria de dependencias sem vulnerabilidades moderadas ou criticas.
- Build de producao gerado em `in-love-barbara-main/dist`.
- Deploy automatico pelo GitHub Actions para GitHub Pages.

## Demonstracao

A versao publicada esta disponivel em:

**https://culasss.github.io/InLove-Ecommerce/**

---

<div align="center">
  <strong>InLove Ecommerce</strong><br />
  Gestao comercial, estoque, consignacao e vendas em uma unica plataforma.
</div>
