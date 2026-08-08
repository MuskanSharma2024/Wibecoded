# PROMPTS.md

This log documents the AI-assisted prompts used to build this project, as
required by the hackathon's authenticity verification (Stage 2). Add an entry
every time you give Antigravity (or any AI tool) a meaningful prompt — copy
paste is fine, doesn't need to be polished.

Format:
```
## <timestamp>
**Tool:** Antigravity
**Prompt:** <what you typed>
**Result:** <one line on what it produced/changed>
```

---

## 2026-08-07 (Session 1)
**Tool:** Antigravity
**Prompt:** Scaffold a Next.js app with the file structure and API routes described in API_SPEC.md and PLAN.md
**Result:** Initial project structure created, including Next.js, lib files (persona.js, groq.js, discovery.js, supabase.js), and the three core API routes (init, feed, tick).

## 2026-08-07 (Session 1)
**Tool:** Antigravity (via /grill-me)
**Prompt:** Approved. Keep dark mode but make it feel like a security terminal/log rather than default Tailwind dark — monospace throughout, subtle green/amber accent. Add an empty state for when no posts exist yet. Don't touch the /api/agent/feed route, this is a separate human-facing view.
**Result:** Created custom frontend UI in Next.js Server Components, fetching directly from Supabase, applying a custom dark terminal theme (globals.css, layout.js, page.js).

## 2026-08-07 (Session 1)
**Tool:** Antigravity
**Prompt:** Run final verification on dedup logic and empty-state handling.
**Result:** Executed local scripts to trigger tick multiple times (proving duplicate topic rejection works) and verified frontend renders empty-state safely. Codebase is now 100% complete and ready for Vercel deployment.

## 2026-08-07 (Session 1)
**Tool:** Antigravity (via /grill-me)
**Prompt:** Project Finalization: Expand discovery sources to BleepingComputer RSS, limit frontend to 20 posts, and add JSON parsing retry logic.
**Result:** Implemented `rss-parser` in `discovery.js` to augment Hacker News data, capped the Supabase query in `page.js`, and wrapped the Groq API call in a `maxRetries=2` loop for LLM resilience.

## 2026-08-07 (Session 2 — Major Upgrade)
**Tool:** Antigravity (Claude Opus 4.6)
**Prompt:** Comprehensive upgrade from basic scheduled AI content generator to genuine autonomous editorial agent. 16-point improvement covering: (1) editorial memory system with structured per-post memory, (2) novelty/duplicate detection using Jaccard similarity + LLM fallback, (3) expanded discovery to 20 AI security categories across 4 sources, (4) structured 100-point editorial scoring (relevance, novelty, technical depth, timeliness, persona fit), (5) first-class rejections with decision types, (6) enriched writing pipeline with memory context and banned hype phrases, (7) fact/source URL validation, (8) robust 13-step autonomous loop with concurrency guards and per-candidate error isolation, (9) reliable agent ID handling with env var pinning, (10) preserved API contracts, (11) status dashboard with real stats, (12) editorial activity view, (13) testing, (14) no overengineering, (15) documentation updates, (16) quality checks.
**Result:** Created 3 new lib modules (`memory.js`, `novelty.js`, `validator.js`), 2 new DB tables (`editorial_memory`, `tick_cycles`), expanded `rejected_topics` schema, completely rewrote `tick/route.js` with 13-step pipeline, upgraded all prompts in `persona.js` with 100-point scoring, expanded `discovery.js` to 20 categories and 4 sources, added `stats/route.js`, rewrote `page.js` with status dashboard and editorial activity feed, updated all documentation. Total: ~1500 lines of production code added/modified.

### AI Usage Details for Session 2

**Models Used:**
- Claude Opus 4.6 (Thinking) via Antigravity — planning, code generation, architecture decisions

**What AI Generated:**
- Implementation plan and architecture decisions
- All new library modules (memory.js, novelty.js, validator.js)
- Upgraded prompt templates with structured scoring
- Complete tick pipeline rewrite
- Stats API endpoint
- Frontend dashboard components
- Database schema migrations
- Documentation rewrites

**What Was Human-Directed:**
- The 16-point improvement specification was human-authored
- Architecture decisions (which tables, what scoring criteria, what threshold) were approved by human review
- The decision to use Jaccard similarity + LLM fallback for novelty detection
- All environment variable and deployment decisions

**AI Prompts Used in Persona (LLM-to-LLM):**
1. **Judgment prompt**: Structured 100-point scoring with memory context, asking LLM to evaluate relevance, novelty, technical depth, timeliness, and persona fit
2. **Writing prompt**: Enriched with editorial score, reasoning, previous memories, used angles, and explicit banned phrase list
3. **Memory extraction prompt**: Extracts topic, angle, key claims, technical concepts, entities, and editorial stance from generated posts
4. **Novelty check prompt**: Disambiguates borderline duplicate vs. novel topics
5. **Validation prompt**: Lightweight fact-check of generated content against source material

---

## 2026-08-08 (Session 3 — Reliability and Deployment Upgrades)
**Model Used:** Gemini 3.5 Flash via Antigravity

**Prompt:** execute all task in @[00.md]
**Result:** Implemented UI additions for the homepage including cycle-specific rejection counts with most common reason, last tick timestamp, and next check countdown.

**Prompt:** execute @[01_ROBUSTNESS_AND_DEDUP.md]
**Result:** Hardened tick pipeline by adding word-overlap duplicate checking against the last 20 published posts, rate-capping to 2 posts per run, and implementing try/catch error isolation for discovery, judgment, writing, and supabase insert stages (returning 200 with error data).

**Prompt:** execute @[02_VERCEL_DEPLOY_PREP.md]
**Result:** Configured the repository for Vercel deployment: created `.env.example`, added exception to `.gitignore`, switched Google Fonts to local font stack in CSS to support offline/sandbox builds, verified server-only code isolation.

**Prompt:** execute all task @[03_GITHUB_ACTIONS_CRON.md]
**Result:** Created and committed the scheduled GitHub Actions workflow file `.github/workflows/tick.yml` running every 2 hours with curl fail-safes.

**Prompt:** execute all tasks in @[04_EDGE_CASE_HARDENING.md]
**Result:** Hardened the API routes and UI: returned empty posts array with status 200 on missing/invalid agent ID query parameter, explicitly mapped output parameters for tick response, and wrapped JSON parsing in `lib/groq.js` with try/catch to log raw response on parse failures.

**Prompt:** execute all tasks in @[05_README.md]
**Result:** Completely rewrote `README.md` to incorporate a concise overview, clear architecture diagram, autonomy mechanics explanation, API specs, local setup guidelines, and the tech stack.

**Prompt:** execute all tasks in @[12_MULTI_AGENT_TICK_FIX.md]
**Result:** Refactored `/api/agent/tick/route.js` to process multiple agents independently in a loop, dynamicized prompt generators in `lib/persona.js` to accept database agent name/domain, and verified feed isolation with automated scripts.

**Prompt:** execute all tasks in @[13_INIT_TRIGGERS_FIRST_TICK.md]
**Result:** Extracted core tick pipeline logic to a shared `lib/pipeline.js` helper, refactored `/api/agent/tick/route.js` to use it, and modified `/api/agent/init/route.js` to schedule an immediate background first tick execution using Next.js `after()`.

