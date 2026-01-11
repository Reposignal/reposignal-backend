# Reposignal Backend

> The authoritative API server for Reposignal - a platform that helps open-source maintainers classify and manage GitHub issues while enabling contributors to discover good first issues.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Latest-pink.svg)](https://bun.sh/)
[![Hono](https://img.shields.io/badge/Hono-4.11.0-orange.svg)](https://hono.dev/)

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Database](#database)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Reposignal Backend is the single source of truth for the Reposignal platform. It provides a RESTful API for:

- 🔐 **GitHub OAuth authentication** for users and maintainers
- 🤖 **Bot integration** via secure API key authentication
- 📦 **Repository management** with granular settings control
- 🏷️ **Issue classification** (difficulty levels 1-5, types, visibility)
- 🔍 **Discovery engine** for finding suitable issues with advanced filtering
- 📊 **Analytics and statistics** for repository health metrics
- 🪵 **Immutable audit logging** for all state changes
- 📝 **Anonymous feedback** collection from contributors
- 🎛️ **Metadata management** for languages, frameworks, and domains

### Key Features

✅ **Security-first design** - GitHub App validation, no frontend secrets  
✅ **Type-safe** - Full TypeScript with strict mode and Zod validation  
✅ **OpenAPI documentation** - Interactive Swagger UI at `/documentation`  
✅ **Audit trail** - Immutable logs for every state change  
✅ **Opt-in philosophy** - Maintainer authority and consent required  

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | [Bun](https://bun.sh/) - Fast JavaScript runtime |
| **Language** | [TypeScript 5.9.3](https://www.typescriptlang.org/) (strict mode) |
| **Web Framework** | [Hono 4.11.0](https://hono.dev/) - Ultrafast web framework |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) - TypeScript SQL ORM |
| **Database** | PostgreSQL - Relational database |
| **Validation** | [Zod 4.1.13](https://zod.dev/) - TypeScript-first schema validation |
| **Auth** | JWT + GitHub OAuth |

## 🚀 Quick Start

### Prerequisites

- **Bun** >= 1.0.0 ([Install Bun](https://bun.sh/docs/installation))
- **PostgreSQL** >= 14
- **GitHub App** credentials (for OAuth and webhook validation)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/reposignal-backend.git
cd reposignal-backend

# Install dependencies
bun install
```

### Environment Configuration

Create a `.env` file with the following required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reposignal

# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_NAME=reposignal

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/github/callback

# Security
JWT_SECRET=your_jwt_secret_key
BOT_API_KEY=your_bot_api_key

# Setup Configuration
SETUP_WINDOW_MINUTES=30

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:9000
```

### Database Setup

```bash
# Generate migration files
bun run db:generate

# Push schema to database
bun run db:push

# Seed canonical taxonomy (languages, frameworks, domains)
bun run db:seed

# Or do both in one command
bun run db:setup
```

### Start Development Server

```bash
bun run dev
```

Server will be running at `http://localhost:3000`

## 📚 API Documentation

### Interactive Documentation

Visit `http://localhost:3000/documentation` for the full interactive Swagger UI with:
- ✅ Live request testing
- ✅ Request/response examples
- ✅ Schema definitions
- ✅ Authentication testing

### OpenAPI Specification

Raw OpenAPI 3.0 spec available at: `GET /openapi.json`

### API Endpoints Overview

#### 🏥 Health & Meta
- `GET /health` - Health check
- `GET /documentation` - Swagger UI
- `GET /openapi.json` - OpenAPI spec
- `GET /meta/languages` - List programming languages
- `GET /meta/frameworks` - List frameworks (grouped by category)
- `GET /meta/domains` - List domain categories

#### 🔐 Authentication (`/auth`)
- `GET /auth/github/login` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout and clear session

#### 🤖 Bot Routes (`/bot`) - Requires `Authorization: Bearer BOT_API_KEY`
- `POST /bot/installations/sync` - Sync GitHub App installation
- `POST /bot/issues/classify` - Classify issue attributes
- `DELETE /bot/issues` - Delete issue
- `POST /bot/repositories/add` - Add new repository
- `POST /bot/repositories/metadata` - Update repository metadata
- `POST /bot/repositories/:id/settings` - Update repository settings
- `POST /bot/repositories/domains/add` - Add domains to repository
- `DELETE /bot/repositories/domains` - Remove domain from repository
- `POST /bot/repositories/tags/add` - Add tags to repository
- `DELETE /bot/repositories/tags` - Remove tag from repository
- `POST /bot/feedback` - Submit anonymous contributor feedback
- `POST /bot/logs` - Log bot actions

#### 👤 User Routes (`/user`) - Requires session authentication
- `POST /user/profile` - Update user profile
- `POST /user/repositories/:id/settings` - Update repository settings
- `GET /user/repositories/:id/logs` - Get repository audit logs

#### 🌐 Public Routes (`/public`) - No authentication required
- `GET /public/discovery` - Discover issues with filters
- `GET /public/repositories/:id` - Get repository details
- `GET /public/repositories/:id/issues` - List repository issues
- `GET /public/repositories/:id/stats` - Get repository statistics
- `GET /public/users/:username` - Get public user profile

#### 🔧 Setup Routes (`/setup`) - GitHub App installation flow
- `GET /setup/context?installation_id=NUMBER` - Get setup context
- `POST /setup/complete` - Complete repository setup

### Authentication Methods

1. **Session Tokens** (User routes)
   ```
   Authorization: Bearer <session_token>
   ```

2. **Bot API Key** (Bot routes)
   ```
   Authorization: Bearer <BOT_API_KEY>
   ```

3. **None** (Public & Setup routes)

## 🏛️ Architecture

### Design Principles

The backend follows a strict architectural model:

#### ✅ What the Backend IS:
- **Single source of truth** - All data lives here
- **Only database writer** - No direct DB access from other services
- **Deterministic state machine** - Predictable state transitions
- **Immutable audit ledger** - All changes are logged permanently

#### ❌ What the Backend is NOT:
- Does NOT talk to GitHub (except OAuth & permission validation)
- Does NOT execute background jobs
- Does NOT clean up comments or issues
- Does NOT infer languages/frameworks (bot does this)

### Core Principles

🔐 **Opt-in only** - Repositories must explicitly enable features  
👑 **Maintainer authority first** - Maintainers control everything  
🔓 **Public state, private intent** - Issue data is public, maintainer decisions are private  
🚫 **No gamification** - No points, badges, or leaderboards  
🚫 **No free-text feedback** - Structured feedback only  
🚫 **No contributor reputation** - Focus on issues, not people  
⚖️ **Nullable by design** - Many fields are intentionally optional  
✅ **Empty is valid** - Empty tables represent valid system states  

### Request Flow

```
┌─────────┐      ┌──────────┐      ┌──────────┐
│ Client  │─────▶│  Hono    │─────▶│   Auth   │
│(Bot/Web)│      │ Routing  │      │Middleware│
└─────────┘      └──────────┘      └──────────┘
                                          │
                      ┌───────────────────┘
                      ▼
                 ┌──────────┐      ┌──────────┐
                 │ Business │─────▶│  Drizzle │
                 │  Logic   │      │   ORM    │
                 └──────────┘      └──────────┘
                                          │
                                          ▼
                                   ┌──────────┐
                                   │PostgreSQL│
                                   └──────────┘
```

## 💾 Database

### Schema Overview

The database uses PostgreSQL with the following main tables:

- **installations** - GitHub App installations
- **repositories** - Repository settings and metadata
- **issues** - Issue classifications (difficulty, type, visibility)
- **users** - User profiles from GitHub OAuth
- **languages** - Canonical programming language taxonomy
- **frameworks** - Canonical framework/library taxonomy
- **domains** - Canonical domain/category taxonomy
- **repository_languages** - Language associations with byte counts
- **repository_frameworks** - Framework associations (inferred or maintainer-set)
- **repository_domains** - Domain associations
- **repository_tags** - Custom repository tags
- **feedback_events** - Anonymous contributor feedback (PRIVATE)
- **repository_feedback_aggregates** - Aggregated feedback statistics
- **logs** - Immutable audit trail of all state changes

### Database Scripts

```bash
# Generate new migration files from schema changes
bun run db:generate

# Push schema directly to database (development)
bun run db:push

# Run migration files (production)
bun run db:migrate

# Seed canonical taxonomy data
bun run db:seed

# Full setup (push schema + seed data)
bun run db:setup

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Migrations

Migrations are managed by Drizzle Kit and stored in `src/db/migrations/`.

## 🧪 Development

### Project Structure

```
reposignal-backend/
├── src/
│   ├── app.ts                 # Hono app configuration
│   ├── server.ts              # Server entry point
│   ├── config.ts              # Environment configuration
│   ├── auth/                  # Authentication middleware
│   │   ├── botAuth.ts         # Bot API key validation
│   │   ├── userAuth.ts        # User session validation
│   │   ├── githubOAuth.ts     # GitHub OAuth flow
│   │   ├── githubValidation.ts# GitHub App validation
│   │   └── repoPermission.ts  # Repository permission checks
│   ├── db/
│   │   ├── client.ts          # Database connection
│   │   ├── seedCanonical.ts   # Taxonomy seed data
│   │   └── schema/            # Drizzle schema definitions
│   ├── modules/               # Business logic modules
│   │   ├── discovery/         # Issue discovery
│   │   ├── feedback/          # Feedback submission
│   │   ├── installations/     # Installation sync
│   │   ├── issues/            # Issue management
│   │   ├── logs/              # Audit logging
│   │   ├── meta/              # Taxonomy listing
│   │   ├── profiles/          # User profiles
│   │   ├── repositories/      # Repository management
│   │   └── stats/             # Statistics
│   ├── routes/                # Route handlers
│   │   ├── auth.ts            # Auth routes
│   │   ├── bot.ts             # Bot routes
│   │   ├── meta.ts            # Meta routes
│   │   ├── public.ts          # Public routes
│   │   ├── setup.ts           # Setup routes
│   │   └── user.ts            # User routes
│   └── utils/                 # Utilities
│       ├── assert.ts          # Type assertions
│       ├── enums.ts           # Shared enums
│       ├── errorHandler.ts    # Global error handler
│       ├── errors.ts          # Custom error types
│       ├── logger.ts          # Logging utilities
│       ├── normalization.ts   # Data normalization
│       ├── openapi.ts         # OpenAPI spec generation
│       └── swaggerUI.ts       # Swagger UI server
├── docs/                      # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── ERROR_HANDLING.md
│   ├── SETUP_GUIDE.md
│   ├── SWAGGER_IMPLEMENTATION.md
│   └── TESTING_GUIDE.md
├── drizzle.config.ts          # Drizzle Kit configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Code Style

- **TypeScript strict mode** enabled
- **ES modules** (not CommonJS)
- **Functional patterns** preferred
- **Explicit error handling** - No silent failures
- **Immutable logs** - Never delete or modify log entries

### Error Handling

All errors extend custom error classes in `src/utils/errors.ts`:

- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ResourceNotFoundError` (404)
- `ConflictError` (409)
- `SetupAlreadyCompletedError` (409)
- `SetupWindowExpiredError` (410)
- `InstallationInvalidError` (403)
- `GitHubUnavailableError` (502)

## 🧪 Testing

Refer to [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for comprehensive testing documentation.

## 📖 Additional Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md) - Detailed API reference
- [Setup Guide](./docs/SETUP_GUIDE.md) - GitHub App installation flow
- [Error Handling](./docs/ERROR_HANDLING.md) - Error handling patterns
- [Swagger Implementation](./docs/SWAGGER_IMPLEMENTATION.md) - OpenAPI documentation
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Quick command reference

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 📄 License

This project is licensed under the GNU-AGPL 3.0 License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Website**: [reposignal.com](https://reposignal.com)
- **Documentation**: [docs.reposignal.com](https://docs.reposignal.com)
- **GitHub**: [github.com/reposignal](https://github.com/reposignal)

---

Made with ❤️ by the Reposignal team

