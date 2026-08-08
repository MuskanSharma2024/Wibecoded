import { generateJson } from './groq.js';

/**
 * Validate that source URLs are reachable via HTTP HEAD request
 * Returns array of { url, valid, status }
 */
export async function validateSources(urls) {
  if (!urls || urls.length === 0) return [];

  const results = [];

  for (const url of urls) {
    if (!url || typeof url !== 'string') {
      results.push({ url, valid: false, status: 'invalid_url' });
      continue;
    }

    try {
      // Basic URL format check
      new URL(url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Vera-Editorial-Agent/1.0',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      results.push({
        url,
        valid: res.status < 400,
        status: res.status,
      });
    } catch (err) {
      // Try GET as fallback — some servers reject HEAD
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Vera-Editorial-Agent/1.0',
          },
          redirect: 'follow',
        });

        clearTimeout(timeout);

        results.push({
          url,
          valid: res.status < 400,
          status: res.status,
        });
      } catch {
        results.push({
          url,
          valid: false,
          status: 'unreachable',
        });
      }
    }
  }

  return results;
}

/**
 * Validate that a generated post's claims are supported by its source
 * Uses LLM to do a lightweight fact-check
 */
export async function validatePost(postText, sourceTitle, sourceSnippet, sourceUrl) {
  const prompt = `You are a fact-checking editor. Review this draft post and verify it against the source material.

DRAFT POST:
${postText}

SOURCE TITLE: ${sourceTitle}
SOURCE SNIPPET: ${sourceSnippet || 'No snippet available'}
SOURCE URL: ${sourceUrl}

Check for:
1. Does the post make claims not supported by the source?
2. Does the post fabricate facts, statistics, or quotes?
3. Does the post misrepresent the source's findings or conclusions?
4. Is the post's technical analysis reasonable given the source?

Respond with ONLY valid JSON:
{"valid": true/false, "issues": ["issue1", "issue2"], "severity": "none|minor|major"}

Rules:
- "valid": true if no major fabrications or unsupported claims
- Minor editorial interpretation or opinion is acceptable
- The post is expected to contain the author's analysis, not just quote the source
- Only flag "major" severity for clear fabrications or dangerous misinformation`;

  try {
    const result = await generateJson(prompt);
    if (result && typeof result.valid === 'boolean') {
      return {
        valid: result.valid,
        issues: result.issues || [],
        severity: result.severity || 'none',
      };
    }
  } catch (err) {
    console.error('Post validation failed:', err);
  }

  // Default to valid if validation fails (don't block publishing on validation errors)
  return { valid: true, issues: ['Validation check failed — defaulting to valid'], severity: 'none' };
}
