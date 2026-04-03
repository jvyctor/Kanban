# Kanban

Plataforma Kanban full stack com autenticação, colaboração em tempo real, permissões por membro e gestão de tarefas em quadros compartilhados.

## Visão geral

O projeto foi estruturado como monorepo com frontend em Next.js e backend em NestJS. A proposta é entregar uma experiência de produtividade com autenticação, comentários, convites, recuperação de senha, permissões por papel e atualização em tempo real via WebSocket.

## Preview

![Preview do Kanban](./github-preview.png)

## Funcionalidades principais

- Cadastro, login e sessão autenticada
- Recuperação de senha por e-mail
- Criação de quadros, listas e cards
- Drag and drop para mover cards
- Comentários e detalhes por tarefa
- Convites para membros do quadro
- Controle de permissões por usuário
- Atualização em tempo real com Socket.IO
- Dashboard com visão de boards, convites e tarefas

## Arquitetura

- `apps/web`: frontend em Next.js
- `apps/api`: backend em NestJS
- `apps/api/prisma`: schema e migrations do banco
- `docs/production-operations.md`: guia operacional para produção

## Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- Framer Motion
- DnD Kit
- Socket.IO Client

### Backend

- NestJS
- Prisma
- PostgreSQL
- Redis
- Socket.IO
- Nodemailer

### Infraestrutura

- Docker Compose
- npm Workspaces

## Como executar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto com os valores necessários para banco, Redis, frontend e SMTP.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kanban?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_API_URL="http://localhost:3001"
APP_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"
SMTP_FROM="Kanban <seu-email@gmail.com>"
```

### 3. Subir banco e Redis

```bash
docker compose up -d
```

### 4. Gerar o Prisma Client

```bash
npm run prisma:generate
```

### 5. Aplicar migrations

```bash
npm run prisma:migrate
```

### 6. Iniciar a aplicação

```bash
npm run dev
```

## Endereços locais

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Operação e qualidade

- Smoke test: `node scripts/smoke-check.mjs`
- Load test websocket: `node scripts/load-test-websocket.mjs`
- Guia operacional: `docs/production-operations.md`

## Deploy

Para produção, a arquitetura ideal é:

- Frontend: Vercel
- API: Render, Railway ou VPS Node
- Banco: PostgreSQL gerenciado
- Cache: Redis gerenciado

Antes do deploy, valide:

- `APP_URL`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `REDIS_URL`
- credenciais SMTP
