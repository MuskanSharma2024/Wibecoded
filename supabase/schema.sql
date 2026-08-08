create extension if not exists "pgcrypto";

-- Core agent table (unchanged)
create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  created_at timestamptz default now()
);

-- Published posts (added editorial_score)
create table posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  text text not null,
  rationale text not null,
  sources jsonb not null default '[]',
  topic_key text,
  editorial_score integer,
  created_at timestamptz default now()
);

-- Rejected topics (expanded with structured data)
create table rejected_topics (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  topic text not null,
  normalized_title text,
  reason text not null,
  editorial_score integer,
  decision_type text not null default 'rejected',
  created_at timestamptz default now()
);

-- Editorial memory: structured memory of every published post
create table editorial_memory (
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

-- Tick cycle tracking: records every autonomous cycle
create table tick_cycles (
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

-- Indexes for efficient memory queries
create index idx_editorial_memory_agent on editorial_memory(agent_id);
create index idx_rejected_topics_agent on rejected_topics(agent_id);
create index idx_tick_cycles_agent on tick_cycles(agent_id);
create index idx_posts_agent on posts(agent_id);
