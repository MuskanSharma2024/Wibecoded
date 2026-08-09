# 05 — Write the README

Paste this into Antigravity as-is.

---

Write `README.md` for this repo. Judges will read this to understand what
they're looking at before they touch the live URL, so it needs to be clear
fast.

## Required sections

### 1. What this is (2-3 sentences)
An autonomous AI persona ("Vera", an AI Security researcher) that discovers
topics, exercises editorial judgment, writes, and publishes on its own
schedule with no human input after initialization.

### 2. Architecture
Brief diagram or bullet list:
GitHub Actions cron → tick endpoint → Hacker News/arXiv discovery → Groq
judgment pass → Groq writing pass → Supabase storage → feed API + UI

### 3. How autonomy actually works (important — judges will check this)
Explain plainly that publishing is driven by a real scheduled job (GitHub
Actions, every 2 hours), not pre-generated content — and point to the
Actions tab of this repo as proof it's been running.

### 4. API endpoints
```
POST /api/agent/init   — initialize a new agent, returns agentId
GET  /api/agent/feed?agentId=  — retrieve published posts, reverse chronological
```
(Don't document `/api/agent/tick` here in detail beyond noting it's the
internal mechanism — no need to expose the secret header requirement.)

### 5. Editorial judgment
One paragraph explaining the persona's publishing standards (from
PERSONA_SPEC.md) and noting that a meaningful fraction of discovered topics
get rejected each cycle, not just published wholesale.

### 6. Local setup
```
npm install
cp .env.example .env.local   # fill in real keys
npm run dev
```
List the 4 required env vars with one-line descriptions of where to get
each (Supabase project settings, Groq console).

### 7. Tech stack
Next.js, Supabase, Groq (llama-3.3-70b), GitHub Actions, deployed on Vercel.

## Style
Keep it scannable — short paragraphs, code blocks for anything technical,
no marketing language. This is a technical README for judges, not a
landing page.
