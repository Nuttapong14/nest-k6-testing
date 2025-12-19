# nest-k6-testing (Constitution API + k6 load tests)

NestJS API for managing a “constitution” (principles, performance standards, governance rules, search, payments) with JWT auth + Postgres/Redis, plus k6 load testing scripts.

## Requirements

- Node.js + npm
- Docker + Docker Compose (Postgres + Redis)
- k6 (already used by `npm run loadtest:*`)

## Quick start

```bash
npm install
cp .env.example .env

# start Postgres + Redis and run migrations (includes seed data)
npm run db:setup

# start the API
npm run start:dev
```

Swagger UI is available at `http://localhost:3000/api-docs`.

## Environment variables

See `.env.example`.

Key values used by the app:
- `PORT` (default `3000`)
- `API_PREFIX` (default `api`) → all API routes are under `/<API_PREFIX>/...` (ex: `/api/auth/login`)
- `DB_*` (Postgres connection)
- `REDIS_HOST`, `REDIS_PORT` (Redis cache for TypeORM)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (JWT access/refresh tokens)
- `CORS_ORIGIN` (comma-separated)

## Seeded test users

The migration `src/database/migrations/1765970827000-SeedInitialData.ts` seeds users for local testing:
- `admin@constitution.app` / `Test1234!`
- `editor@constitution.app` / `Test1234!`
- `viewer@constitution.app` / `Test1234!`
- `qa@constitution.app` / `Test1234!`
- `dev@constitution.app` / `Test1234!`

## Common commands

```bash
# build
npm run build

# run unit tests
npm test

# run e2e tests
npm run test:e2e

# run migrations
npm run migration:run
```

## Load testing (k6)

k6 scripts live in `tests/k6/`.

```bash
# quick smoke load (2 minutes)
npm run loadtest:quick

# focused tests
npm run loadtest:auth
npm run loadtest:search
npm run loadtest:payment
npm run loadtest:constitution
npm run loadtest:performance
npm run loadtest:governance
npm run loadtest:health

# full suite
npm run loadtest:all
```

### k6 config via env

All scripts support:
- `BASE_URL` (default `http://localhost:3000`)
- `API_PREFIX` (default `api`)

Load tuning:
- `STAGE_SCALE` (default `1`) → multiplies each stage target (ex: `0.1` = 10% load)
- `MAX_VUS` / `MIN_VUS` → caps stage targets after scaling
- `HTTP_TIMEOUT` (ex: `10s`, `30s`) → per-request timeout for k6 HTTP calls

Auth scripts also support overriding credentials:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `EDITOR_EMAIL`, `EDITOR_PASSWORD`
- `VIEWER_EMAIL`, `VIEWER_PASSWORD`

Example:
```bash
BASE_URL=http://localhost:3000 API_PREFIX=api ADMIN_EMAIL=admin@constitution.app ADMIN_PASSWORD=Test1234! npm run loadtest:quick
```

To run the full suite even if some tests fail thresholds, use `npm run loadtest:all` (continues; exits non-zero if any failed). Use `npm run loadtest:all:failfast` to stop on first failure.

## Troubleshooting

- If `/items` (search) returns errors, ensure migrations/seed data ran and Redis is running (`docker-compose ps`).
- If you change `.env`, restart the API process.
