-- ============================================================================
-- Breadcrumps Database Schema
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================================

-- Enable pgvector extension
create extension if not exists vector;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects: organize conversations into workspaces
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations: imported AI chats
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  source text not null check (source in ('chatgpt', 'claude', 'gemini', 'manual', 'perplexity')),
  source_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages: individual messages within conversations
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  position integer not null default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Conversation chunks: grouped messages for semantic search
create table if not exists conversation_chunks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  chunk_index integer not null,
  message_ids uuid[] not null,
  content text not null,
  start_message integer not null,
  end_message integer not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query performance indexes
create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_conversations_user on conversations(user_id);
create index if not exists idx_conversations_project on conversations(project_id);
create index if not exists idx_conversations_source on conversations(source);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_order on messages(conversation_id, position);
create index if not exists idx_chunks_conversation on conversation_chunks(conversation_id);

-- Vector similarity search index
-- NOTE: IVFFlat needs training data. Only create this AFTER you have
-- at least a few hundred chunks. For early testing, comment this out
-- and pgvector will do brute-force scan (fine for small data).
-- Uncomment when you have enough data:
--
-- create index if not exists idx_chunks_embedding
--   on conversation_chunks
--   using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);

-- ============================================================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================================================

create or replace function search_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter_project_id uuid default null,
  filter_source text default null,
  similarity_threshold float default 0.7
)

returns table (
  chunk_id uuid,
  conversation_id uuid,
  conversation_title text,
  chunk_content text,
  chunk_index integer,
  source text,
  similarity float
)


language plpgsql
as $$
begin
  return query
    select
      cc.id as chunk_id,
      c.id as conversation_id,
      c.title as conversation_title,
      cc.content as chunk_content,
      cc.chunk_index,
      c.source,
      1 - (cc.embedding <=> query_embedding) as similarity
    from conversation_chunks cc
    join conversations c on c.id = cc.conversation_id
    where
      (filter_project_id is null or c.project_id = filter_project_id)
      and (filter_source is null or c.source = filter_source)
      and 1 - (cc.embedding <=> query_embedding) > similarity_threshold
    order by cc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table projects enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table conversation_chunks enable row level security;

create policy "Users see own projects"
  on projects for all
  using (auth.uid() = user_id);

create policy "Users see own conversations"
  on conversations for all
  using (auth.uid() = user_id);

create policy "Users see own messages"
  on messages for all
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

create policy "Users see own chunks"
  on conversation_chunks for all
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

-- Service role bypasses RLS (for the FastAPI backend)
-- The backend uses supabase_service_key which has service_role access