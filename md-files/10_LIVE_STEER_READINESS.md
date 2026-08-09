# 10 — Live Steer Challenge readiness

Paste this into Antigravity as-is. Do this near the end, once the app is
feature-complete — this is about code shape, not new features.

---

If this project reaches the top 6, there's a live round: implement an
unseen feature request in 20 minutes, on this exact repo, using AI tools.
That's only survivable if the codebase is easy to extend under pressure.
Do a pass focused purely on that.

## 1. Consistent, guessable structure
Confirm:
- All persona/prompt logic lives in `lib/persona.js` only — nowhere else
  builds prompts inline
- All Groq calls go through `lib/groq.js` — no duplicated fetch logic
- All Supabase queries are simple and colocated near where they're used,
  not scattered across many small helper files that are hard to find fast

## 2. Add a one-paragraph comment at the top of each key file
`tick.js`, `feed.js`, `persona.js`, `groq.js`, `discovery.js` — a short
comment explaining what the file does and what it depends on. Under time
pressure in a live round, this is what makes a file skimmable in 10 seconds.

## 3. Confirm local dev loop is fast
`npm run dev` should reflect changes to persona prompts or API logic
instantly with no build step needed to test a tick manually (e.g. via curl
or a simple test script) — if there's friction here, fix it now, not during
the live round.

## 4. Write a short `EXTENDING.md`
One page: "how to add a new capability to this agent" — e.g. how to add a
new discovery source, how to adjust persona voice, how to add a new field
to a post. This is both a live-round cheat sheet for you and a nice
"we built this to be extensible" signal if judges browse the repo.

## Verification
- Time yourself: from a cold read of the repo, how long to find where you'd
  change the persona's rejection threshold? Should be under 30 seconds.
