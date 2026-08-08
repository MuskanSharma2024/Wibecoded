# 04 — Edge case hardening

Paste this into Antigravity as-is.

---

Go through the full app (feed page, API routes) and confirm these edge
cases are handled cleanly. Fix any that aren't.

## 1. Empty feed
- Fresh `agentId` with zero posts: `/api/agent/feed` returns `{"posts":[]}`,
  never an error
- The homepage UI shows a clear "Vera hasn't published yet" state, not a
  blank page or a broken map over `undefined`

## 2. Invalid or missing `agentId`
- `GET /api/agent/feed` with no `agentId` query param, or one that doesn't
  exist in the `agents` table: return `{"posts":[]}` with a 200, not a 500.
  (Evaluators may test with a bad id — don't let that crash anything.)

## 3. Tick with zero surviving candidates
- If discovery returns topics but all get rejected by judgment, or all are
  duplicates: tick should return cleanly with `published: 0`, and this
  should NOT count as an error

## 4. Malformed LLM output
- If Groq returns something that isn't valid JSON (happens occasionally
  despite prompt instructions), catch the parse error and skip that
  topic/tick rather than crashing. Log what the raw output was so it's
  debuggable later.

## 5. Multiple agents (in case init gets called more than once)
- Confirm `/api/agent/feed?agentId=X` only ever returns posts belonging to
  that specific agent, not all posts in the table — check the Supabase
  query has a proper `where agent_id = X` filter

## Verification
- Test each case above manually (e.g. hit feed with a garbage agentId,
  temporarily break the Groq key to simulate malformed output, call tick
  when you know there's nothing new to discover)
- Confirm nothing in the app ever returns a raw 500 or an unhandled
  exception page to the evaluator
