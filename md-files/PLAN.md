# Project Plan — Autonomous AI Persona (PS3)

## Goal
Build an AI persona that, after one `init` call, keeps discovering, judging, writing,
and publishing posts on its own for 48 hours — no further human input.

## Architecture (Upgraded)
```
GitHub Actions (cron, every 2h)
        │  POST /api/agent/tick  (header: x-tick-secret)
        ▼
Next.js API routes  ───►  Groq (llama-3.3-70b)
        │                     │
        │   ┌─────────────────┤
        │   │  Judgment (100-point scoring with memory)
        │   │  Writing (enriched context)
        │   │  Memory extraction (structured)
        │   │  Fact/source validation
        │   │  Novelty/duplicate detection
        │   └─────────────────┘
        ▼
Supabase (PostgreSQL)
  - agents              Agent identity
  - posts               Published content + editorial score
  - editorial_memory     Structured per-post memory
  - rejected_topics      All rejected/duplicate/low-value decisions
  - tick_cycles          Autonomous cycle tracking
```

## 13-Step Autonomous Pipeline

```
 1. Resolve Agent ID (AGENT_ID env var → latest fallback)
 2. Concurrency Guard (prevent duplicate runs)
 3. Discover Topics (HN + BleepingComputer + arXiv + GitHub Advisories)
 4. Normalize Titles (lowercase, remove stop words, for comparison)
 5. Retrieve Memory (recent publications + rejections from DB)
 6. Novelty Pre-filter (Jaccard similarity + word overlap)
 7. Editorial Scoring (structured 100-point score via LLM with memory)
 8. Accept/Reject (threshold 70/100, explicit reasoning)
 9. Source Validation (HTTP HEAD check on URLs)
10. Generate Post (enriched context: score, memory, angles, persona)
11. Validate Output (LLM fact-check against source)
12. Persist (post + editorial score + cycle stats)
13. Extract Memory (topic, angle, claims, concepts, stance → editorial_memory)
```

## Editorial Scoring (100 points)
| Criterion       | Points | Description                              |
| --------------- | ------ | ---------------------------------------- |
| Relevance       | 0-25   | AI security engineering hook             |
| Novelty         | 0-20   | Not a rehash of known facts              |
| Technical Depth | 0-20   | CVEs, code, attack vectors, specifics    |
| Timeliness      | 0-20   | Current, time-sensitive                  |
| Persona Fit     | 0-15   | Matches Vera's focus                     |

Threshold: **70/100** minimum to publish.

## Discovery Sources (20 categories × 4 sources)
**Categories**: prompt injection, indirect prompt injection, LLM security,
AI vulnerabilities, AI agents security, MCP security, AI supply-chain security,
model security, AI red teaming, AI privacy, AI infrastructure security,
agentic AI security, model abuse, tool-use security, AI sandboxing,
AI authentication/authorization, AI data leakage, open-source AI security,
inference security, AI deployment security.

**Sources**: Hacker News Algolia, BleepingComputer RSS, arXiv cs.CR, GitHub Advisories.

## Memory System
Every published post → structured editorial memory:
- topic, normalized_title, angle, key_claims
- technical_concepts, entities, editorial_stance
- source_urls, editorial_score

Used in future decisions to avoid repetition and find new angles.

## Rejection Types
- `rejected` — scored below threshold
- `duplicate` — substantially overlaps with previous coverage
- `low_value` — scored below 40/100
- `validation_failed` — source unreachable or fact-check failure

## Library Modules
- `lib/persona.js` — Vera's identity, voice, prompts (judgment, writing, memory, validation)
- `lib/groq.js` — Groq LLM wrapper with retries and system messages
- `lib/discovery.js` — Multi-source topic discovery with deduplication
- `lib/memory.js` — Editorial memory CRUD and formatting
- `lib/novelty.js` — Duplicate detection (Jaccard + LLM fallback)
- `lib/validator.js` — Source URL validation and fact-checking
- `lib/supabase.js` — Database client

## Environment Variables
```
SUPABASE_URL=          # Supabase project URL
SUPABASE_SERVICE_KEY=  # Supabase service role key
GROQ_API_KEY=          # Groq API key
TICK_SECRET=           # Protects tick endpoint
AGENT_ID=              # (Optional) Pin to specific agent for production
```

## Submission Checklist
- [x] `init` and `feed` match exact contract in API_SPEC.md
- [x] Feed returns `{"posts":[]}` when empty, never an error
- [x] Posts are reverse chronological, each with unique id
- [x] `createdAt` is ISO 8601 UTC
- [x] Cron confirmed firing (GitHub Actions every 2h)
- [x] PROMPTS.md filled with real AI prompts used
- [x] README explains persona, architecture, and autonomy verification
- [x] Editorial memory, judgment, and rejection are real and verifiable
- [x] Dashboard shows real statistics from persisted data
- [ ] Repo public, live URL works, both added to submission form
