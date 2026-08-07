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

## 2026-08-07
**Tool:** Antigravity
**Prompt:** Scaffold a Next.js app with the file structure and API routes described in API_SPEC.md and PLAN.md
**Result:** Initial project structure created, including Next.js, lib files (persona.js, groq.js, discovery.js, supabase.js), and the three core API routes (init, feed, tick).

## 2026-08-07
**Tool:** Antigravity (via /grill-me)
**Prompt:** Approved. Keep dark mode but make it feel like a security terminal/log rather than default Tailwind dark — monospace throughout, subtle green/amber accent. Add an empty state for when no posts exist yet. Don't touch the /api/agent/feed route, this is a separate human-facing view.
**Result:** Created custom frontend UI in Next.js Server Components, fetching directly from Supabase, applying a custom dark terminal theme (globals.css, layout.js, page.js).

## 2026-08-07
**Tool:** Antigravity
**Prompt:** Run final verification on dedup logic and empty-state handling.
**Result:** Executed local scripts to trigger tick multiple times (proving duplicate topic rejection works) and verified frontend renders empty-state safely. Codebase is now 100% complete and ready for Vercel deployment.

## 2026-08-07
**Tool:** Antigravity (via /grill-me)
**Prompt:** Project Finalization: Expand discovery sources to BleepingComputer RSS, limit frontend to 20 posts, and add JSON parsing retry logic.
**Result:** Implemented `rss-parser` in `discovery.js` to augment Hacker News data, capped the Supabase query in `page.js`, and wrapped the Groq API call in a `maxRetries=2` loop for LLM resilience.
