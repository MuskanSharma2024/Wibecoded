# Project Plan — Autonomous AI Persona (PS3)

## Goal
Build an AI persona that, after one `init` call, keeps discovering, judging, writing,
and publishing posts on its own for 48 hours — no further human input.

## Why this approach
- Discovery source needs no API key (Hacker News Algolia) → nothing to break under time pressure.
- Storage is Supabase (you already know it from GradPath AI / Nomance) → fast setup.
- "Autonomous over time" is satisfied by a GitHub Actions cron job hitting a `/tick`
  endpoint every 2 hours — this is genuinely scheduled, not faked, so it survives
  Stage 2 authenticity review.
- Judgment + writing both go through Groq (free, fast) using two separate prompts so
  "editorial judgment" is a real filtering step, not just narrated in text.

## Persona
- Name: **Vera**, domain: **AI Security**
- Voice: direct, technically precise, skeptical of hype, no emojis/exclamation points
- Standards: rejects pure announcement/funding news and generic restatements;
  prefers concrete vulnerabilities, novel attack techniques, papers with real findings

(Full prompt text for this is in `PERSONA_SPEC.md` — paste it into Antigravity as-is.)

## Architecture
```
GitHub Actions (cron, every 2h)
        │  POST /api/agent/tick  (header: x-tick-secret)
        ▼
Next.js API routes  ───►  Groq (llama-3.3-70b)   [judgment + writing]
        │
        ▼
Supabase (Postgres)
  - agents
  - posts
  - rejected_topics (for your own demo narrative, not required by spec)
```

## Pipeline run on every tick
1. Fetch ~10 recent AI/security stories from Hacker News Algolia search API
2. Send all 10 to Groq with the **judgment prompt** → publish/reject + reason each
3. For each "publish" topic, check it's not a near-duplicate of an already-published
   topic (simple title/keyword overlap check against Supabase `posts`)
4. Send the surviving topic(s) to Groq with the **writing prompt** → post text + rationale
5. Insert into `posts` table
6. Cap: publish at most 1–2 posts per tick so the feed fills gradually over 48h,
   not all at once

## Build order (do these in this order in Antigravity)
1. Scaffold Next.js app (JS is fine, no need for TypeScript)
2. Create Supabase project → run `supabase/schema.sql` (below) in SQL editor
3. Build `lib/persona.js`, `lib/groq.js`, `lib/discovery.js` (see specs)
4. Build the 3 API routes (see `API_SPEC.md`)
5. Test `tick` manually by calling it yourself a few times, confirm posts appear via `feed`
6. Deploy to Vercel, add env vars there
7. Add the GitHub Actions workflow (below), add repo secrets, confirm it fires
8. Call `init` once for real before submission so the feed isn't empty at judging time

## Environment variables needed
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GROQ_API_KEY=
TICK_SECRET=          # any random string, protects your own tick endpoint
```
Get Supabase keys: supabase.com → new project → Settings → API
Get Groq key: console.groq.com → API Keys (free, no card)

## Supabase schema (`supabase/schema.sql`)
```sql
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
```

## GitHub Actions cron (`.github/workflows/tick.yml`)
```yaml
name: agent-tick
on:
  schedule:
    - cron: "0 */2 * * *"   # every 2 hours
  workflow_dispatch: {}       # lets you trigger manually too

jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Call tick endpoint
        run: |
          curl -X POST "${{ secrets.TICK_URL }}" \
            -H "x-tick-secret: ${{ secrets.TICK_SECRET }}"
```
Add repo secrets: Settings → Secrets and variables → Actions
- `TICK_URL` = `https://your-app.vercel.app/api/agent/tick`
- `TICK_SECRET` = same value as in Vercel env vars

## What "editorial judgment" needs to visibly demonstrate
Judges will look for real rejection behavior, not just publish-everything. Make sure
your judgment prompt actually rejects a meaningful fraction of candidate topics —
if in testing everything gets published, tighten the standards text in
`PERSONA_SPEC.md`.

## Submission checklist
- [ ] `init` and `feed` match the exact contract in `API_SPEC.md`
- [ ] Feed returns `{"posts":[]}` when empty, never an error
- [ ] Posts are reverse chronological, each with unique id
- [ ] `createdAt` is ISO 8601 UTC
- [ ] Cron confirmed firing at least twice before you submit (check Actions tab)
- [ ] `PROMPTS.md` filled in with your real Antigravity prompts
- [ ] README explains persona, architecture, and how to verify autonomy
- [ ] Repo public, live URL works, both added to submission form
