# PROMPTS.md

AI-assisted build log for Wibecoded. Organized by feature area so
prompts can be checked against the corresponding code/commits directly.

## Timeline
- 2026-08-07 — Initial scaffold (Next.js, API route structure)
- 2026-08-07 — Persona + prompt design (judgment + writing prompts)
- 2026-08-07 — Tick pipeline + dedup logic & Discovery pipeline (HN + arXiv + RSS)
- 2026-08-07 — Feed UI (terminal aesthetic)
- 2026-08-07 — Major architecture upgrade (Memory system, Novelty detection, 13-step loop)
- 2026-08-08 — Deployment + cron setup (Vercel & GitHub Actions)
- 2026-08-08 — Edge case hardening, UI additions, and Multi-agent refactor
- 2026-08-08 — Memory/continuity layer evaluation
- 2026-08-08 — Transparency dashboard & Persona manifesto
- 2026-08-08 — Final QA pass & Live Steer readiness

## Prompts by feature area

### Scaffolding & architecture
**Prompt:** Scaffold a Next.js app with the file structure and API routes described in API_SPEC.md and PLAN.md
**Prompt:** Comprehensive upgrade from basic scheduled AI content generator to genuine autonomous editorial agent. 16-point improvement covering: (1) editorial memory system with structured per-post memory, (2) novelty/duplicate detection using Jaccard similarity + LLM fallback, (3) expanded discovery to 20 AI security categories across 4 sources, (4) structured 100-point editorial scoring (relevance, novelty, technical depth, timeliness, persona fit), (5) first-class rejections with decision types, (6) enriched writing pipeline with memory context and banned hype phrases, (7) fact/source URL validation, (8) robust 13-step autonomous loop with concurrency guards and per-candidate error isolation, (9) reliable agent ID handling with env var pinning, (10) preserved API contracts, (11) status dashboard with real stats, (12) editorial activity view, (13) testing, (14) no overengineering, (15) documentation updates, (16) quality checks.
**Prompt:** execute all tasks in @[05_README.md]
**Prompt:** @[/Users/ninadhirani/Wibecoded/10_LIVE_STEER_READINESS.md] implement this then commit and sync

### Persona & prompt design
**Prompt:** Implementing Vera's Persona Manifesto

### Discovery pipeline
**Prompt:** Project Finalization: Expand discovery sources to BleepingComputer RSS, limit frontend to 20 posts, and add JSON parsing retry logic.

### Tick pipeline & reliability
**Prompt:** execute @[01_ROBUSTNESS_AND_DEDUP.md]
**Prompt:** execute all tasks in @[12_MULTI_AGENT_TICK_FIX.md]
**Prompt:** execute all tasks in @[13_INIT_TRIGGERS_FIRST_TICK.md]

### Feed UI
**Prompt:** Approved. Keep dark mode but make it feel like a security terminal/log rather than default Tailwind dark — monospace throughout, subtle green/amber accent. Add an empty state for when no posts exist yet. Don't touch the /api/agent/feed route, this is a separate human-facing view.
**Prompt:** execute all task in @[00.md]

### Memory & transparency features
**Prompt:** Evaluating Memory Implementation Status
**Prompt:** Implementing Transparency Dashboard

### Deployment & infra
**Prompt:** execute @[02_VERCEL_DEPLOY_PREP.md]
**Prompt:** execute all task @[03_GITHUB_ACTIONS_CRON.md]

### Bug fixes / iteration
**Prompt:** Run final verification on dedup logic and empty-state handling.
**Prompt:** execute all tasks in @[04_EDGE_CASE_HARDENING.md]
**Prompt:** commit and sync
