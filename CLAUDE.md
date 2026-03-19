# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Database (Prisma)
npm run db:generate      # Regenerate Prisma client (required after schema changes)
npm run db:push          # Push schema changes without migration (dev only)
npm run db:migrate       # Create a new migration file
npm run db:migrate:deploy # Apply migrations in production
npm run db:studio        # Open Prisma Studio UI
npm run db:seed          # Seed base data (roles, system settings)

# Testing
npm run test             # Vitest unit/integration tests
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright E2E tests (auto-starts dev server)
npm run test:e2e:ui      # Playwright interactive UI
npm run test:health      # Critical user journey tests only

# Single test file (Vitest)
npx vitest run tests/features/prescriptions.spec.ts

# Workers & admin
npm run worker:ai        # BullMQ AI queue worker (requires Redis)
npm run createsuperuser  # Create admin user interactively
```

## Architecture

### Routing & API
- **Next.js 14 App Router**: pages under `app/`, API routes at `app/api/**/route.ts`
- API routes are thin: they validate input (Zod), call a service in `lib/`, and return the result
- `middleware.ts` handles auth redirects, 2FA enforcement, rate limiting, and security headers globally
- Public routes (no auth required): `/`, `/auth/**`, `/validar`, `/verify`, `/invite`, `/questionnaire`, `/help`

### Auth Flow
- **NextAuth v4** with credentials (email+password) and WebAuthn (passkeys)
- **TOTP 2FA** is enforced for ADMIN, DOCTOR, NURSE, PHARMACIST, PSYCHOLOGIST, and RECEPTIONIST roles — users without 2FA are redirected to `/settings?tab=security&force2fa=true`
- Session data includes `role`, `tenantId`, `twoFactorEnabled`, and `needsPasswordChange`
- `lib/with-auth.ts` wraps API routes to enforce auth; `lib/require-2fa.ts` for 2FA-sensitive endpoints

### Database
- **Prisma ORM** + PostgreSQL 15; schema at `prisma/schema.prisma` (97 models, ~4000 lines)
- Singleton client at `lib/prisma.ts` — always import from there, never instantiate directly
- After any schema edit: run `npm run db:generate` before running code or tests
- Migrations live in `prisma/migrations/` and are applied with `db:migrate:deploy` in production

### Service Layer
- Business logic lives in `lib/*-service.ts` files, not in API routes or components
- Key services: `prescription-cfm-validator.ts`, `medical-records-service.ts`, `consultation-service.ts`, `patient-service.ts`, `pdf-signing-service.ts`, `audit-logger.ts`
- `lib/ai-queue-factory.ts` creates either an in-memory or Redis-backed BullMQ queue depending on `REDIS_ENABLED`

### PDF & Digital Signatures
- PDF generation uses **Gotenberg** (Docker service) with fallback to Puppeteer
- Signatures are **PAdES-B/T** (ICP-Brasil compliant) via `lib/pdf-signing-service.ts`
- Cloud signers (BirdID, VIDaaS) are in `lib/cloud-signing-service.ts`
- A1 certificates (`.pfx`/`.p12`) are used server-side; A3/cloud are user-initiated flows

### AI Integration
- AI provider is configurable: `AI_PROVIDER=ollama` (local) or `AI_PROVIDER=groq` (cloud)
- `lib/ai-client.ts` abstracts the provider; queue jobs go through `lib/ai-bullmq-queue.ts`
- Background jobs run in a separate worker process (`npm run worker:ai`)

### Multi-tenancy
- The `Tenant` model and `UserTenant` join table support multiple clinics/organizations
- `tenantId` is always scoped in queries for tenant-isolated data

## Brazilian Medical Compliance

### CFM 2.299/2021 — Prescriptions
Every prescription PDF must include: cabeçalho (CRM, RQE, address), superinscrição (patient CPF, DOB), inscrição (DCB drug name), subinscrição (quantity — in words for controlled drugs), adscrição (explicit posology), fechamento (digital signature + QR code).

**Forbidden phrasings** that must be caught by `lib/prescription-cfm-validator.ts`:
- `tomar se dor` → must specify dose and interval
- `conforme necessário` → must specify maximum doses per day
- `gotas` / `colheres` → must use mL

### ANVISA Portaria 344/98 — Controlled Drugs
- Classes A1, A2, B1, B2, C1, C4, C5 require special handling
- Quantity must appear in full words in parentheses
- Antimicrobials: 2 vias required, 10-day validity, must be marked controlled

### LGPD (Lei 13.709/2018)
- Every write operation that touches patient data must be logged to the `AuditLog` model via `lib/audit-logger.ts`
- Patient data exports, deletions, and consent changes go through dedicated API routes — do not bypass them

### PDF Format
PAdES-B/T signatures, PDF/A-1a, 300 DPI minimum, Georgia font, 2 cm margins (ABNT A4), 1.5 line spacing.

## Environment Variables

Key vars beyond standard Next.js:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `ENCRYPTION_KEY` | AES-256 for sensitive fields |
| `NEXTAUTH_SECRET` | Session signing |
| `REDIS_ENABLED` / `REDIS_HOST` | Queue and rate limiting |
| `GOTENBERG_URL` | PDF generation service |
| `AI_PROVIDER` | `ollama` or `groq` |
| `OLLAMA_URL` / `OLLAMA_MODEL` | Local LLM |
| `GROQ_API_KEY` / `GROQ_MODEL` | Cloud LLM fallback |
| `CRON_SECRET` | Authenticates scheduled job endpoints |
| `BLOCKED_CLIENT_KEYS` | Comma-separated keys blocked by rate limiter |

## Testing

- Unit/integration tests use **Vitest** with setup in `tests/setup.ts` (mocks crypto and fetch)
- Feature tests are in `tests/features/`; factories in `tests/factories/`
- E2E tests (Playwright) run against a real dev server; critical paths are in `tests/human-journey.spec.ts`
- Tests that touch the database should use the test database defined in `.env.test`

## Key Conventions

- Path alias `@/` maps to the repo root (`lib/`, `components/`, `app/`, `types/`)
- Zod validation schemas live in `lib/validation-schemas.ts` (forms) and `lib/validation-schemas-api.ts` (API)
- All input sanitization goes through `lib/sanitization.ts` before DB writes
- Brazilian CPF validation: use `lib/cpf-utils.ts`, never roll your own
- Error responses from API routes: use `lib/api-error-handler.ts` for consistent shape
