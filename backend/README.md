# Fruit Game Backend

This backend uses Express + Prisma (PostgreSQL). The Prisma schema is the
source of truth for the database structure.

Key files:
- `prisma/schema.prisma` (canonical schema)
- `.env.example` (env template)

## Database setup

### Local development
1) Start a local Postgres (Docker):
```
npm run db:up
```

2) Create a `.env` in `backend/` based on `.env.example`.

3) Apply migrations:
```
npm run db:migrate
```

4) Run the server:
```
npm run dev
```

### Local development (manual DB)
If you prefer a local Postgres not via Docker:
1) Create a database (optional helper script):
```
psql -f scripts/init_db.sql
```

2) Apply migrations from Prisma:
```
npm run db:migrate
```

### Railway (production)
1) Create a PostgreSQL database in Railway and copy the `DATABASE_URL`.
2) Set `DATABASE_URL` in Railway environment variables.
3) Deploy the backend, then run:
```
npm run db:deploy
```

## Migration plan

### Naming conventions
Prisma migrations are timestamped automatically. Use clear, verb-based names:
- `add_rewards_expiry_fields`
- `add_game_session_inputs_hash`
- `create_leaderboard_rollups`

### Workflow
- Local/dev:
  - Update `prisma/schema.prisma`
  - Run `npm run db:migrate` to create a new migration
  - Commit the generated `prisma/migrations/*` directory
- Production (Railway):
  - Ensure `DATABASE_URL` is set
  - Run `npm run db:deploy`

Avoid `prisma db push` in production; it bypasses migration history.

### Leaderboard reset strategy
The schema already supports rolling leaderboards without destructive resets:
- **Daily**: `DailyScore.date` stores the UTC date (no time). Upsert by
  `walletAddress + date` at game end.
- **Weekly**: `WeeklyScore.weekStart` stores the Monday 00:00:00 UTC date for
  the current week. Upsert by `walletAddress + weekStart`.

Recommended job schedule (UTC):
- **Daily finalize**: run at 00:05 UTC to snapshot/prize the previous day.
- **Weekly finalize**: run at Sunday 00:05 UTC to snapshot/prize the previous
  week (with `weekStart` = prior Monday 00:00 UTC).

This keeps historical scores intact, supports backfills, and avoids data loss.

## Schema overview

The full schema lives in `prisma/schema.prisma`. High-level entities:

- `User` (walletAddress, totalPoints, gamesPlayed, highScore)
- `GameSession` (authoritative session + replay hash/data)
- `DailyScore` / `WeeklyScore` (leaderboard rollups)
- `Pack` / `Skin` / `OwnedSkin` / `SkinLoadout` (gacha + cosmetics)
- `Reward` (weekly rewards, pack/token payouts)
- `TransactionLog` (on-chain payment tracking)
- `UsedNonce` (replay-attack prevention)

If you need a SQL DDL snapshot later, run `prisma migrate dev` locally and
use `prisma migrate diff` or `pg_dump --schema-only` against the database.
