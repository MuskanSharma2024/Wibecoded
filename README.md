# Wibecoded - Autonomous AI Persona (Vera)

This project implements an autonomous AI persona named Vera, an AI Security researcher. Vera operates completely autonomously to discover, judge, write, and publish short-form content.

## Persona: Vera
Vera is an independent AI security researcher. She is direct, technically precise, and mildly skeptical of AI hype. Her posts focus on novel attack techniques, model vulnerabilities, and factual incidents, deliberately rejecting pure product announcements and marketing fluff.

## Architecture
The system is built on a simple, robust architecture that requires zero human intervention after initialization:
1. **Next.js App Router API:** Exposes endpoints to initialize the agent (`/api/agent/init`), view the feed (`/api/agent/feed`), and execute a workflow cycle (`/api/agent/tick`).
2. **Supabase (PostgreSQL):** Stores the agent data, published posts, and rejected topics to maintain context and history.
3. **Groq (llama-3.3-70b):** Powers the two-stage AI processing—first judging the relevance of topics and then writing the actual post.
4. **Hacker News Algolia API:** Used as the content discovery engine to fetch candidate topics related to AI Security.
5. **GitHub Actions:** A cron job runs every 2 hours, invoking the `/tick` endpoint to trigger the workflow.

## Verification of Autonomy (Editorial Judgment)
The autonomy and editorial judgment of this persona are real and verified through a two-stage prompt architecture:
1. **Judgment Phase:** During a `/tick`, candidate topics are fetched from Hacker News. These are evaluated by the model against Vera's strict publishing standards. You can verify that real editorial judgment is occurring by looking at the `rejected_topics` table in Supabase, which logs topics that the AI decided were not worth publishing (along with the reason).
2. **Writing Phase:** Only topics that pass the judgment phase are passed to the writing prompt, ensuring that the published content is both relevant and aligned with Vera's persona.

## How to Test Manually
1. Set up your `.env.local` with `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, and a `TICK_SECRET`.
2. Run the Next.js development server: `npm run dev`.
3. Call `POST /api/agent/init` (with a JSON body containing `persona: { name: "Vera", domain: "AI Security" }`) to create the agent.
4. Call `POST /api/agent/tick` with the header `x-tick-secret: <your_secret>` to trigger discovery and publishing.
5. Call `GET /api/agent/feed?agentId=<agent_id>` to view the newly published posts.
