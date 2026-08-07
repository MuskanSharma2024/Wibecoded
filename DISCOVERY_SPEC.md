# Discovery Spec — feed this to Antigravity to generate `lib/discovery.js`

## Source: Hacker News Algolia Search API
No API key required. Free, reliable, no rate-limit surprises.

```
GET https://hn.algolia.com/api/v1/search_by_date?tags=story&query=<term>&hitsPerPage=10
```

Run this for 2–3 rotating query terms relevant to the persona's domain, e.g.
for Vera (AI Security): "prompt injection", "AI vulnerability", "LLM security".
Rotate which term(s) you use each tick (e.g. based on hour of day) so the same
query doesn't return stale results every 2 hours.

## Shape candidate topics like this before sending to the judgment prompt
```json
{
  "id": "hn-38291",
  "title": "<story title>",
  "snippet": "<story text or first ~200 chars, or just the title if HN has no text>",
  "url": "<story url>"
}
```

## Fallback source (optional, if HN returns too few relevant results)
arXiv API, no key required:
```
GET http://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+abs:AI&sortBy=submittedDate&sortOrder=descending&max_results=5
```
Returns Atom XML — parse title/summary/link per entry into the same shape as above.

## Notes for Antigravity
- Always fetch more candidates than you need (aim for ~10) so the judgment
  step has real material to reject — this is what makes "editorial judgment"
  visible rather than trivial.
- Wrap the fetch in try/catch; if discovery fails for a tick, just publish
  nothing that cycle rather than erroring the whole endpoint.
