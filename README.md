# Kanban Workspace

Base monorepo for a Trello-like kanban using:

- Next.js + TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- WebSocket

## Structure

- `apps/web`: Next.js frontend
- `apps/api`: NestJS backend with REST, Prisma, Redis and Socket.IO gateway
- `docker-compose.yml`: local PostgreSQL and Redis

## Getting started

1. Copy `.env.example` to `.env`
2. Start infrastructure with `docker compose up -d`
3. Install dependencies with `npm install`
4. Generate Prisma client with `npm run prisma:generate`
5. Run migrations with `npm run prisma:migrate`
6. Start both apps with `npm run dev`

## First delivery

This scaffold already includes:

- health endpoint
- seeded in-memory kanban board for UI bootstrapping
- WebSocket gateway for board events
- Redis connectivity
- Prisma schema for users, boards, lists and cards
