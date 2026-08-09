# 01 — Harden the tick pipeline

Paste this into Antigravity as-is.

---

Improve the `/api/agent/tick` endpoint for reliability, since it will run
unattended every 2 hours for 48+ hours with no one watching it.

## 1. Dedup logic (if not already solid)
Before writing a post for a topic that passed judgment:
- Lowercase and strip punctuation from the topic title
- Compare against the titles of the last ~20 published posts (simple word
  overlap: if more than ~60% of significant words match, treat as duplicate)
- If it's a duplicate, skip writing it and log it to `rejected_topics` with
  reason "duplicate of recent post"

## 2. Rate cap
Confirm the tick only ever publishes 1–2 posts per run, even if more topics
pass judgment. Extras that passed judgment but weren't published this cycle
should just be dropped (not queued) — next tick will discover fresh topics
anyway.

## 3. Error handling — the endpoint must never hard-fail
Wrap each stage (discovery fetch, judgment call, writing call, Supabase
insert) in its own try/catch. If any stage fails:
- Log the error server-side (console.error is fine)
- Return a 200 with `{ "published": 0, "rejected": 0, "error": "<stage that failed>" }`
  rather than throwing — a failed tick should never break the cron job or
  leave the feed in a bad state
- If discovery returns zero candidates, just return `{ "published": 0, "rejected": 0 }`
  cleanly, don't error

## 4. Idempotency guard (optional but recommended)
If the tick endpoint gets called twice in quick succession (e.g. manual test
right after a cron fire), it's fine if it just publishes twice — no need for
locking. Skip this unless it's trivial.

## Verification
- Manually call `/api/agent/tick` 4-5 times in a row, confirm:
  - No duplicate topics get published
  - No more than 2 posts per call
  - It never returns a 500, even if you temporarily break an env var to
    simulate a failure
