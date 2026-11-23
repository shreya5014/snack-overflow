# 🥨 Snack Overflow

> A production-minded office pantry tracker for Bipolar Factory's internship assessment.  
> Built with **React · TypeScript · Express · PostgreSQL · Prisma**.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://snack-overflow-teq3.onrender.com)
[![Tests](https://img.shields.io/badge/Tests-40%2F40%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/shreya5014/snack-overflow)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/shreya5014/snack-overflow)

🚀 **Live Application:** [https://snack-overflow-teq3.onrender.com](https://snack-overflow-teq3.onrender.com)  
📦 **Repository:** [https://github.com/shreya5014/snack-overflow](https://github.com/shreya5014/snack-overflow)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Demo Credentials](#demo-credentials)
3. [What It Does](#what-it-does)
4. [Schema Design](#schema-design)
5. [API Reference](#api-reference)
6. [Concurrency & Data Integrity](#concurrency--data-integrity)
7. [Authorization & Security](#authorization--security)
8. [Tests](#tests)
9. [Design Notes & Trade-offs](#design-notes--trade-offs)
10. [What Breaks First at 100× Users](#what-breaks-first-at-100-users)
11. [Project Structure](#project-structure)

---

## Quick Start

> **Prerequisites:** Node.js 18+, npm. No external PostgreSQL installation needed — the backend bundles an embedded PostgreSQL instance.

```bash
# 1. Clone
git clone <repo-url>
cd snack-overflow

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Set up environment
cd ../backend
cp .env.example .env
# .env.example already has working defaults for local development

# 4. Start PostgreSQL (embedded, runs in-process)
npx tsx scripts/start-db.ts
# Leave this terminal running

# 5. Run migrations + seed data (new terminal)
cd backend
npm run prisma:migrate
npm run prisma:seed

# 6. Start the backend API (new terminal)
cd backend
npm run dev
# → API running at http://localhost:4000

# 7. Start the frontend (new terminal)
cd frontend
npm run dev
# → App running at http://localhost:3000
```

Open **http://localhost:3000** and click **[A1] ADMIN** or **[B2] MEMBER** on the vending machine to log in instantly.

---

## Demo Credentials

| Role | Email | Password | Name |
|------|-------|----------|------|
| **Admin** | `admin@snackoverflow.local` | `AdminPass123!` | Priya Sharma |
| **Member** | `member@snackoverflow.local` | `MemberPass123!` | Arjun Mehta |

> On the login screen, the **Quick Access Panel** buttons log you in with one click — no typing needed. Useful for demonstrating role switching.

---

## What It Does

### For everyone (Admin + Member)
- **Pantry dashboard** — browse all 14 Indian office snacks in a card layout
- **Filter** by category (Savoury / Sweet / Drink / Healthy-ish), stock status (Stocked / Running Low / Gone), and free-text search — all server-side
- **Server-side pagination** — 12 cards per page
- **Snack of the Week** — the most-voted snack this calendar week (Asia/Kolkata IST), shown in a spotlight banner
- **Consume** — grab a snack; stock decrements atomically, never below zero
- **Vote** — vote for your favourite once per snack; drives the weekly leaderboard
- **Grab Bag** — add multiple snacks to a cart drawer and check out everything in one atomic transaction

### Admin-only
- **Add snack** — create a new pantry item with name, category, initial quantity and low-stock threshold
- **Edit snack** — update name, category, or threshold
- **Restock** — add stock with preset chips (+5 / +10 / +25 / +50) or a custom amount
- **Archive** — soft-delete a snack; it disappears from the active pantry but all history is preserved

### Stock status (derived, never stored)
| Status | Condition |
|--------|-----------|
| 🟢 **STOCKED** | `quantity > lowStockThreshold` |
| 🟡 **RUNNING LOW** | `0 < quantity ≤ lowStockThreshold` |
| 🔴 **GONE** | `quantity = 0` |

---

## Schema Design

```
User
  id            uuid PK
  email         unique
  name
  passwordHash  bcrypt, 10 rounds — plain text never stored
  role          ADMIN | MEMBER

Snack
  id                uuid PK
  name              unique — prevents duplicate pantry entries
  category          SWEET | SAVOURY | DRINK | HEALTHY_ISH
  quantity          int, default 0, never below 0 (enforced at SQL level)
  lowStockThreshold int, default 5
  isArchived        bool — soft deletion; history always preserved
  createdAt / updatedAt

Vote
  id        uuid PK
  userId    → User
  snackId   → Snack
  createdAt
  UNIQUE(userId, snackId)   ← database-level constraint, not application code

InventoryLog
  id               uuid PK
  snackId          → Snack
  userId           → User
  actionType       CONSUMPTION | RESTOCK
  quantityChanged  int (negative for consume, positive for restock)
  previousQuantity int
  newQuantity      int
  createdAt
```

**Why this schema?**

- **`derivedStatus` is computed on read**, not stored. Stock status would go stale the moment anyone consumes a unit. Computing it inline in the SQL query (`CASE WHEN quantity = 0 THEN 'GONE' ...`) keeps the data always accurate with no additional writes.
- **`UNIQUE(userId, snackId)` on Vote** is a hard database constraint. Even if 1,000 concurrent duplicate-vote requests arrive, only one `INSERT` succeeds — the rest hit a unique violation (`P2002`) that the service layer catches and returns as `409 ALREADY_VOTED`.
- **Soft deletion (`isArchived`)** means the team's consumption history and votes are never erased. An admin archiving a snack is a business action, not a data-destruction event.
- **`InventoryLog` with `previousQuantity` and `newQuantity`** gives a complete, reconstructable audit trail. You can replay every change to verify the current quantity at any point in time.
- **`quantityChanged` is signed**: `-2` means two units were consumed; `+10` means a restock of ten. This makes aggregate queries (total consumed this month) trivial.

---

## API Reference

All responses use a consistent envelope:

```jsonc
// Success
{ "success": true, "data": { ... } }

// Error
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Only 2 remaining, requested 3." } }
```

### Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |

### Snacks

| Method | Path | Auth | Role | Query / Body | Description |
|--------|------|------|------|--------------|-------------|
| `GET` | `/api/snacks` | ✅ | Any | `?page&limit&search&category&status` | Paginated snack list |
| `GET` | `/api/snacks/snack-of-the-week` | ✅ | Any | — | Most-voted snack this IST week |
| `POST` | `/api/snacks/checkout` | ✅ | Any | `{ items: [{snackId, amount}] }` | Batch consume (atomic) |
| `GET` | `/api/snacks/:id` | ✅ | Any | — | Single snack |
| `POST` | `/api/snacks` | ✅ | ADMIN | `{ name, category, quantity, lowStockThreshold }` | Create snack |
| `PUT` | `/api/snacks/:id` | ✅ | ADMIN | `{ name?, category?, lowStockThreshold? }` | Update snack |
| `DELETE` | `/api/snacks/:id` | ✅ | ADMIN | — | Soft-delete snack |
| `POST` | `/api/snacks/:id/restock` | ✅ | ADMIN | `{ amount }` | Add stock |
| `POST` | `/api/snacks/:id/consume` | ✅ | Any | `{ amount }` | Consume stock |
| `POST` | `/api/snacks/:id/vote` | ✅ | Any | — | Vote for snack |

### HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Validation error (bad input) |
| `401` | Missing or invalid JWT |
| `403` | Authenticated but wrong role |
| `404` | Snack not found or archived |
| `409` | Conflict — `INSUFFICIENT_STOCK`, `ALREADY_VOTED`, `DUPLICATE_SNACK_NAME` |
| `500` | Unexpected server error |

---

## Concurrency & Data Integrity

### The Problem

The assignment scenario: *"Two people grabbed the last packet at the same time. The spreadsheet said there were three."*

A naive implementation reads the quantity, checks if it's enough, then writes:

```ts
// ❌ WRONG — race condition
const snack = await db.snack.findUnique({ where: { id } }); // both threads read qty=1
if (snack.quantity >= amount) {                              // both threads pass this check
  await db.snack.update({ data: { quantity: qty - 1 } });   // both write → qty = -1
}
```

Under concurrent load, both threads read `quantity = 1`, both pass the guard, both decrement — final quantity is `-1`.

### The Solution — Atomic Conditional SQL UPDATE

```sql
UPDATE "Snack"
SET   quantity    = quantity - $amount,
      "updatedAt" = NOW()
WHERE id           = $id
  AND "isArchived" = false
  AND quantity    >= $amount   -- ← checked and decremented in a single atomic operation
RETURNING *;
```

PostgreSQL acquires a row-level lock for the duration of this statement. The check (`quantity >= amount`) and the decrement happen together — there is no window for another transaction to interfere. If 10 requests race for a snack with quantity 3:

- PostgreSQL serialises the row lock internally
- The first 3 each see `quantity ≥ 1` → succeed, quantity goes 3 → 2 → 1 → 0
- Requests 4–10 each see `quantity = 0 < 1` → 0 rows updated → the service throws `409 INSUFFICIENT_STOCK`
- **Quantity never goes below 0.** No mutexes, no queues, no application-level semaphores.

The activity log is written **inside the same `prisma.$transaction`** as the stock update, so the log and the quantity change are always in sync — either both commit or neither does.

### Batch Checkout — Deadlock Prevention

The `/checkout` endpoint consumes multiple snacks atomically in one transaction. To prevent deadlocks when two users check out overlapping baskets simultaneously, items are **sorted by `snackId` before locking**:

```ts
const sortedItems = [...items].sort((a, b) => a.snackId.localeCompare(b.snackId));
```

Any two concurrent checkouts will always lock rows in the same order, so they can never be waiting on each other.

### Duplicate Vote Prevention

```prisma
model Vote {
  @@unique([userId, snackId], name: "user_snack_unique_vote")
}
```

This is a **database constraint**, not application logic. Even if the frontend sends 1,000 simultaneous vote requests, the database will accept only one `INSERT` per `(userId, snackId)` pair. The rest receive a unique-constraint violation (`Prisma P2002`), which the service catches and surfaces as `409 ALREADY_VOTED`.

---

## Authorization & Security

| Concern | Approach |
|---------|----------|
| **Password storage** | bcrypt with 10 salt rounds — plain text never stored or logged |
| **Authentication** | JWT, signed with `JWT_SECRET` from environment, 24-hour expiry |
| **Route protection** | `authenticate()` middleware runs first on every protected route — verifies and decodes the token, attaches `req.user` |
| **Role enforcement** | `authorize(Role.ADMIN)` middleware on write routes — returns `403` if `req.user.role` does not match, regardless of frontend state |
| **Input validation** | Zod schemas validate every request body and query string before the handler runs — unknown fields are stripped |
| **SQL injection** | All database access goes through Prisma's parameterised queries; raw SQL uses tagged template literals (`Prisma.sql`) which are parameterised too |
| **Secrets** | `JWT_SECRET` and `DATABASE_URL` are environment variables; `.env` is in `.gitignore` |

---

## Tests

```
Test Files  3 passed (3)
     Tests  40 passed (40)
  Duration  ~19 s
```

```bash
cd backend && npm test
```

### What is tested

**`auth.test.ts`** — 10 tests
- Login succeeds with correct credentials, returns JWT and user object
- Login fails with wrong password (401), unknown email (401)
- JWT is verifiable and contains the correct role
- Protected routes reject missing tokens, expired tokens, malformed tokens

**`snacks.test.ts`** — 25 tests
- Full CRUD lifecycle (create, read, update, soft-delete)
- Filtering by category, status, search term — all server-side
- Pagination (page / limit / totalCount)
- Restock increments quantity and writes an `InventoryLog` in the same transaction
- Consume decrements quantity; fails with 409 when stock is insufficient
- Vote succeeds once; second vote returns 409; DB contains exactly one Vote row
- Snack of the Week returns the highest-voted snack for the current IST week
- Authorization: member cannot create, edit, delete, or restock snacks

**`inventory-concurrency.test.ts`** — 5 tests
- **Core concurrency test**: 10 simultaneous `Promise.all` consume requests on a snack with `quantity = 3`
  - Exactly 3 requests succeed (HTTP 200)
  - Exactly 7 requests fail (HTTP 409 `INSUFFICIENT_STOCK`)
  - Final database quantity is exactly 0
  - Exactly 3 `InventoryLog` records were created
  - No duplicate or orphan log records exist
- Consistency verification: the above test is repeated multiple times and produces identical results every time
- Concurrent requests with varying amounts never oversell
- Failed consumption requests never create activity logs
- Transactional consistency between quantity and log is guaranteed

> Tests run against the **real embedded PostgreSQL** database using genuine `Promise.all` concurrency — not mocks, not sequential simulation.

---

## Design Notes & Trade-offs

### Why embedded PostgreSQL instead of a separate server?

The embedded-postgres package runs a real PostgreSQL process, managed in-process, persisting data to `backend/.postgres-data/`. This means:
- Zero external dependencies — a reviewer can run `npm run dev` without installing Postgres
- All PostgreSQL features (transactions, row-level locking, unique constraints) work identically
- Production migration is trivial: swap `DATABASE_URL` to point at an external PG instance and remove the embedded startup script

### Why raw SQL for consume instead of Prisma's update?

Prisma's `update` with `where` conditions uses optimistic concurrency — it still does a separate read and write internally. The `UPDATE ... WHERE quantity >= $amount RETURNING *` pattern is the only way to guarantee atomic check-and-decrement at the SQL level. For all other queries (CRUD, filters, pagination), Prisma's query builder is used for readability and type safety.

### Why `derivedStatus` is computed in SQL, not application code

```sql
CASE
  WHEN s.quantity = 0                            THEN 'GONE'
  WHEN s.quantity <= s."lowStockThreshold"       THEN 'RUNNING_LOW'
  ELSE                                                'STOCKED'
END AS "derivedStatus"
```

Computing it in the database means every row returned already has the correct status. If it were computed in TypeScript after fetching, a consume request that fires between the fetch and the computation would produce a stale result.

### Why no sign-up endpoint?

The assignment specifies *"users can be seeded; no sign-up needed"*. Adding a public `/register` route would require email verification and rate limiting to be production-safe — out of scope for this exercise. It is listed as a bonus item in the spec and would be a straightforward addition.

### Why soft deletion?

`isArchived = true` is used instead of `DELETE`. Reasons:
1. The assignment explicitly requires preserving the activity log history
2. A hard delete on `Snack` would cascade-delete `InventoryLog` records (or force nulls), breaking the audit trail
3. Soft deletion is reversible — an admin can restore a snack by flipping the flag back (future feature)

### Cart / Batch Checkout

The assignment asks for a single-item `/consume` endpoint. The batch `/checkout` endpoint is a bonus addition that maps to the same underlying atomic logic — it just processes multiple items in one transaction. The UI cart drawer is a UX improvement that lets team members grab several snacks in one go, reducing the number of API calls and providing a better experience than clicking "Grab" on each card individually.

---

## What Breaks First at 100× Users

### 1. The embedded PostgreSQL process (immediate bottleneck)

The embedded-postgres setup works perfectly for a single-server deployment, but it cannot be scaled horizontally — you cannot run two backend instances pointing at the same embedded database. At 100× users this becomes the ceiling.

**Fix:** Move to an external managed PostgreSQL (AWS RDS, Supabase, Neon). The application code is already fully decoupled via `DATABASE_URL` — zero code changes required.

### 2. Connection pool exhaustion

Prisma's default connection pool is sized to `cpu_count * 2 + 1`. At high concurrency, threads queue waiting for a connection.

**Fix:** Tune `connection_limit` in the Prisma datasource, or deploy a PgBouncer connection pooler in front of PostgreSQL.

### 3. The `GET /snacks` query with no index on `name`

The search path uses `ILIKE '%term%'`, which is a full sequential scan on the Snack table. At 14 rows it's instant; at 14,000 rows it starts to hurt.

**Fix:** Add a PostgreSQL GIN index with `pg_trgm` extension for trigram-based ILIKE: `CREATE INDEX ON "Snack" USING gin(name gin_trgm_ops)`.

### 4. JWT secret rotation

JWTs are stateless — once issued, there is no way to invalidate them before they expire (24 hours). If a token is stolen, it remains valid.

**Fix:** Implement a token denylist (Redis set of invalidated JIDs), or move to short-lived access tokens (15 min) + refresh tokens stored server-side.

### 5. No rate limiting

A motivated user could spam `/api/snacks/:id/consume` in a tight loop. The concurrency guard prevents overselling, but it does not prevent abuse.

**Fix:** Add `express-rate-limit` middleware per IP, with stricter limits on write endpoints.

---

## Project Structure

```
snack-overflow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Data model + enums
│   │   ├── migrations/            # Prisma migration history
│   │   └── seed.ts                # 2 users + 14 Indian snacks
│   ├── scripts/
│   │   └── start-db.ts            # Embedded PostgreSQL launcher
│   ├── src/
│   │   ├── server.ts              # Entry point
│   │   ├── app.ts                 # Express app + middleware chain
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── config/env.ts          # Zod-validated environment variables
│   │   ├── errors/AppError.ts     # Typed application error
│   │   ├── middleware/
│   │   │   ├── authenticate.ts    # JWT verification → req.user
│   │   │   ├── authorize.ts       # Role check
│   │   │   ├── validate.ts        # Zod request validation
│   │   │   └── errorHandler.ts    # Unified error response format
│   │   ├── modules/
│   │   │   ├── auth/              # Login endpoint
│   │   │   └── snacks/            # All snack endpoints + business logic
│   │   └── utils/date.ts          # Asia/Kolkata week window calculation
│   └── tests/
│       ├── integration/
│       │   ├── auth.test.ts
│       │   └── snacks.test.ts
│       └── concurrency/
│           └── inventory-concurrency.test.ts
│
└── frontend/
    └── src/
        ├── api/                   # Axios client + typed API functions
        ├── context/               # Auth, Cart, Toast React contexts
        ├── pages/                 # LoginPage, PantryDashboard
        ├── components/
        │   ├── common/            # Navbar, Badge, Modal
        │   ├── pantry/            # SnackCard, SnackOfTheWeek, FilterBar, Pagination
        │   ├── admin/             # Add/Edit/Restock/Delete modals
        │   └── cart/              # CartDrawer (batch checkout)
        └── types/                 # TypeScript interfaces
```

---

*Built for the Bipolar Factory Round 2 Full Stack Intern Assessment.*  
*Stack: React · TypeScript · Vite · Tailwind CSS · Express · Prisma · PostgreSQL*
