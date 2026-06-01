<div align="center">
  <img src="in-love-barbara-main/public/in-love-logo-new.png" alt="InLove" width="120" />

  <h1>InLove Ecommerce</h1>

  <p>
    Plataforma web para gestão comercial de moda íntima, reunindo vendas, estoque,
    consignação, atacado, financeiro e notas fiscais em uma experiência única.
  </p>

  <p>
    <a href="https://culasss.github.io/InLove-Ecommerce/">Acessar demonstração</a>
    |
    <a href="#funcionalidades">Funcionalidades</a>
    |
    <a href="#tecnologias">Tecnologias</a>
    |
    <a href="#execução-local">Execução local</a>
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=fff" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-ready-3FCF8E?style=for-the-badge&logo=supabase&logoColor=111" />
  </p>
</div>

---

## Visão geral

O **InLove Ecommerce** é um sistema administrativo criado para centralizar a operação de uma loja de moda íntima. A aplicação organiza rotinas de venda, cadastro, estoque, consignação, atacado, financeiro e apoio fiscal em uma interface responsiva, com foco em uso diário por equipes comerciais.

O projeto foi estruturado como uma entrega completa de produto: separação clara de módulos, componentes reutilizáveis, integração preparada para Supabase, dados de demonstração higienizados e pipeline de publicação via GitHub Pages.

## Funcionalidades

| Módulo | Recursos principais |
| --- | --- |
| **Varejo** | Carrinho, itens de venda, pagamentos, histórico, devoluções e relatórios. |
| **Atacado** | Vendas por cliente, controle de pagamentos, devoluções, análises e emissão auxiliar de documentos. |
| **Consignação** | Criação de folhas, controle de lotes, comissões, devoluções, pagamentos e acertos. |
| **Produtos e estoque** | Cadastro de produtos, marcas, categorias, fornecedores, estoque mínimo, etiquetas e QR Code. |
| **Clientes** | Cadastro, edição, filtros por tipo de atendimento e apoio a aniversariantes. |
| **Financeiro** | Visão de pagamentos, fechamento, consolidação e acompanhamento operacional. |
| **Notas fiscais** | Importação de XML, reconciliação de produtos, visualização, exportação e apoio à validação. |
| **Scanner** | Leitura de códigos para acelerar vendas, devoluções e movimentações. |

## Experiência

- Interface responsiva para desktop e telas menores.
- Componentes consistentes com shadcn/ui e Radix UI.
- Carregamento segmentado por rotas e módulos.
- Estados de carregamento, dialogs, drawers, filtros e controles de busca.
- Fluxos pensados para rotina operacional, com telas densas e objetivas.

## Tecnologias

- **React 18** para a interface.
- **TypeScript** para tipagem e manutenção.
- **Vite** para desenvolvimento e build.
- **Supabase** para autenticação, banco e storage.
- **TanStack Query** para sincronização de dados.
- **Tailwind CSS** e **shadcn/ui** para o design system.
- **React Router** para navegação.
- **jsPDF**, XML parser e utilitários fiscais para documentos e apoio à NF-e.

## Estrutura do projeto

```text
.
|-- .github/workflows/          # Deploy automático no GitHub Pages
|-- in-love-barbara-main/
|   |-- docs/                   # Notas técnicas e segurança
|   |-- public/                 # Assets públicos
|   |-- scripts/                # Scripts SQL e utilitários
|   |-- src/
|   |   |-- components/         # Componentes por domínio
|   |   |-- contexts/           # Contextos globais
|   |   |-- data/               # Dados anonimizados de demonstração
|   |   |-- hooks/              # Hooks de dados e UI
|   |   |-- integrations/       # Clientes externos
|   |   |-- lib/                # Serviços, adapters e utilitários
|   |   `-- pages/              # Páginas da aplicação
|   `-- supabase/               # Configurações e migrations
`-- README.md
```

## Segurança e configuração

Este snapshot público foi preparado sem credenciais reais, certificados, XMLs fiscais, dados de clientes ou arquivos de ambiente.

Para conectar a um backend real, crie `in-love-barbara-main/.env.local` a partir de `in-love-barbara-main/.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

> Variáveis `VITE_*` são incluídas no bundle do navegador. Nunca coloque `service_role`, tokens fiscais, senhas administrativas, certificados ou chaves privadas no frontend.

Operações administrativas devem ser executadas em ambiente server-side, como Supabase Edge Functions ou backend próprio. Antes de produção, revise as políticas de RLS, permissões de storage e fluxo fiscal.

## Execução local

```bash
git clone https://github.com/cuLasss/InLove-Ecommerce.git
cd InLove-Ecommerce/in-love-barbara-main
npm install
npm run dev
```

O app ficará disponível em:

```text
http://localhost:8080
```

## Build

```bash
cd in-love-barbara-main
npm run build
```

## Validação

Comandos usados para validar este snapshot:

```bash
npm ci
npm audit --omit=dev
npm run build
```

Resultado esperado:

- Auditoria de dependências sem vulnerabilidades moderadas ou críticas.
- Build de produção gerado em `in-love-barbara-main/dist`.
- Deploy automático pelo GitHub Actions para GitHub Pages.

## Demonstração

A versão publicada está disponível em:

**https://culasss.github.io/InLove-Ecommerce/**

---

<div align="center">
  <strong>InLove Ecommerce</strong><br />
  Gestão comercial, estoque, consignação e vendas em uma única plataforma.
</div>
