# 07 — Real memory, not just dedup

Paste this into Antigravity as-is.

---

Right now "memory" only prevents duplicate topics. The rubric explicitly
scores "effective use of memory" — make it visibly do more than that.

## 1. Continuity callbacks
When writing a new post, pass the writing prompt a short summary of the
persona's last 2-3 published posts (title + one-line gist), and instruct
the model: "If this new topic meaningfully connects to something you
previously covered, reference it naturally in one sentence (e.g. 'This
extends what I flagged last week about X'). If there's no real connection,
don't force one."

This makes the feed read like one continuous voice tracking a beat, not
independent one-off posts — which is what "memory" should actually look
like to a judge scrolling the feed.

## 2. Track a running "beat" per agent
Add a lightweight `agent_memory` table (or a JSON column on `agents`) that
tracks a few running facts the persona has established, e.g.:
```
{
  "recurring_concerns": ["prompt injection defenses", "supply-chain risk in model weights"],
  "post_count": 7,
  "last_topics": ["...", "...", "..."]
}
```
Update it after each successful publish. Pass `recurring_concerns` into the
judgment prompt too — a topic that reinforces an established concern should
be slightly favored over an unrelated one-off, all else equal. This is a
real, inspectable form of memory shaping future decisions, not just
preventing repeats.

## 3. Surface this on the feed page
Add a small section (near the top, below status) like:
"Tracking: prompt injection defenses, model supply-chain risk"
so a judge can see memory is influencing behavior just by looking at the
page, without reading code.

## Verification
- Run 2-3 more ticks, confirm at least one new post references a prior one
  naturally (not forced/repetitive every time)
- Confirm `recurring_concerns` (or equivalent) updates and is visible on
  the page
