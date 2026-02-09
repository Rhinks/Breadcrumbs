# 🍞 Breadcrumps

A unified AI conversation workspace. Import, organize, and semantically search your AI chat histories across ChatGPT, Claude, and more.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Chrome Extension │────▶│  Next.js Frontend │────▶│   Supabase   │
│ (DOM scraping)   │     │  (UI, Auth, CRUD) │     │ (Auth + DB)  │
└─────────────────┘     └────────┬─────────┘     └──────┬───────┘
                                 │                       │
                                 ▼                       │
                        ┌──────────────────┐             │
                        │  FastAPI Backend  │─────────────┘
                        │ (Embeddings +    │   pgvector
                        │  Semantic Search) │
                        └──────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Python 3.11+
- Supabase account (free tier works)
- OpenAI API key

### 1. Clone and install
```bash
git clone <repo-url>
cd breadcrumps
pnpm install
```

### 2. Set up Supabase
- Create a new project at supabase.com
- Run `supabase/schema.sql` in the SQL Editor
- Copy your project URL, anon key, and service role key

### 3. Configure environment
```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
# Edit both files with your actual keys
```

### 4. Start the Python backend
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Start the Next.js frontend
```bash
pnpm dev:web
```

### 6. Build the Chrome extension
```bash
cd extensions/chrome
pnpm install
pnpm build
# Load `extensions/chrome/dist` as unpacked extension in Chrome
```

## Project Structure

```
breadcrumps/
├── apps/
│   ├── web/          # Next.js frontend (React + Tailwind + Supabase)
│   └── api/          # FastAPI backend (embeddings + search)
├── packages/
│   └── shared/       # Shared TypeScript types
├── extensions/
│   └── chrome/       # Chrome extension (DOM scraping)
└── supabase/
    └── schema.sql    # Database schema with pgvector
```

## Key Features (MVP)
- [x] Chrome extension to scrape ChatGPT & Claude conversations
- [ ] Manual paste/upload import
- [ ] Project-based organization
- [ ] Semantic search within projects
- [ ] Chat-style conversation viewer
- [ ] Supabase auth (email/password + Google)
