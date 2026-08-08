/**
 * Content Discovery System
 * This module is responsible for finding raw input data for the agent to consider.
 * It rotates through search queries and fetches candidates from HackerNews, RSS, arXiv, and GitHub.
 * Depends on: rss-parser, external APIs.
 */
import Parser from 'rss-parser';

// 20 AI security categories — rotated across ticks for diverse discovery
const QUERY_CATEGORIES = [
  'prompt injection attack',
  'indirect prompt injection',
  'LLM security vulnerability',
  'AI model vulnerability',
  'AI agent security',
  'MCP security protocol',
  'AI supply chain security',
  'model poisoning attack',
  'AI red teaming',
  'AI privacy data leakage',
  'AI infrastructure security',
  'agentic AI security risks',
  'model abuse jailbreak',
  'tool use security AI',
  'AI sandboxing isolation',
  'AI authentication authorization',
  'open source AI security',
  'inference security attack',
  'AI deployment security',
  'LLM guardrails bypass',
];

/**
 * Select diverse queries for this tick based on time
 * Returns 3-4 queries rotated across the full set
 */
function selectQueries() {
  const hour = new Date().getHours();
  const day = new Date().getDate();
  const offset = (day * 7 + hour) % QUERY_CATEGORIES.length;
  const queries = [];

  // Pick 4 queries spread across the category list
  for (let i = 0; i < 4; i++) {
    queries.push(QUERY_CATEGORIES[(offset + i * 5) % QUERY_CATEGORIES.length]);
  }

  return queries;
}

/**
 * Fetch candidate topics from multiple sources
 */
export async function fetchCandidateTopics() {
  const queries = selectQueries();
  const candidates = [];
  const seenUrls = new Set();

  // Helper to add candidate without duplicates
  const addCandidate = (c) => {
    if (c.url && seenUrls.has(c.url)) return;
    if (c.url) seenUrls.add(c.url);
    candidates.push(c);
  };

  // 1. Hacker News Algolia — multiple queries
  for (const query of queries.slice(0, 3)) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent(query)}&hitsPerPage=5`
      );
      if (res.ok) {
        const data = await res.json();
        for (const hit of data.hits) {
          addCandidate({
            id: `hn-${hit.objectID}`,
            title: hit.title || '',
            snippet: hit.story_text
              ? hit.story_text.substring(0, 300)
              : (hit.title || ''),
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            source: 'hacker_news',
          });
        }
      }
    } catch (error) {
      console.error(`HN discovery error for "${query}":`, error.message);
    }
  }

  // 2. BleepingComputer RSS (security-focused)
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://www.bleepingcomputer.com/feed/');
    for (const item of feed.items.slice(0, 6)) {
      addCandidate({
        id: `bleeping-${encodeURIComponent(item.link || item.title).substring(0, 100)}`,
        title: item.title || '',
        snippet: item.contentSnippet
          ? item.contentSnippet.substring(0, 300)
          : '',
        url: item.link || '',
        source: 'bleepingcomputer',
      });
    }
  } catch (error) {
    console.error('BleepingComputer RSS error:', error.message);
  }

  // 3. arXiv cs.CR (cryptography & security) + AI
  try {
    const arxivQuery = queries[0].replace(/\s+/g, '+');
    const res = await fetch(
      `http://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+abs:${encodeURIComponent(arxivQuery)}&sortBy=submittedDate&sortOrder=descending&max_results=5`
    );
    if (res.ok) {
      const xml = await res.text();
      // Simple XML parsing for arXiv Atom feed
      const entries = xml.split('<entry>').slice(1);
      for (const entry of entries) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);

        if (titleMatch) {
          const title = titleMatch[1].replace(/\s+/g, ' ').trim();
          const summary = summaryMatch
            ? summaryMatch[1].replace(/\s+/g, ' ').trim().substring(0, 300)
            : '';
          const url = linkMatch
            ? linkMatch[1].trim()
            : '';

          addCandidate({
            id: `arxiv-${url.split('/').pop() || Date.now()}`,
            title,
            snippet: summary,
            url,
            source: 'arxiv',
          });
        }
      }
    }
  } catch (error) {
    console.error('arXiv discovery error:', error.message);
  }

  // 4. GitHub Advisory Database RSS
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://github.com/advisories.atom');
    for (const item of feed.items.slice(0, 5)) {
      // Filter for AI/ML related advisories
      const titleLower = (item.title || '').toLowerCase();
      const contentLower = (item.contentSnippet || '').toLowerCase();
      const isAIRelated = ['ai', 'ml', 'model', 'llm', 'neural', 'tensor', 'torch', 'transformer', 'inference']
        .some(term => titleLower.includes(term) || contentLower.includes(term));

      if (isAIRelated) {
        addCandidate({
          id: `ghsa-${encodeURIComponent(item.link || item.title).substring(0, 100)}`,
          title: item.title || '',
          snippet: item.contentSnippet
            ? item.contentSnippet.substring(0, 300)
            : '',
          url: item.link || '',
          source: 'github_advisories',
        });
      }
    }
  } catch (error) {
    console.error('GitHub Advisories error:', error.message);
  }

  console.log(`Discovery: Found ${candidates.length} candidates from ${new Set(candidates.map(c => c.source)).size} sources`);
  return candidates;
}
