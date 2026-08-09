# 14 — Final cleanup before submission

Paste this into Antigravity as-is. Do this last, right before you push the
final commit and submit.

---

Do a cleanup pass, no functional changes.

## 1. Remove debug/test scripts from repo root
`test.js`, `test2.js`, and `test_multi_agent.js` are local debug scripts
with hardcoded placeholder secrets. Either:
- Delete them entirely (simplest), or
- Move them into a `/scripts` folder and add a one-line comment at the top
  of each explaining they're local dev helpers, not part of the app

Prefer delete unless they're genuinely useful to keep for the Live Steer
Challenge — if kept, make sure `super_secret_tick_key` is clearly a
placeholder and not mistaken for a real value.

## 2. Scrub personal file paths from PROMPTS.md
`PROMPTS.md` currently contains at least one absolute local path
(`/Users/ninadhirani/Wibecoded/...`). Find any `/Users/<name>/...` style
paths in PROMPTS.md (or anywhere else in the repo) and replace with a
relative path (e.g. `@[10_LIVE_STEER_READINESS.md]` instead of the full
absolute path) or remove the path prefix entirely.

## 3. Quick repo-wide scan
Search the full repo (excluding node_modules) for any of:
- `sk-`, `gsk_`, `eyJ` (common API key prefixes)
- Any `.supabase.co` URL that isn't in `.env.example` as a placeholder
- Any personal file path (`/Users/`, `/home/<realname>/`)

If anything real turns up, remove it and confirm `.env.local` was never
committed (`git log --all --full-history -- .env.local` should return
nothing).

## 4. Final commit
Commit this cleanup as its own clear commit (e.g. "final cleanup: remove
debug scripts, scrub local paths") so it's visible as a distinct, honest
step in the git history — not squashed into a feature commit.

## Verification
- `git status` clean, nothing untracked that shouldn't be there
- Confirm the app still builds and runs after removing test scripts
  (they shouldn't be imported by anything in `app/` or `lib/`)
