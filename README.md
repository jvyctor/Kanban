# Kanban

Aplicacao de kanban em monorepo com frontend e backend separados.

## Stack

- Next.js
- NestJS
- PostgreSQL
- Prisma
- Redis
- Socket.IO
- Docker Compose

## Estrutura

```text
.
|-- apps/
|   |-- api/
|   `-- web/
|-- docker-compose.yml
|-- package.json
`-- README.md
```

## Requisitos

- Node.js
- npm
- Docker
- Docker Compose

## Configuracao

Crie os arquivos de ambiente a partir dos exemplos:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Se estiver no Windows sem `cp`, crie os arquivos manualmente.

## Banco de dados

Suba a infraestrutura:

```bash
docker compose up -d
```

Conexao do PostgreSQL:

- Host: `localhost`
- Port: `5433`
- Database: `kanban`
- User: `postgres`
- Password: `postgres`

## Instalacao

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

## Execucao

```bash
npm run dev
```

Enderecos:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
```

## pgAdmin

Exemplo de consulta:

```sql
select * from boards;
select * from board_lists order by position;
select * from cards order by list_id, position;
```
