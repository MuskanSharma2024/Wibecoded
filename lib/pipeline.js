import { supabase } from './supabase';
import { getJudgmentPrompt, getWritingPrompt, getMemoryExtractionPrompt, persona } from './persona';
import { generateJson } from './groq';
import { normalizeTopic, checkNoveltyLocal } from './novelty';
import { getRecentMemories, getRecentRejections, storePublicationMemory, storeRejection, formatMemoryContext, getPreviousAngles } from './memory';
import { validateSources, validatePost } from './validator';

const PUBLISH_THRESHOLD = 70;

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

    if (elapsed > 10 * 60 * 1000) {
      await supabase
        .from('tick_cycles')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', data[0].id);
      return false;
    }
    return true;
  }
  return false;
}

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

export async function processAgentTick(agent, candidates) {
  const agentId = agent.id;
  const agentName = agent.name || "Vera";
  const agentDomain = agent.domain || "AI Security";

  const isConcurrent = await checkConcurrency(agentId);
  if (isConcurrent) {
    console.warn(`Skipping concurrent tick run for agent ${agentId}`);
    return { published: 0, rejected: 0, duplicates: 0, error: 'concurrent' };
  }

  let cycleId = null;
  const cycle = await createCycleRecord(agentId);
  cycleId = cycle?.id;

  let publishedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;
  let lowValueCount = 0;
  let validationFailedCount = 0;

  try {
    const memories = await getRecentMemories(agentId, 30);
    const rejections = await getRecentRejections(agentId, 50);
    const memoryContext = formatMemoryContext(memories, rejections);

    const noveltyResults = [];
    for (const candidate of candidates) {
      const novelty = checkNoveltyLocal(candidate.title, memories, rejections);
      noveltyResults.push({ candidate, novelty });
    }

    const duplicates = noveltyResults.filter(r => r.novelty.status === 'duplicate');
    const needsJudgment = noveltyResults.filter(r => r.novelty.status !== 'duplicate');
    duplicateCount = duplicates.length;

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
      if (cycleId) {
        await completeCycleRecord(cycleId, {
          discovered_count: candidates.length,
          published_count: 0,
          rejected_count: 0,
          duplicate_count: duplicateCount,
          low_value_count: 0,
          validation_failed_count: 0,
        });
      }
      return { published: 0, rejected: 0, duplicates: duplicateCount };
    }

    const judgmentCandidates = needsJudgment.map(r => r.candidate);
    const topicsJsonStr = JSON.stringify(judgmentCandidates);
    const judgmentPrompt = getJudgmentPrompt(topicsJsonStr, memoryContext, agentName, agentDomain);
    const judgmentResult = await generateJson(judgmentPrompt);

    if (!judgmentResult || !judgmentResult.decisions) {
      throw new Error('Failed to parse judgment decisions');
    }

    const decisions = judgmentResult.decisions;
    const acceptedTopics = [];

    for (const decision of decisions) {
      const topic = judgmentCandidates.find(c => c.id === decision.id);
      if (!topic) continue;

      const totalScore = decision.total_score || 0;
      const isPublish = decision.decision?.toLowerCase() === 'publish' && totalScore >= PUBLISH_THRESHOLD;

      if (isPublish) {
        acceptedTopics.push({ topic, decision });
      } else {
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

    const publishedTitles = memories.slice(0, 20).map(m => m.topic);
    const topicsToWrite = acceptedTopics.slice(0, 2);
    const previousAngles = getPreviousAngles(memories);

    for (const { topic, decision } of topicsToWrite) {
      try {
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
          continue;
        }

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

        const writingPrompt = getWritingPrompt(topic, editorialContext, agentName, agentDomain);
        const postResult = await generateJson(writingPrompt);
        if (!postResult || !postResult.text || !postResult.rationale) {
          throw new Error("Empty response or missing fields");
        }

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

        let postData;
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
        publishedCount++;

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
          console.error('Memory extraction failed (non-fatal):', memErr.message);
        }

        publishedTitles.push(topic.title);

      } catch (topicErr) {
        console.error(`Failed to process topic "${topic.title}":`, topicErr.message);
      }
    }

    const finalCounts = {
      discovered_count: candidates.length,
      published_count: publishedCount,
      rejected_count: rejectedCount,
      duplicate_count: duplicateCount,
      low_value_count: lowValueCount,
      validation_failed_count: validationFailedCount,
    };

    if (cycleId) await completeCycleRecord(cycleId, finalCounts);

    return {
      published: publishedCount,
      rejected: rejectedCount + lowValueCount + validationFailedCount,
      duplicates: duplicateCount,
    };

  } catch (err) {
    console.error(`Pipeline run failed for agent ${agentName} (${agentId}):`, err);
    if (cycleId) {
      try {
        await supabase
          .from('tick_cycles')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', cycleId);
      } catch {}
    }
    return { published: 0, rejected: 0, duplicates: 0, error: err.message };
  }
}
