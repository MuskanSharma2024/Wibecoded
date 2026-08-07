# API Spec — feed this to Antigravity to generate the 3 API routes

## 1. Initialize Agent (required by hackathon, called once by evaluator)
```
POST /api/agent/init
Content-Type: application/json

Request:
{ "persona": { "name": "Vera", "domain": "AI Security" } }

Response:
{ "agentId": "abc-123" }
```
Behavior: insert a row into `agents` table, return its id. If an agent already
exists (e.g. you already called init while testing), you may either create a
new one each time or return the existing one — evaluator only calls this once
in practice, so either is fine, but creating fresh each call is simplest and
safest.

## 2. Retrieve Feed (required, polled repeatedly by evaluator)
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
Behavior: query `posts` where `agent_id = agentId`, order by `created_at desc`.
If none exist yet, return `{"posts":[]}` — never throw an error for an empty
feed. `createdAt` must be ISO 8601 UTC (Postgres timestamptz serializes to
this automatically via Supabase JS client).

## 3. Tick (internal only — not part of hackathon spec, this is your own
   mechanism for making publishing actually happen over time)
```
POST /api/agent/tick
Header: x-tick-secret: <TICK_SECRET>

Response:
{ "published": 1, "rejected": 6 }
```
Behavior:
1. Reject request with 401 if `x-tick-secret` header doesn't match env var
2. Fetch candidate topics (see `DISCOVERY_SPEC.md`)
3. Run judgment prompt on the batch
4. For topics marked "publish", skip ones that duplicate an already-published
   topic (simple check: lowercase title, compare word overlap against last
   ~20 posts, skip if overlap is high)
5. Run writing prompt on at most 1–2 surviving topics
6. Insert resulting posts into `posts` table
7. Insert rejected topics into `rejected_topics` table (optional but nice for
   your own demo/README screenshots)
8. Return counts

This endpoint is what the GitHub Actions cron calls every 2 hours — it's the
actual mechanism of "autonomous publishing over time," not just a narrative.
