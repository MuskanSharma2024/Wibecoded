import Parser from 'rss-parser';

export async function fetchCandidateTopics() {
  const queries = ["prompt injection", "AI vulnerability", "LLM security"];
  const query = queries[new Date().getHours() % queries.length];
  const candidates = [];
  
  // 1. Fetch from Hacker News
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent(query)}&hitsPerPage=10`);
    if (res.ok) {
      const data = await res.json();
      data.hits.forEach(hit => {
        candidates.push({
          id: hit.objectID,
          title: hit.title || "",
          snippet: hit.story_text ? hit.story_text.substring(0, 200) : (hit.title || ""),
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`
        });
      });
    }
  } catch (error) {
    console.error("Hacker News Discovery error:", error);
  }

  // 2. Fetch from BleepingComputer RSS
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://www.bleepingcomputer.com/feed/');
    feed.items.slice(0, 5).forEach(item => {
      // Use the URL as ID for RSS feeds since it's unique
      candidates.push({
        id: encodeURIComponent(item.link || item.title),
        title: item.title || "",
        snippet: item.contentSnippet ? item.contentSnippet.substring(0, 200) : "",
        url: item.link || ""
      });
    });
  } catch (error) {
    console.error("BleepingComputer RSS error:", error);
  }

  return candidates;
}
