# 13 — PRIORITY FIX: init should trigger an immediate first tick

Paste this into Antigravity as-is. Do this right after step 12.

---

When the evaluator calls `POST /api/agent/init`, their feed will be empty
until the next scheduled cron tick fires — which could be up to ~2 hours
away. That's a bad first impression right at the start of judging. Fix it
so the new agent gets its first post (or at least a real judgment pass)
immediately.

## Update `/api/agent/init`
After inserting the new agent row, before returning the response:
1. Run the SAME pipeline logic used in tick (discovery -> judgment -> dedup
   -> writing -> insert), but scoped to just this one new agent
2. Do this synchronously if it comfortably finishes in a few seconds: await
   it before returning the `agentId` response
3. If it risks being slow (multiple sequential LLM calls could approach
   Vercel's serverless timeout), fire it without awaiting the full
   completion (don't block the init response on it), but make sure it still
   runs to completion server-side

Prefer option 2 (synchronous, awaited) if the pipeline reliably finishes in
under ~8 seconds during testing — it's simpler and guarantees the first
post exists before init even returns. Test this and pick whichever is
actually reliable.

## Refactor note
This means the core pipeline logic (discovery -> judgment -> dedup ->
writing -> insert, for one agent) should live in a single shared function,
e.g. `lib/pipeline.js` with something like `runPipelineForAgent(agentId)`,
called from BOTH `/api/agent/tick` (looping over all agents, per step 12)
AND `/api/agent/init` (for just the new agent). Don't duplicate this logic
across two files.

## Verification
- Call `init` fresh, then immediately call `feed?agentId=<new id>` — confirm
  at least one post (or a clear rejection-only cycle, which is still a
  sign of life) appears without waiting for the next cron run
- Confirm this doesn't break the multi-agent tick loop from step 12 — both
  should use the same underlying pipeline function
