# Wibecoded — Vera: Autonomous AI Security Research Agent

An autonomous AI editorial agent that continuously discovers AI security developments, exercises independent editorial judgment, remembers what it has published and rejected, and publishes technically grounded analysis — all without human intervention after initialization.

## Persona: Vera

Vera is an independent AI security researcher. Direct, technically precise, and genuinely skeptical of AI hype. Her analysis focuses on:
- Novel attack techniques and disclosed vulnerabilities
- Prompt injection, LLM security, and model abuse
- AI supply-chain security and infrastructure risks
- The gap between AI safety marketing and actual security engineering

Vera rejects product announcements, funding news, and generic AI hype. She only publishes content with a concrete technical hook that a security engineer would care about.

## Architecture

```
GitHub Actions (cron, every 2h)
        │  POST /api/agent/tick  (header: x-tick-secret)
        ▼
Next.js API routes  ───►  Groq (llama-3.3-70b)
        │                     │
        │   ┌─────────────────┤
        │   │  Judgment (100-point scoring)
        │   │  Writing (enriched context)
        │   │  Memory extraction
        │   │  Fact validation
        │   └─────────────────┘
        ▼
Supabase (PostgreSQL)
  - agents              Agent identity
  - posts               Published content
  - editorial_memory     Structured publication memory
  - rejected_topics      All rejected/duplicate/low-value decisions
  - tick_cycles          Cycle tracking and statistics
```

## Autonomous Pipeline

Every tick cycle executes this 13-step pipeline:

```
 1. Resolve Agent ID (env var or latest)
 2. Concurrency Guard (prevent duplicate runs)
 3. Discover Topics (HN, BleepingComputer, arXiv, GitHub Advisories)
 4. Normalize Titles (for comparison)
 5. Retrieve Memory (recent publications + rejections)
 6. Novelty Pre-filter (Jaccard similarity + word overlap)
 7. Editorial Scoring (100-point structured score via LLM)
 8. Accept/Reject (threshold: 70/100)
 9. Source Validation (URL reachability check)
10. Generate Post (enriched context: score, memory, angles)
11. Validate Output (LLM fact-check against source)
12. Persist (post + memory + rejections + cycle stats)
13. Extract Memory (structured memory for future decisions)
```

## Editorial Judgment

The editorial scoring system evaluates each topic on five criteria:

| Criterion       | Max Points | What it measures                                   |
| --------------- | ---------- | -------------------------------------------------- |
| Relevance       | 25         | Technical hook for AI security engineers            |
| Novelty         | 20         | Genuinely new information, not a rehash             |
| Technical Depth | 20         | Concrete details (CVEs, code, attack vectors)       |
| Timeliness      | 20         | Current, time-sensitive development                 |
| Persona Fit     | 15         | Alignment with Vera's focus and voice               |

**Threshold: 70/100** — Topics below this are rejected with a recorded reason.

Duplicate detection uses normalized title comparison (Jaccard similarity + word overlap ratio) with an LLM fallback for borderline cases. The system distinguishes:
- **Duplicate**: Same underlying story
- **Related but novel**: Same broader subject, genuinely new development
- **New**: Meaningfully different topic

## Memory System

Every published post generates structured editorial memory:
- Topic, angle, key claims, technical concepts
- Entities/products/projects mentioned
- Vera's editorial stance and opinion
- Source URLs and editorial score

This memory is used in future editorial decisions to:
- Avoid covering the same story twice
- Find genuinely different angles on related topics
- Maintain consistent editorial voice over time

## API Contract

### Initialize Agent (required by evaluator)
```
POST /api/agent/init
Content-Type: application/json

Request:  { "persona": { "name": "Vera", "domain": "AI Security" } }
Response: { "agentId": "abc-123" }
```

### Retrieve Feed (required by evaluator)
```
GET /api/agent/feed?agentId=abc-123

Response:
{
  "posts": [
    {
      "id": "p7",
      "createdAt": "2026-08-07T10:30:00Z",
      "text": "...",
      "rationale": "...",
      "sources": ["https://..."]
    }
  ]
}
```

### Autonomous Tick (internal, protected)
```
POST /api/agent/tick
Header: x-tick-secret: <TICK_SECRET>

Response: { "published": 1, "rejected": 6, "duplicates": 2, ... }
```

## Environment Variables

```
SUPABASE_URL=          # Supabase project URL
SUPABASE_SERVICE_KEY=  # Supabase service role key
GROQ_API_KEY=          # Groq API key
TICK_SECRET=           # Protects the tick endpoint
AGENT_ID=              # (Optional) Pin to specific agent ID for production
```

## How to Test

1. Set up `.env.local` with the variables above
2. Run the Next.js dev server: `npm run dev`
3. Initialize: `POST /api/agent/init` with persona JSON body
4. Trigger a tick: `POST /api/agent/tick` with `x-tick-secret` header
5. View feed: `GET /api/agent/feed?agentId=<id>`
6. Check the frontend at `http://localhost:3000` for the dashboard

## Verification of Autonomy

Vera's autonomy is verifiable through:
1. **Rejection data**: The `rejected_topics` table logs every topic Vera considered and rejected, with structured reasons
2. **Editorial memory**: The `editorial_memory` table shows structured memory extracted from every published post
3. **Cycle tracking**: The `tick_cycles` table records every autonomous cycle with discovery/publish/reject counts
4. **Dashboard**: The public frontend shows real-time statistics and recent editorial decisions
5. **GitHub Actions**: The cron workflow runs every 2 hours without human intervention

## Technology Stack

- **Runtime**: Next.js (App Router, JavaScript)
- **Database**: Supabase (PostgreSQL)
- **LLM**: Groq (llama-3.3-70b-versatile)
- **Discovery**: Hacker News Algolia, BleepingComputer RSS, arXiv cs.CR, GitHub Advisories
- **Deployment**: Vercel + GitHub Actions
