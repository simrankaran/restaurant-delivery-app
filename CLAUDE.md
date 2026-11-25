# CLAUDE.md

Branded ordering + delivery for one restaurant (multi-outlet ready in the schema only): a Next.js website + admin, an Express API and BullMQ worker on one GCP VM, and two Flutter apps (customer; Partner for kitchen + riders).
**Before any work, read `docs/PRD.md`, `docs/BLUEPRINT.md` and your session's prompt in `docs/SESSIONS.md`.**
Those three are generated from `docs/source.md`; change the source first, then regenerate them.
Each session starts in plan mode; merge only when its tests pass.

## Commands

| Command                                        | What it does                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm db:up` / `pnpm db:down`                  | Start / stop local MongoDB (replica set `rs0`) + Redis in Docker          |
| `pnpm dev`                                     | web :3000, API :4000, BullMQ worker, all with reload                      |
| `pnpm test`                                    | Vitest across `packages/shared`, `apps/api`, `apps/web`                   |
| `pnpm test -- --project api`                   | One workspace's tests                                                     |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Types / ESLint / Prettier                                                 |
| `pnpm build`                                   | Next build + tsup bundles (`apps/api/dist/{server,worker,instrument}.js`) |
| `pnpm start`                                   | PM2 with `ecosystem.config.cjs` (production)                              |

First-time setup: `pnpm install`, copy `apps/api/.env.example` → `apps/api/.env` and `apps/web/.env.example` → `apps/web/.env.local`, then `pnpm db:up`.
`GET /health` (and `/api/health`) is 200 only when MongoDB and Redis both answer.

## Layout

- `apps/web` — Next.js App Router: the ordering website `(store)` and `(admin)/admin`. `@/` = `apps/web/`. In dev, `/api/*` is rewritten to the API so the browser sees one origin, as with Nginx in production. The `(kitchen)` and `(rider)` groups are Session 0 placeholders; Session 5 deletes them (those screens live in the Partner app).
- `apps/customer_app`, `apps/partner_app` — Flutter (from Session 9). **Outside the pnpm workspace** (no `package.json`); their API models are generated from `GET /openapi.json`, never hand-written.
- `apps/api` — Express 5. `src/app.ts` builds the app (testable via supertest), `src/server.ts` and `src/worker.ts` are entry points, `src/instrument.ts` is preloaded with `--import` for Sentry.
  - Feature modules: `src/modules/<name>/{routes,service,model,schemas}.ts`, routers mounted on the `/api` router in `app.ts`.
  - Background jobs: queue names in `src/jobs/queues.ts`; processors in `src/jobs/`, run only by `worker.ts`. Request handlers enqueue, they never sleep or retry.
  - Realtime: `src/sockets/` (Session 5). The server only emits; every change goes through REST.
- `packages/shared` — zod schemas, `ORDER_STATUS` + `ALLOWED_TRANSITIONS`, money helpers, `pricing.ts`. Shipped as TS source; import from `@restaurant/shared`.
- Tests live beside the code as `*.test.ts(x)`.

## Rules that must not be broken

1. **Money is integer paise everywhere** (`Paise`, `toPaise`, `formatINR` in shared). No rupee floats in storage, APIs or maths.
2. **The server recomputes every price via `packages/shared/pricing.ts`.** It re-reads items, variants and add-ons from the DB. A total, price or discount sent by the client is never trusted.
3. **`order.status` changes only through `orders.transition()`**, which checks `ALLOWED_TRANSITIONS` and the caller's role, appends `statusHistory`, emits sockets and enqueues notifications. No other code writes `status`. Cancels go through `canCancel()` (`placed`: customer or admin; `preparing`/`ready`: staff or admin, with a reason; never the customer once the kitchen accepts). Moving into `AUTO_REFUND_STATUSES` refunds a paid order.
4. **Payment status is separate from order status.** The Razorpay webhook (signature-checked on the raw body) is the source of truth for "paid".
5. **`outletId` on every document** (outlets, categories, menuItems, orders, coupons…).
6. **zod validates every request body**, and every route has `requireAuth`/`requireRole` unless it is deliberately public.
7. Orders snapshot items, prices and the address at placement; menu edits never change past orders.
8. Personal data: never log phones, OTPs or tokens (the pino logger redacts common fields); tag Sentry with user id, never phone.
9. Nothing secret in `NEXT_PUBLIC_*`.
10. Env vars are validated with zod (`apps/api/src/config/env.ts`, `apps/web/lib/env.ts`); add new ones there and to `.env.example`.
11. **Totals come only from `POST /cart/quote` in the Flutter apps.** Dart never computes a price, fee, discount or tax. The quote and `POST /orders` run the same `pricing.ts` path, so a quote always equals the order total.
12. **Refresh token transport:** web gets it as an httpOnly `SameSite=Lax` cookie; a request with header `X-Client: app` gets it in the response body instead (the apps keep it in secure storage). `POST /auth/refresh` accepts either. Rotation and family revocation are the same for both.
13. **Every route registers with OpenAPI** (`@asteasolutions/zod-to-openapi`): its request and response zod schemas, served at `GET /openapi.json`. A route that isn't registered doesn't exist for the apps, so add the registration in the same change as the route.

## Versions

Node 24, pnpm 12, TypeScript 6.0 (pinned: typescript-eslint doesn't support 7.x yet), Next 16, React 19, Express 5, Mongoose 9, Zod 4, BullMQ 6, ioredis 6, Tailwind 4, Vitest 5.
