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
  source text not null check (source in ('chatgpt', 'claude', 'gemini', 'manual')),
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

-- Message embeddings: vector embeddings for semantic search
create table if not exists message_embeddings (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade not null unique,
  conversation_id uuid references conversations(id) on delete cascade not null,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Vector similarity search index (IVFFlat for good balance of speed/accuracy)
create index if not exists idx_message_embeddings_vector
  on message_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Query performance indexes
create index if not exists idx_conversations_user on conversations(user_id);
create index if not exists idx_conversations_project on conversations(project_id);
create index if not exists idx_conversations_source on conversations(source);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_message_embeddings_conversation on message_embeddings(conversation_id);

-- ============================================================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================================================

-- This function is called by the FastAPI backend for vector similarity search
create or replace function search_messages(
  query_embedding vector(1536),
  match_count int default 10,
  filter_project_id uuid default null,
  filter_source text default null
)
returns table (
  message_id uuid,
  conversation_id uuid,
  conversation_title text,
  content text,
  role text,
  source text,
  similarity float
)
language plpgsql
as $$
begin
  return query
    select
      m.id as message_id,
      c.id as conversation_id,
      c.title as conversation_title,
      m.content,
      m.role,
      c.source,
      1 - (me.embedding <=> query_embedding) as similarity
    from message_embeddings me
    join messages m on m.id = me.message_id
    join conversations c on c.id = me.conversation_id
    where
      (filter_project_id is null or c.project_id = filter_project_id)
      and (filter_source is null or c.source = filter_source)
    order by me.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table projects enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_embeddings enable row level security;

-- Users can only see their own data
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

create policy "Users see own embeddings"
  on message_embeddings for all
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

-- Service role bypasses RLS (for the FastAPI backend)
-- The backend uses supabase_service_key which has service_role access
