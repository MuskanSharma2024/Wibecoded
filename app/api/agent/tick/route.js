import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandidateTopics } from '@/lib/discovery';
import { getJudgmentPrompt, getWritingPrompt, getMemoryExtractionPrompt } from '@/lib/persona';
import { generateJson } from '@/lib/groq';
import { normalizeTopic, checkNoveltyLocal } from '@/lib/novelty';
import { getRecentMemories, getRecentRejections, storePublicationMemory, storeRejection, formatMemoryContext, getPreviousAngles } from '@/lib/memory';
import { validateSources, validatePost } from '@/lib/validator';

export const maxDuration = 300; // Allow 5 minutes on Vercel

// Publication threshold — topics must score at least this to be published
const PUBLISH_THRESHOLD = 70;

/**
 * Resolve the agent ID to use for this tick.
 * Priority: AGENT_ID env var → latest agent in database
 */
async function resolveAgentId() {
  // 1. Check for pinned agent ID
  const pinnedId = process.env.AGENT_ID;
  if (pinnedId) {
    // Verify the agent exists
    const { data } = await supabase
      .from('agents')
      .select('id')
      .eq('id', pinnedId)
      .single();

    if (data) return data.id;
    console.warn(`Pinned AGENT_ID ${pinnedId} not found in database, falling back to latest`);
  }

  // 2. Fallback to latest agent
  const { data: agentData } = await supabase
    .from('agents')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return agentData?.id || null;
}

/**
 * Check for in-progress tick cycles to prevent duplicate concurrent runs
 */
async function checkConcurrency(agentId) {
  const { data } = await supabase
    .from('tick_cycles')
    .select('id, started_at')
    .eq('agent_id', agentId)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const startedAt = new Date(data[0].started_at);
    const elapsed = Date.now() - startedAt.getTime();

    // If a cycle has been "running" for more than 10 minutes, it's stale — mark it failed
    if (elapsed > 10 * 60 * 1000) {
      await supabase
        .from('tick_cycles')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', data[0].id);
      return false; // Allow new cycle
    }

    return true; // Concurrent cycle in progress
  }

  return false;
}

/**
 * Create a tick cycle record to track this autonomous cycle
 */
async function createCycleRecord(agentId) {
  const { data, error } = await supabase
    .from('tick_cycles')
    .insert([{
      agent_id: agentId,
      status: 'running',
      started_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error('Failed to create cycle record:', error);
    return null;
  }
  return data;
}

/**
 * Update cycle record with final counts
 */
async function completeCycleRecord(cycleId, counts) {
  await supabase
    .from('tick_cycles')
    .update({
      ...counts,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', cycleId);
}

/**
 * Simple word overlap check to detect duplicates.
 * Returns true if more than 60% of significant words match.
 */
function isWordOverlapDuplicate(candidateTitle, publishedTitle) {
  const getSignificantWords = (title) => {
    const stopWords = new Set([
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
    return new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.has(w))
    );
  };

  const candidateWords = getSignificantWords(candidateTitle);
  const publishedWords = getSignificantWords(publishedTitle);

  if (candidateWords.size === 0) return false;

  let matchCount = 0;
  for (const word of candidateWords) {
    if (publishedWords.has(word)) {
      matchCount++;
    }
  }

  const overlapRatio = matchCount / candidateWords.size;
  return overlapRatio > 0.60;
}

export async function POST(request) {
  const tickSecret = request.headers.get('x-tick-secret');

  if (tickSecret !== process.env.TICK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let cycleId = null;

  try {
    // 1. Resolve agent ID
    const agentId = await resolveAgentId();
    if (!agentId) {
      return NextResponse.json({ error: 'No agent initialized' }, { status: 400 });
    }

    // 2. Concurrency guard
    const isConcurrent = await checkConcurrency(agentId);
    if (isConcurrent) {
      return NextResponse.json({ error: 'Another tick cycle is already running' }, { status: 409 });
    }

    // 3. Create cycle record
    const cycle = await createCycleRecord(agentId);
    cycleId = cycle?.id;

    // 4. Discover candidate topics
    let candidates = [];
    try {
      candidates = await fetchCandidateTopics();
    } catch (err) {
      console.error("Discovery fetch failed:", err);
      if (cycleId) {
        try {
          await supabase
            .from('tick_cycles')
            .update({ status: 'failed', completed_at: new Date().toISOString() })
            .eq('id', cycleId);
        } catch {}
      }
      return NextResponse.json({ published: 0, rejected: 0, error: "discovery fetch" });
    }

    if (candidates.length === 0) {
      if (cycleId) await completeCycleRecord(cycleId, { discovered_count: 0, published_count: 0, rejected_count: 0 });
      return NextResponse.json({ published: 0, rejected: 0 });
    }

    let memories = [];
    let judgmentResult = null;
    let duplicates = [];
    let needsJudgment = [];
    let judgmentCandidates = [];

    try {
      // 5. Retrieve editorial memory
      memories = await getRecentMemories(agentId, 30);
      const rejections = await getRecentRejections(agentId, 50);
      const memoryContext = formatMemoryContext(memories, rejections);

      // 6. Novelty check — pre-filter obvious duplicates
      const noveltyResults = [];
      for (const candidate of candidates) {
        const novelty = checkNoveltyLocal(candidate.title, memories, rejections);
        noveltyResults.push({ candidate, novelty });
      }

      // Separate obvious duplicates from candidates that need editorial judgment
      duplicates = noveltyResults.filter(r => r.novelty.status === 'duplicate');
      needsJudgment = noveltyResults.filter(r => r.novelty.status !== 'duplicate');

      // Store duplicates as rejections
      for (const dup of duplicates) {
        await storeRejection(agentId, {
          topic: dup.candidate.title,
          normalized_title: normalizeTopic(dup.candidate.title),
          reason: dup.novelty.reason,
          editorial_score: 0,
          decision_type: 'duplicate',
        });
      }

      if (needsJudgment.length === 0) {
        if (cycleId) await completeCycleRecord(cycleId, {
          discovered_count: candidates.length,
          published_count: 0,
          rejected_count: 0,
          duplicate_count: duplicates.length,
        });
        return NextResponse.json({
          published: 0,
          rejected: 0,
          duplicates: duplicates.length,
          message: 'All candidates were duplicates',
        });
      }

      // 7. Editorial scoring — run judgment prompt with memory context
      judgmentCandidates = needsJudgment.map(r => r.candidate);
      const topicsJsonStr = JSON.stringify(judgmentCandidates);
      const judgmentPrompt = getJudgmentPrompt(topicsJsonStr, memoryContext);
      judgmentResult = await generateJson(judgmentPrompt);

      if (!judgmentResult || !judgmentResult.decisions) {
        throw new Error('Failed to parse judgment decisions');
      }
    } catch (err) {
      console.error("Judgment call failed:", err);
      if (cycleId) {
        try {
          await supabase
            .from('tick_cycles')
            .update({ status: 'failed', completed_at: new Date().toISOString() })
            .eq('id', cycleId);
        } catch {}
      }
      return NextResponse.json({ published: 0, rejected: 0, error: "judgment call" });
    }

    const decisions = judgmentResult.decisions;
    const acceptedTopics = [];
    let rejectedCount = 0;
    let lowValueCount = 0;

    // 8. Process decisions — threshold-based accept/reject
    for (const decision of decisions) {
      const topic = judgmentCandidates.find(c => c.id === decision.id);
      if (!topic) continue;

      const totalScore = decision.total_score || 0;
      const isPublish = decision.decision?.toLowerCase() === 'publish' && totalScore >= PUBLISH_THRESHOLD;

      if (isPublish) {
        acceptedTopics.push({ topic, decision });
      } else {
        // Determine rejection type
        const decisionType = totalScore < 40 ? 'low_value' : 'rejected';
        if (decisionType === 'low_value') lowValueCount++;
        else rejectedCount++;

        await storeRejection(agentId, {
          topic: topic.title,
          normalized_title: normalizeTopic(topic.title),
          reason: decision.reason || `Score ${totalScore}/100 below threshold ${PUBLISH_THRESHOLD}`,
          editorial_score: totalScore,
          decision_type: decisionType,
        });
      }
    }

    // Retrieve titles of the last 20 published topics
    const publishedTitles = memories.slice(0, 20).map(m => m.topic);

    // 9-13. Process accepted topics — validate, write, validate output, persist
    const topicsToWrite = acceptedTopics.slice(0, 2); // Cap at 2 per cycle
    let publishedCount = 0;
    let validationFailedCount = 0;
    const previousAngles = getPreviousAngles(memories);

    for (const { topic, decision } of topicsToWrite) {
      try {
        // --- 1. DEDUP logic right before writing ---
        let isDuplicate = false;
        for (const publishedTitle of publishedTitles) {
          if (isWordOverlapDuplicate(topic.title, publishedTitle)) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) {
          rejectedCount++;
          await storeRejection(agentId, {
            topic: topic.title,
            normalized_title: normalizeTopic(topic.title),
            reason: "duplicate of recent post",
            editorial_score: decision.total_score || 0,
            decision_type: 'duplicate',
          });
          continue; // Skip this topic
        }

        // 9. Source validation — verify URLs are reachable
        const sourceResults = await validateSources([topic.url]);
        const sourceValid = sourceResults.length === 0 || sourceResults.some(s => s.valid);

        if (!sourceValid) {
          validationFailedCount++;
          await storeRejection(agentId, {
            topic: topic.title,
            normalized_title: normalizeTopic(topic.title),
            reason: `Source validation failed: ${topic.url} is unreachable`,
            editorial_score: decision.total_score || 0,
            decision_type: 'validation_failed',
          });
          continue;
        }

        // 10. Generate post with enriched context
        const editorialContext = {
          editorialScore: decision.total_score,
          editorialReason: decision.reason,
          relevantMemories: memories
            .slice(0, 5)
            .map(m => `- "${m.topic}" (angle: ${m.angle || 'N/A'})`)
            .join('\n'),
          previousAngles: previousAngles
            .map(a => `- ${a.topic}: ${a.angle}`)
            .join('\n'),
        };

        // --- WRITING CALL STAGE ---
        let postResult;
        try {
          const writingPrompt = getWritingPrompt(topic, editorialContext);
          postResult = await generateJson(writingPrompt);
          if (!postResult || !postResult.text || !postResult.rationale) {
            throw new Error("Empty response or missing fields");
          }
        } catch (err) {
          console.error("Writing call failed:", err);
          if (cycleId) {
            try {
              await supabase
                .from('tick_cycles')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('id', cycleId);
            } catch {}
          }
          return NextResponse.json({ published: 0, rejected: 0, error: "writing call" });
        }

        // 11. Validate generated post against source
        const postValidation = await validatePost(
          postResult.text,
          topic.title,
          topic.snippet,
          topic.url
        );

        if (!postValidation.valid && postValidation.severity === 'major') {
          validationFailedCount++;
          await storeRejection(agentId, {
            topic: topic.title,
            normalized_title: normalizeTopic(topic.title),
            reason: `Post validation failed: ${postValidation.issues.join('; ')}`,
            editorial_score: decision.total_score || 0,
            decision_type: 'validation_failed',
          });
          continue;
        }

        // --- SUPABASE INSERT STAGE ---
        let postData;
        try {
          const { data, error: postError } = await supabase
            .from('posts')
            .insert([{
              agent_id: agentId,
              text: postResult.text,
              rationale: postResult.rationale,
              sources: [topic.url],
              topic_key: topic.id,
              editorial_score: decision.total_score || 0,
            }])
            .select()
            .single();

          if (postError) throw postError;
          postData = data;
        } catch (err) {
          console.error("Supabase insert failed:", err);
          if (cycleId) {
            try {
              await supabase
                .from('tick_cycles')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('id', cycleId);
            } catch {}
          }
          return NextResponse.json({ published: 0, rejected: 0, error: "supabase insert" });
        }

        // 13. Extract and store editorial memory
        try {
          const memoryPrompt = getMemoryExtractionPrompt(postResult.text, topic);
          const memoryData = await generateJson(memoryPrompt);

          if (memoryData) {
            await storePublicationMemory(agentId, postData.id, {
              topic: memoryData.topic || topic.title,
              normalized_title: normalizeTopic(memoryData.topic || topic.title),
              angle: memoryData.angle || '',
              key_claims: memoryData.key_claims || [],
              technical_concepts: memoryData.technical_concepts || [],
              entities: memoryData.entities || [],
              editorial_stance: memoryData.editorial_stance || '',
              source_urls: [topic.url],
              editorial_score: decision.total_score || 0,
            });
          }
        } catch (memErr) {
          // Memory extraction failure should not block publishing
          console.error('Memory extraction failed (non-fatal):', memErr.message);
        }

        // Dynamically add to publishedTitles to avoid duplicate writing in the same run
        publishedTitles.push(topic.title);
        publishedCount++;

      } catch (topicErr) {
        // Per-candidate error isolation — one failure doesn't crash the cycle
        console.error(`Failed to process topic "${topic.title}":`, topicErr.message);
      }
    }

    // Complete cycle record
    const finalCounts = {
      discovered_count: candidates.length,
      published_count: publishedCount,
      rejected_count: rejectedCount,
      duplicate_count: duplicates.length,
      low_value_count: lowValueCount,
      validation_failed_count: validationFailedCount,
    };

    if (cycleId) await completeCycleRecord(cycleId, finalCounts);

    return NextResponse.json({
      ...finalCounts,
      message: `Cycle complete: ${publishedCount} published, ${rejectedCount + lowValueCount} rejected, ${duplicates.length} duplicates`,
    });

  } catch (error) {
    console.error('Tick Error:', error);

    // Mark cycle as failed if we have a record
    if (cycleId) {
      try {
        await supabase
          .from('tick_cycles')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', cycleId);
      } catch {}
    }

    return NextResponse.json({ published: 0, rejected: 0, error: "unexpected failure: " + error.message });
  }
}
