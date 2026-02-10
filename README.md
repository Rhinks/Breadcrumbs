# Breadcrumps

**Unified AI conversation workspace.** Scrape, organize, and semantically search your ChatGPT & Claude histories in one place.

## The Problem

You have hundreds of AI conversations scattered across ChatGPT, Claude, and other platforms. Finding that specific solution you discussed weeks ago? Good luck scrolling through tabs.

## Our Solution

1. **One-click scrape** — Chrome extension extracts conversations from ChatGPT and Claude
2. **Semantic search** — Find relevant conversations by meaning, not just keywords
3. **Organized workspace** — All your AI chats in one searchable database

## How It Works

```
Chrome Extension (scrapes DOM)
    ↓
FastAPI Backend (chunks + embeds with OpenAI)
    ↓
PostgreSQL + pgvector (vector semantic search)
    ↓
Next.js Frontend (search & browse)
```

## Tech Stack

- **Extension:** TypeScript + React + Vite
- **Backend:** FastAPI + pgvector (vector search)
- **Database:** Supabase (PostgreSQL + auth)
- **Embeddings:** OpenAI API

## Quick Start

```bash
# 1. Install deps
pnpm install

# 2. Setup Supabase
# - Create project at supabase.com
# - Run supabase/schema.sql in SQL editor
# - Add your keys to .env files

# 3. Start backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Load extension
cd extensions/chrome
pnpm build
# Load dist/ in chrome://extensions
```

## Status

- ✅ Chrome extension (ChatGPT + Claude scraping)
- ✅ Semantic search via pgvector
- ✅ Conversation import pipeline
- 🚧 Frontend UI
- 📋 Project-based organization (coming)

---

**Built for:** Hackathon 2026 | **Team:** 2 engineers
