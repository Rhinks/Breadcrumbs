"""
Breadcrumps API — FastAPI backend for embedding generation and semantic search.

The frontend (Next.js) handles auth and basic CRUD via Supabase directly.
This API handles:
  - Conversation import/processing
  - Embedding generation (OpenAI)
  - Semantic search (pgvector)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import conversations, search

app = FastAPI(
    title="Breadcrumps API",
    version="0.1.0",
    description="AI conversation workspace backend",
)

# CORS — allow Next.js frontend and Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Next.js dev
        "chrome-extension://*",         # Chrome extension
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
