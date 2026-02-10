# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Breadcrumps** is a unified AI conversation workspace that imports, organizes, and semantically searches chat histories from ChatGPT, Claude, and other AI platforms.

The project uses a **monorepo structure** with Turbo and pnpm, consisting of:
- **Chrome Extension** (`extensions/chrome`): DOM scraping for ChatGPT and Claude conversations
- **FastAPI Backend** (`apps/api`): Embeddings generation and semantic search with pgvector
- **Next.js Frontend**: Not yet present in the repo (planned)
- **Shared Utilities** (`packages/shared`): Shared TypeScript types and constants

## Architecture

```
Chrome Extension → Next.js Frontend → Supabase
(DOM scraping)   (UI, Auth, CRUD)   (Auth + DB)
                        ↓
                  FastAPI Backend
                  (Embeddings, pgvector search)
```

**Key technologies:**
- **Monorepo**: pnpm workspaces + Turbo for task orchestration
- **Extension**: Vite bundling with React components
- **Backend**: FastAPI with SQLAlchemy ORM, Supabase pgvector integration
- **Database**: Supabase PostgreSQL with pgvector extension for semantic search
- **Auth**: Supabase auth (email/password + Google)

## Common Development Commands

### Root level commands (use Turbo)
```bash
pnpm dev              # Start all dev servers
pnpm dev:web          # Start only Next.js frontend
pnpm dev:api          # Start only FastAPI backend (uvicorn on port 8000)
pnpm dev:ext          # Build Chrome extension in watch mode
pnpm build            # Build all packages
pnpm build:ext        # Build Chrome extension
pnpm lint             # Run linters
pnpm clean            # Clean build artifacts
```

### Chrome Extension commands
```bash
cd extensions/chrome
pnpm dev              # Watch build
pnpm build            # One-time build to dist/
pnpm build:all        # Build Chrome + Firefox versions
pnpm clean            # Remove dist folders
```

### FastAPI backend commands
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Setup Requirements

- **Node.js 20+** with pnpm 9+ (enforced in package.json engines)
- **Python 3.11+** with pip and venv
- **Supabase account** (free tier works) for database and auth
- **OpenAI API key** for embeddings generation

Environment files: Copy `.env.example` to appropriate locations and fill in actual keys:
- `apps/api/.env` - Backend (Supabase DB URL, OpenAI key)
- `.env.local` - Root level (if needed)

## Critical File Structure

### Chrome Extension (`extensions/chrome/src/`)
```
src/
├── content/          # Content scripts (DOM manipulation)
│   ├── index.ts      # Content script entry point
│   └── scrapers/     # Site-specific scrapers
│       ├── base.ts           # Abstract base class
│       ├── detector.ts       # Detects supported sites
│       ├── claude.ts         # Claude conversation scraper
│       └── chatgpt.ts        # ChatGPT conversation scraper
├── background/       # Service worker (background script)
│   └── service-worker.ts
├── popup/           # Popup UI
│   ├── popup.ts     # TypeScript
│   └── popup.html   # HTML template
└── icons/           # Icon assets
```

**Key scrapers**: Content scripts run on claude.ai and chatgpt.com to parse conversation DOM into structured JSON. Scrapers inherit from `base.ts` and implement DOM traversal specific to each site.

### FastAPI Backend (`apps/api/app/`)
```
app/
├── main.py           # FastAPI application setup
├── config.py         # Environment and settings
├── models/           # SQLAlchemy ORM models
├── routers/          # API endpoints (organized by feature)
├── services/         # Business logic (embeddings, search, etc.)
└── utils/            # Utilities (DB connections, helpers)
```

**Key services**: Embeddings service uses OpenAI API; search service leverages pgvector for semantic similarity.

### Shared Types (`packages/shared/src/`)
```
src/
├── types.ts          # Shared TypeScript interfaces/types
├── constants.ts      # Shared constants
└── index.ts          # Re-exports
```

**Purpose**: Single source of truth for types used across extension and backend to ensure consistency.

## Workspace Structure (pnpm)

Turbo automatically manages monorepo dependencies. Define new workspaces in `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"      # FastAPI backend and other apps
  - "packages/*"  # Shared utilities
  - "extensions/*" # Chrome and other extensions
```

Each workspace has its own `package.json` or `pyproject.toml`. Dependencies between workspaces are managed via package name references (e.g., `@breadcrumps/chrome-extension`).

## Build and Bundling

### Chrome Extension
- **Bundler**: Vite with custom rollup config (see `vite.config.ts`)
- **Outputs**:
  - `dist/popup.html` and `dist/popup.js` for popup UI
  - `dist/content/index.js` for content script
  - `dist/background/service-worker.js` for service worker
- **Manifest**: Static copied to dist; v3 is standard (see `manifest.json`)
- **Firefox variant**: Separate config `vite.config.firefox.ts` and `dist-firefox/`

### FastAPI Backend
- **No build step**: Python is interpreted. Install dependencies with pip and run uvicorn.
- **Migrations**: Database schema defined in `supabase/schema.sql` (manual SQL, no ORM migrations yet)

## Key Implementation Details

### Conversation Data Flow
1. **Extension scrapes DOM** → structured conversation JSON (messages, metadata)
2. **User sends to backend** → API chunks and embeds conversations
3. **Backend stores** in Supabase with pgvector embeddings
4. **Frontend searches** via FastAPI semantic search endpoint

### Embeddings and Search
- **Model**: OpenAI embeddings (default, configurable in `config.py`)
- **Vector DB**: Supabase pgvector extension
- **Search strategy**: Cosine similarity on conversation chunks

### Chrome Extension Messaging
- Content script → Service worker → Popup or backend
- Uses `webextension-polyfill` for cross-browser compatibility

## Database

Database schema is managed manually via SQL scripts in `supabase/schema.sql`. Key tables:
- Conversations (with pgvector embeddings column)
- Chunks (for semantic search)
- Metadata (source, timestamps)

Supabase provides auth and real-time subscriptions (not yet leveraged).

## Testing and Debugging

- **Extension**: Load unpacked `dist/` in `chrome://extensions`
- **Backend**: Uvicorn auto-reload on file changes; check console for errors
- **Logs**: Check browser console (extension) and terminal (uvicorn)

## Git and Branches

Current branch: `main`

Recent commits focused on:
- Vite integration for extension compilation
- Chunk-based embeddings and search implementation
- Database schema migration to conversation chunks
- Perplexity source integration (planned)

Pre-commit hooks may be configured (check `.git/hooks`).
