import { getRecentMemories, getRecentRejections } from './memory.js';
import { generateJson } from './groq.js';

// Common stop words to ignore in title comparison
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'about', 'and', 'but', 'or', 'if',
  'while', 'that', 'this', 'what', 'which', 'who', 'whom', 'it', 'its',
  'new', 'using', 'via', 'now'
]);

/**
 * Normalize a topic title for comparison:
 * lowercase, remove punctuation, remove stop words, sort tokens
 */
export function normalizeTopic(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .sort()
    .join(' ')
    .trim();
}

/**
 * Calculate Jaccard similarity between two sets of tokens
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Calculate word overlap ratio — what fraction of candidate words appear
 * in the reference
 */
function overlapRatio(candidateNorm, referenceNorm) {
  const candidateWords = candidateNorm.split(/\s+/).filter(Boolean);
  const referenceWords = new Set(referenceNorm.split(/\s+/).filter(Boolean));

  if (candidateWords.length === 0) return 0;

  const matches = candidateWords.filter(w => referenceWords.has(w)).length;
  return matches / candidateWords.length;
}

/**
 * Check a candidate topic against a list of memories and rejections
 * Returns: { status: 'new'|'duplicate'|'related_but_novel', reason, similarTo }
 */
export function checkNoveltyLocal(candidateTitle, memories, rejections) {
  const candidateNorm = normalizeTopic(candidateTitle);

  if (!candidateNorm) {
    return { status: 'new', reason: 'Empty title — treated as new', similarTo: null };
  }

  // Check against published memories
  for (const mem of memories) {
    const memNorm = mem.normalized_title || normalizeTopic(mem.topic);
    const jaccard = jaccardSimilarity(candidateNorm, memNorm);
    const overlap = overlapRatio(candidateNorm, memNorm);

    // High similarity = duplicate
    if (jaccard > 0.7 || overlap > 0.8) {
      return {
        status: 'duplicate',
        reason: `Substantially overlaps with previously published: "${mem.topic}" (similarity: ${(jaccard * 100).toFixed(0)}%)`,
        similarTo: mem.topic,
      };
    }

    // Moderate similarity = related but potentially novel
    if (jaccard > 0.4 || overlap > 0.55) {
      return {
        status: 'related_but_novel',
        reason: `Related to previously published: "${mem.topic}" — may contain new information`,
        similarTo: mem.topic,
      };
    }
  }

  // Check against recent rejections (avoid re-evaluating clearly rejected topics)
  for (const rej of rejections) {
    const rejNorm = rej.normalized_title || normalizeTopic(rej.topic);
    const jaccard = jaccardSimilarity(candidateNorm, rejNorm);

    if (jaccard > 0.7) {
      return {
        status: 'duplicate',
        reason: `Substantially overlaps with previously rejected topic: "${rej.topic}" (reason: ${rej.reason})`,
        similarTo: rej.topic,
      };
    }
  }

  return { status: 'new', reason: 'No significant overlap with previous topics', similarTo: null };
}

/**
 * LLM-based novelty check for borderline cases
 * Only called when local check returns 'related_but_novel'
 */
export async function checkNoveltyLLM(candidateTitle, candidateSnippet, similarPreviousTopic, previousAngle) {
  const prompt = `You are an editorial duplicate detector. Compare these two topics and determine if the NEW topic provides genuinely new information or is essentially the same story.

PREVIOUSLY PUBLISHED TOPIC: "${similarPreviousTopic}"
Previous angle: ${previousAngle || 'Unknown'}

NEW CANDIDATE: "${candidateTitle}"
New context: ${candidateSnippet || 'No additional context'}

Respond with ONLY valid JSON:
{"verdict": "duplicate|novel", "reason": "one sentence explanation"}

Rules:
- "duplicate" = same underlying story, same facts, no meaningful new development
- "novel" = genuinely new information, different angle, new development in the same area`;

  try {
    const result = await generateJson(prompt);
    if (result && result.verdict) {
      return {
        isDuplicate: result.verdict === 'duplicate',
        reason: result.reason || 'LLM check completed',
      };
    }
  } catch (err) {
    console.error('LLM novelty check failed:', err);
  }

  // Default to allowing the topic if LLM check fails
  return { isDuplicate: false, reason: 'LLM check failed — defaulting to novel' };
}

/**
 * Full novelty classification pipeline for a candidate topic
 */
export async function classifyNovelty(candidate, agentId) {
  const memories = await getRecentMemories(agentId, 30);
  const rejections = await getRecentRejections(agentId, 30);

  const localResult = checkNoveltyLocal(candidate.title, memories, rejections);

  // If clearly new or clearly duplicate, return immediately
  if (localResult.status === 'new' || localResult.status === 'duplicate') {
    return localResult;
  }

  // For borderline cases, use LLM to distinguish
  if (localResult.status === 'related_but_novel') {
    const previousMem = memories.find(m =>
      (m.normalized_title || normalizeTopic(m.topic)) &&
      jaccardSimilarity(normalizeTopic(candidate.title), m.normalized_title || normalizeTopic(m.topic)) > 0.4
    );

    const llmResult = await checkNoveltyLLM(
      candidate.title,
      candidate.snippet,
      localResult.similarTo,
      previousMem?.angle
    );

    if (llmResult.isDuplicate) {
      return {
        status: 'duplicate',
        reason: `LLM confirmed duplicate: ${llmResult.reason}`,
        similarTo: localResult.similarTo,
      };
    }

    return {
      status: 'related_but_novel',
      reason: `Related but novel: ${llmResult.reason}`,
      similarTo: localResult.similarTo,
    };
  }

  return localResult;
}
