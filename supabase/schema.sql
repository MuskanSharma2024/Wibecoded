create extension if not exists "pgcrypto";

create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  created_at timestamptz default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  text text not null,
  rationale text not null,
  sources jsonb not null default '[]',
  topic_key text,
  created_at timestamptz default now()
);

create table rejected_topics (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) not null,
  topic text not null,
  reason text not null,
  created_at timestamptz default now()
);
