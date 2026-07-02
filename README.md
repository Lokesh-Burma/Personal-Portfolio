# Portfolio API

Standalone NestJS backend API for portfolio/blog administration.

## Why This Exists

The current portfolio uses Next.js route handlers for a compact full-stack deployment. This service is a separate NestJS backend for learning and production-style backend architecture: modules, DTO validation, guards, repositories, migrations, and independent deployment.

## Features

- Health endpoint
- Admin login with signed HTTP-only session cookie
- Blog CRUD APIs
- Published blog read APIs
- PostgreSQL via `pg`
- SQL migrations
- Swagger docs at `/docs`
- Docker Compose for local Postgres

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm hash-password
# paste ADMIN_PASSWORD_HASH into .env
pnpm db:migrate
pnpm start:dev
```

API base URL:

```txt
http://localhost:4000
```

Swagger:

```txt
http://localhost:4000/docs
```

## Endpoints

Public:

- `GET /health`
- `GET /blogs`
- `GET /blogs/:slug`

Admin:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /admin/blogs`
- `POST /admin/blogs`
- `PATCH /admin/blogs/:id`
- `DELETE /admin/blogs/:id`

## Notes

This app intentionally starts with a simple repository layer over `pg`. If the API grows, the next natural upgrade is Prisma migrations and generated types.
