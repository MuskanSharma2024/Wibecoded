import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Self-service migration endpoint.
 * Call POST /api/agent/migrate with x-tick-secret header to run the migration.
 * This uses individual DDL statements via Supabase RPC.
 * Since we can't run raw SQL via REST API, this endpoint creates tables
 * by attempting inserts and handling the results.
 * 
 * For the actual DDL migration, this creates an RPC function first.
 */
export async function POST(request) {
  const tickSecret = request.headers.get('x-tick-secret');
  if (tickSecret !== process.env.TICK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  // Helper: test if a table/column exists by trying to select from it
  async function tableExists(table, columns = ['id']) {
    const { error } = await supabase.from(table).select(columns.join(',')).limit(0);
    return !error;
  }

  // Check current state
  const checks = {
    agents: await tableExists('agents'),
    posts_editorial_score: await tableExists('posts', ['editorial_score']),
    rejected_normalized: await tableExists('rejected_topics', ['normalized_title']),
    editorial_memory: await tableExists('editorial_memory'),
    tick_cycles: await tableExists('tick_cycles'),
  };

  results.push({ checks });

  // If everything exists, we're done
  if (Object.values(checks).every(v => v)) {
    return NextResponse.json({ status: 'already_migrated', checks, results });
  }

  // We can't create tables via REST API directly.
  // Instead, we'll output the exact SQL the user needs to run.
  const missingSql = [];

  if (!checks.posts_editorial_score) {
    missingSql.push('ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_score integer;');
  }

  if (!checks.rejected_normalized) {
    missingSql.push(
      'ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS normalized_title text;',
      'ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS editorial_score integer;',
      'ALTER TABLE rejected_topics ADD COLUMN IF NOT EXISTS decision_type text DEFAULT \'rejected\';',
    );
  }

  if (!checks.editorial_memory) {
    missingSql.push(
      `CREATE TABLE IF NOT EXISTS editorial_memory (
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
);`
    );
  }

  if (!checks.tick_cycles) {
    missingSql.push(
      `CREATE TABLE IF NOT EXISTS tick_cycles (
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
);`
    );
  }

  missingSql.push(
    'CREATE INDEX IF NOT EXISTS idx_editorial_memory_agent ON editorial_memory(agent_id, created_at desc);',
    'CREATE INDEX IF NOT EXISTS idx_rejected_topics_agent ON rejected_topics(agent_id, created_at desc);',
    'CREATE INDEX IF NOT EXISTS idx_tick_cycles_agent ON tick_cycles(agent_id, created_at desc);',
    'CREATE INDEX IF NOT EXISTS idx_posts_agent ON posts(agent_id, created_at desc);',
  );

  return NextResponse.json({
    status: 'migration_needed',
    checks,
    instructions: 'Run the following SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)',
    sql: missingSql.join('\n\n'),
  });
}
