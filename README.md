# Kanban Workspace

## Tecnologias

### Frontend
- Next.js
- React
- Tailwind CSS
- Framer Motion
- DnD Kit
- Socket.IO Client
- Lucide React

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

## Como executar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

Crie o arquivo `.env` na raiz do projeto com os valores necessarios para banco, redis, frontend e SMTP.

Exemplo:

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

### 3. Subir banco e redis

```bash
docker compose up -d
```

### 4. Gerar o Prisma Client

```bash
npm run prisma:generate
```

### 5. Rodar as migrations

```bash
npm run prisma:migrate
```

### 6. Iniciar o projeto

```bash
npm run dev
```

## Enderecos locais

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
