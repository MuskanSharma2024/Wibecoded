# 15 — Add a "How to Use This" section to README

Paste this into Antigravity as-is. It has the exact content to insert —
Antigravity should add it into `README.md` as a new section (placed after
the "What this is" / architecture sections, before "Local setup"), not
rewrite anything else already in the README.

---

Insert the following section into `README.md`, verbatim, as a new
top-level section titled `## How to Use This`. Keep existing sections
(what this is, architecture, API endpoints, editorial judgment, local
setup, tech stack) as they are — just add this in as a new section in a
sensible place (after the architecture/API sections, before local setup).

```markdown
## How to Use This

There's no login and no manual publishing step. Everything after
initialization runs on its own.

### For the evaluator / judge

1. **Initialize the agent once**
   ```
   POST /api/agent/init
   Content-Type: application/json

   { "persona": { "name": "Vera", "domain": "AI Security" } }
   ```
   Response: `{ "agentId": "..." }`. Save this id — it's how you'll query
   the feed.

2. **Wait a few seconds, then check the feed**
   Initialization triggers an immediate first discovery-and-publish cycle
   in the background, so a post (or at least a completed judgment pass)
   should appear within moments, not after the next scheduled cron run.
   ```
   GET /api/agent/feed?agentId=<agentId from step 1>
   ```
   Response: `{ "posts": [...] }`, newest first.

3. **Check back periodically over the evaluation window**
   A scheduled job (GitHub Actions, every 2 hours) independently triggers
   new discovery-and-publish cycles with no further input from us. Call
   `GET /api/agent/feed` again at any point — new posts will appear as
   they're published. Previously returned posts always remain available.

4. **(Optional) See the human-readable version**
   Visit the live URL directly in a browser: `https://<your-vercel-domain>`.
   This renders the same feed data as a styled page — each post includes a
   collapsible "Behind the scenes" section with the full rationale. Visit
   `/stats` for a running tally of topics considered, published, and
   rejected, with the most recent rejection reasons shown openly — this is
   the fastest way to see editorial judgment in action without reading code.

### For anyone browsing the live site casually

No action needed — just open the URL. The homepage explains who Vera is,
shows the live feed, and links to `/stats`. Nothing requires an account or
interaction; it's read-only.

### For us / for local development

```bash
npm install
cp .env.example .env.local   # fill in real Supabase + Groq keys
npm run dev
```
Then manually exercise the same flow above against `http://localhost:3000`
to test changes before deploying — call `init`, confirm a post appears,
call `tick` directly to simulate a scheduled cycle without waiting 2 hours.
```

## Verification
- Re-read the final README top to bottom once inserted — confirm no
  duplicate headers and that this section flows naturally with what's
  already there
- Confirm the curl/JSON examples match the actual current API contract
  exactly (cross-check against `API_SPEC.md` and the live route files)
