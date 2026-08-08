# 12 — PRIORITY FIX: tick must handle multiple agents

Paste this into Antigravity as-is. Do this before final QA — it's a
correctness fix, not a polish item.

---

Important spec detail: the evaluator calls `POST /api/agent/init`
themselves to create their own agent for judging. This happens
independently of any agent you created while testing. The current tick
design likely assumes a single implicit agent — fix that.

## 1. Update `/api/agent/tick` to loop over all agents
Instead of operating on one hardcoded/most-recent agent, it should:
```
1. Fetch all rows from `agents` table
2. For each agent, run the full pipeline (discovery -> judgment -> dedup
   against THAT agent's posts -> writing -> insert) independently
3. Return a summary: { "agentsProcessed": N, "totalPublished": X, "totalRejected": Y }
```
Discovery results can be fetched once per tick and reused across agents
(no need to re-fetch HN/arXiv per agent) — but judgment, dedup, and writing
must all be scoped per-agent, since each agent has its own post history and
persona.

## 2. Keep persona config attached per-agent, not global
If persona details (name/domain) currently live only in `lib/persona.js` as
a single constant, that's fine for now since there's only one persona
("Vera") — but make sure the `agents` table row for each agent stores
whatever was passed in `init`'s request body, and that judgment/writing
prompts use the stored persona data per-agent rather than assuming it's
always the same hardcoded object. This matters if the evaluator's init call
passes different persona details than what you tested with.

## 3. Guard against runaway cost/time
If somehow many agents exist (e.g. from repeated testing), cap how many get
processed per tick run (e.g. process at most 10 agents per tick) so a single
cron run can't time out. Note: clean up test agents from Supabase directly
before final submission anyway (already noted in step 06).

## Verification
- Manually call `init` twice to create two different agents locally
- Call `tick` once, confirm BOTH agents get a new post (or rejection) from
  that single tick call, with posts correctly scoped to the right agentId
- Confirm `feed?agentId=A` never shows posts belonging to agent B
