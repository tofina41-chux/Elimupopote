# ElimuPopote — "Education Everywhere"

A multi-tenant, mobile-first, offline-capable corporate LMS MVP for the Kenyan market.

Monorepo layout: `server/` (Express + Prisma + Postgres/Supabase) and `client/` (React 18 + Vite PWA).

## Tech stack

- **DB**: PostgreSQL via Supabase (local CLI or hosted project)
- **ORM**: Prisma
- **API**: Express.js + TypeScript
- **Client**: React 18 + Vite, TypeScript, Mantine UI, react-i18next
- **Offline**: Dexie.js (IndexedDB) + custom sync queue, vite-plugin-pwa service worker
- **Auth**: Supabase Auth pattern, mocked as phone-OTP (OTP is always `123456` in this MVP)
- **AI**: OpenAI API for course generation, with a deterministic mock fallback so the MVP runs with zero external keys

## 1. Prerequisites

- Node.js 18+
- Docker (for `supabase start`, which runs local Postgres) — or a hosted Supabase project's connection string
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase`

## 2. Database setup

```bash
# from repo root
supabase init        # only if you don't already have a supabase/ config at root
supabase start        # spins up local Postgres on port 54322 + Studio UI
```

Grab the `DATABASE_URL` Supabase prints (or use your hosted project's connection string).

## 3. Server setup

```bash
cd server
cp .env.example .env
# paste your DATABASE_URL into .env; OPENAI_API_KEY is optional (mock used if blank)

npm install
npm run prisma:migrate     # creates all tables from prisma/schema.prisma
npx prisma db seed         # OR: npm run seed — creates demo tenant/users/course

# Apply Row Level Security policies (Postgres-level tenant isolation)
supabase db push --include-all
# (or run supabase/migrations/0001_init_rls.sql directly via Supabase Studio's SQL editor)

npm run dev                # API on http://localhost:4000
```

## 4. Client setup

```bash
cd client
npm install
npm run dev                # PWA on http://localhost:5173
```

The client defaults to `VITE_API_URL=http://localhost:4000`; override with a `.env` file in `client/` if your API runs elsewhere.

## 5. Demo accounts (from the seed script)

All accounts use OTP code **`123456`**.

| Role | Phone | Tenant |
|---|---|---|
| Superadmin | +254700000001 | — (no tenant) |
| Tenant Admin | +254700000002 | Safiri Logistics Ltd |
| Instructor | +254700000003 | Safiri Logistics Ltd |
| Learner | +254700000004 | Safiri Logistics Ltd (enrolled in "Customer Service Excellence") |

## 6. Key flows to try

1. **Login** as the Instructor → `/courses/new` → describe a course (try Swahili: "Nataka kozi ya usalama kazini") → Generate with AI → edit → Save as draft → Publish.
2. **Login** as the Learner → open the seeded "Customer Service Excellence" course → it downloads into IndexedDB. Turn off Wi-Fi (or DevTools → Network → Offline) → keep taking quizzes — progress saves locally and the sync badge shows pending changes. Reconnect — it auto-syncs.
3. **Login** as the Tenant Admin → `/analytics` → see at-risk learners (anyone inactive 7+ days, or never started).
4. **Login** as the Superadmin → `/` → mock M-Pesa top-up increases the tenant's seat limit (KES 500 = 1 seat).

## 7. Multi-tenancy model

Every business table carries a `tenantId`. Isolation is enforced twice:

1. **App layer** — `tenantScope` middleware (`server/src/middleware/tenantScope.ts`) resolves the caller's tenant from their JWT and injects it into every query; non-superadmins can never override it via request params.
2. **DB layer (RLS)** — `server/supabase/migrations/0001_init_rls.sql` adds Postgres Row Level Security policies as a backstop, reading the tenant id out of the JWT's `app_metadata.tenant_id` claim.

## 8. Offline sync model

- `client/src/db/db.ts` — Dexie schema (`courses`, `lessons`, `progress`, `syncQueue`) and the two core functions: `cacheCourseForOffline` (download) and `recordLessonAttempt` (local-first write + queue).
- `client/src/db/syncManager.ts` — drains the queue to `POST /api/sync/progress` whenever online; uses **last-write-wins** conflict resolution based on the device-side `clientUpdatedAt` timestamp (not server arrival time).
- `server/src/controllers/sync.controller.ts` — applies the batch, skipping any item the server already has a newer value for.
- `client/vite.config.ts` — PWA service worker precaches the app shell and runtime-caches `GET /api/courses*` / `GET /api/analytics*` as a coarse HTTP-level fallback alongside the Dexie cache.

## 9. AI course generation flow

`Instructor textarea → POST /api/courses/generate → server/src/services/openai.service.ts`:
- Detects English vs. Swahili from the prompt.
- If `OPENAI_API_KEY` is set, calls OpenAI with a strict JSON-shape system prompt.
- Otherwise, returns a realistic deterministic mock in the same shape — so the entire instructor flow (generate → edit → save → publish) works with no external dependencies.

Nothing is persisted until the instructor explicitly saves (`POST /api/courses`), so regenerating is free and side-effect-free.

## Known MVP simplifications (intentional, called out for transparency)

- OTP is mocked (`123456` always works); no real SMS provider wired in.
- M-Pesa is mocked; no real Daraja API integration or signature verification.
- JWTs are locally signed/verified, not real Supabase Auth JWKS verification.
- Video lessons are link placeholders only — no video hosting/streaming.
- AI mock generator is template-based, not a real LLM call, when no API key is present.
