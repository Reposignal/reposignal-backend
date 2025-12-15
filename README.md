# Reposignal Backend

Reposignal backend API server - the single source of truth and authority layer.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict)
- **Web Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL

## Setup

1. Ensure PostgreSQL is running
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `bun install`
4. Generate and push database schema:
   ```bash
   bun run db:generate
   bun run db:push
   ```

## Development

```bash
bun run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication Routes (`/auth`)
- `GET /auth/github/login` - Initiate GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `POST /auth/logout` - Logout

### Bot Routes (`/bot`) - Requires `Authorization: Bearer BOT_API_KEY`
- `POST /bot/installations/sync` - Sync installation and repositories
- `POST /bot/issues/classify` - Classify issue (difficulty, type, hidden)
- `POST /bot/repositories/metadata` - Update repository metadata
- `POST /bot/feedback` - Submit anonymous feedback
- `POST /bot/logs` - Log bot actions

### User Routes (`/user`) - Requires authentication
- `POST /user/profile` - Update user profile
- `POST /user/repositories/:id/settings` - Update repository settings
- `GET /user/repositories/:id/logs` - Get repository logs

### Public Routes (`/public`) - No authentication
- `GET /public/repositories/:id/issues` - List repository issues
- `GET /public/repositories/:id` - Get repository details
- `GET /public/discovery` - Discover repositories (with filters)
- `GET /public/repositories/:id/stats` - Get repository stats

## Database Scripts

```bash
bun run db:generate  # Generate migrations
bun run db:push      # Push schema to database
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Architecture

The backend is:
- The **single source of truth**
- The **only database writer**
- A **deterministic state machine**
- An **immutable audit ledger**

The backend does NOT:
- Talk to GitHub (except OAuth & permission checks)
- Execute jobs
- Clean up comments
- Infer languages/frameworks

All state changes are logged immutably.

## Core Principles

- Opt-in only
- Maintainer authority first
- Public state, private intent
- No gamification
- No free-text feedback
- No contributor reputation
- Many fields are intentionally nullable
- Empty tables are valid states

