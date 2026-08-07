export async function fetchCandidateTopics() {
  const queries = ["prompt injection", "AI vulnerability", "LLM security"];
  const query = queries[new Date().getHours() % queries.length];
  
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent(query)}&hitsPerPage=10`);
    if (!res.ok) throw new Error("Failed to fetch from Hacker News");
    
    const data = await res.json();
    return data.hits.map(hit => ({
      id: hit.objectID,
      title: hit.title || "",
      snippet: hit.story_text ? hit.story_text.substring(0, 200) : (hit.title || ""),
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`
    }));
  } catch (error) {
    console.error("Discovery error:", error);
    return [];
  }
}
