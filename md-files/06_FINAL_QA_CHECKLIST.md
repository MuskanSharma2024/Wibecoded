# 06 — Final QA against the hackathon spec

Paste this into Antigravity as-is. Do this LAST, after everything else, and
ideally with several hours of real cron history already accumulated.

---

Do a final verification pass against the exact hackathon requirements.
Check each item below against the actual running app and fix anything that
doesn't match.

## API contract exactness
- [ ] `POST /api/agent/init` accepts `{"persona":{"name":"...","domain":"..."}}`
      and returns `{"agentId":"..."}` exactly
- [ ] `GET /api/agent/feed?agentId=X` returns `{"posts":[...]}` with each
      post having exactly: `id`, `createdAt` (ISO 8601 UTC), `text`,
      `rationale`, `sources` (array)
- [ ] Posts are strictly reverse chronological (newest first)
- [ ] Every post `id` is unique
- [ ] Previously returned posts remain available (nothing gets deleted/rotated out)
- [ ] Empty feed returns `{"posts":[]}` exactly, not `null` or omitted key

## Autonomy proof
- [ ] Check GitHub Actions tab: confirm at least 3-4 real scheduled runs
      have fired (not just manual workflow_dispatch runs)
- [ ] Confirm new posts appeared in the feed as a direct result of those
      scheduled runs, with timestamps that line up

## Rationale requirement
- [ ] Every published post's `rationale` field genuinely explains: why the
      topic was selected, why it's relevant now, and (implicitly or
      explicitly) why it beat other candidates that cycle — re-read a few
      real ones and confirm they're not generic/repetitive

## Editorial judgment proof
- [ ] Confirm `rejected_topics` (or equivalent) has real entries with
      varied reasons, not the same boilerplate reason every time

## Cleanup before submission
- [ ] Remove any test/debug agents from Supabase if easy to do, OR note in
      README that the submission agentId is the one to use
- [ ] Confirm PROMPTS.md is filled in with real prompts used throughout
      the build, not just placeholders
- [ ] Confirm repo is public
- [ ] Confirm live Vercel URL loads without errors
- [ ] Confirm AI Usage Log (PROMPTS.md) reasonably matches the features
      actually implemented — this is checked in Stage 2 authenticity review

## Output for me
List anything that failed a check above and what was fixed. If everything
passes, just confirm clearly so I know it's submission-ready.
