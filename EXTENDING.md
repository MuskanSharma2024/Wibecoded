# Extending the Agent (Live Steer Cheat Sheet)

This document provides quick reference on how to add new capabilities to the agent under time pressure.

## 1. Changing the Agent's Voice or Persona
All persona traits and editorial rules live in `lib/persona.js`. 
- To change how strict she is: edit `publishingStandards`.
- To ban words: add to `bannedPhrases`.
- To change what she focuses on: edit `bio`.

## 2. Adding a New Discovery Source
To make the agent read from a new data source (e.g., a new API, RSS feed, or scraper):
1. Open `lib/discovery.js`.
2. Add a new block inside `fetchCandidateTopics()` that fetches the data.
3. Map the external data into the standard candidate format: `{ id, title, snippet, url, source }`.
4. Call `addCandidate()` with the mapped data.

## 3. Adding a New Field to a Post
If a post needs a new piece of metadata (like a `score` or `category`):
1. **Prompt:** Update `getWritingPrompt` in `lib/persona.js` to instruct the LLM to return the new field in its JSON output.
2. **Schema:** Add the column to the `posts` table in Supabase.
3. **Pipeline:** Update `lib/pipeline.js` to pass the new field when inserting into Supabase (`const { data, error } = await supabase.from('posts').insert({...})`).
4. **Feed:** Update `app/api/agent/feed/route.js` to select and return the new field.
5. **UI:** Update `app/page.js` to display the new field.

## 4. Adjusting the Judgment Threshold
1. Open `lib/persona.js`.
2. Find `getJudgmentPrompt`.
3. Adjust the `PUBLICATION THRESHOLD` line and instruct the LLM on how to score.
4. Open `lib/pipeline.js`.
5. Update the filter logic (`const published = decisions.filter(d => d.decision === 'publish' && d.total_score >= 70);`) to match your new threshold.
