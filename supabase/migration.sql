-- Migration: Run this in Supabase SQL Editor to upgrade existing tables
-- Safe to run multiple times (all operations use IF NOT EXISTS / IF EXISTS checks)

-- 1. Add editorial_score to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_score integer;

-- 2. Expand rejected_topics table
ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS normalized_title text;
ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS editorial_score integer;
ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS decision_type text DEFAULT 'rejected';

-- 3. Create editorial_memory table
CREATE TABLE IF NOT EXISTS editorial_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  post_id uuid references posts(id) not null,
  topic text not null,
  normalized_title text not null,
  angle text,
  key_claims jsonb default '[]',
  technical_concepts jsonb default '[]',
  entities jsonb default '[]',
  editorial_stance text,
  source_urls jsonb default '[]',
  editorial_score integer,
  created_at timestamptz default now()
);

-- 4. Create tick_cycles table
CREATE TABLE IF NOT EXISTS tick_cycles (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  discovered_count integer default 0,
  published_count integer default 0,
  rejected_count integer default 0,
  duplicate_count integer default 0,
  low_value_count integer default 0,
  validation_failed_count integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'running'
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_editorial_memory_agent ON editorial_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_rejected_topics_agent ON rejected_topics(agent_id);
CREATE INDEX IF NOT EXISTS idx_tick_cycles_agent ON tick_cycles(agent_id);
CREATE INDEX IF NOT EXISTS idx_posts_agent ON posts(agent_id);

-- 6. Add agent_memory to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_memory jsonb DEFAULT '{}';
