import { supabase } from './supabase.js';

/**
 * Fetch recent editorial memories (published posts' structured context)
 */
export async function getRecentMemories(agentId, limit = 30) {
  try {
    const { data, error } = await supabase
      .from('editorial_memory')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Memory fetch failed:', err);
    return [];
  }
}

/**
 * Fetch recent rejections with structured data
 */
export async function getRecentRejections(agentId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('rejected_topics')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching rejections:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Rejection fetch failed:', err);
    return [];
  }
}

/**
 * Store structured editorial memory after a post is published
 */
export async function storePublicationMemory(agentId, postId, memoryData) {
  try {
    const { error } = await supabase
      .from('editorial_memory')
      .insert([{
        agent_id: agentId,
        post_id: postId,
        topic: memoryData.topic || '',
        normalized_title: memoryData.normalized_title || '',
        angle: memoryData.angle || '',
        key_claims: memoryData.key_claims || [],
        technical_concepts: memoryData.technical_concepts || [],
        entities: memoryData.entities || [],
        editorial_stance: memoryData.editorial_stance || '',
        source_urls: memoryData.source_urls || [],
        editorial_score: memoryData.editorial_score || 0,
      }]);

    if (error) {
      console.error('Error storing memory:', error);
    }
  } catch (err) {
    console.error('Memory storage failed:', err);
  }
}

/**
 * Store a rejection with structured data
 */
export async function storeRejection(agentId, rejectionData) {
  try {
    const { error } = await supabase
      .from('rejected_topics')
      .insert([{
        agent_id: agentId,
        topic: rejectionData.topic || '',
        normalized_title: rejectionData.normalized_title || '',
        reason: rejectionData.reason || '',
        editorial_score: rejectionData.editorial_score || 0,
        decision_type: rejectionData.decision_type || 'rejected',
      }]);

    if (error) {
      console.error('Error storing rejection:', error);
    }
  } catch (err) {
    console.error('Rejection storage failed:', err);
  }
}

/**
 * Format memory context for LLM prompts — provides Vera with awareness
 * of what she has previously published and rejected
 */
export function formatMemoryContext(memories, rejections) {
  let context = '';

  if (memories.length > 0) {
    context += 'PREVIOUSLY PUBLISHED TOPICS (most recent first):\n';
    for (const mem of memories.slice(0, 15)) {
      context += `- "${mem.topic}" | Angle: ${mem.angle || 'N/A'} | Stance: ${mem.editorial_stance || 'N/A'} | Concepts: ${(mem.technical_concepts || []).join(', ') || 'N/A'} | Published: ${mem.created_at}\n`;
    }
    context += '\n';
  }

  if (rejections.length > 0) {
    context += 'RECENTLY REJECTED TOPICS:\n';
    for (const rej of rejections.slice(0, 10)) {
      context += `- "${rej.topic}" | Reason: ${rej.reason} | Type: ${rej.decision_type || 'rejected'}\n`;
    }
    context += '\n';
  }

  return context;
}

/**
 * Get previously used angles to avoid repetition
 */
export function getPreviousAngles(memories) {
  return memories
    .filter(m => m.angle)
    .map(m => ({ topic: m.topic, angle: m.angle }))
    .slice(0, 10);
}

/**
 * Get agent memory (or fall back to dynamic calculation if column doesn't exist)
 */
export async function getAgentMemory(agentId) {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('agent_memory, name, domain')
      .eq('id', agentId)
      .single();

    if (error) {
      console.warn('Error fetching agent memory column (migrating schema?):', error.message);
      return await computeDynamicAgentMemory(agentId);
    }

    if (data?.agent_memory && typeof data.agent_memory === 'object' && Object.keys(data.agent_memory).length > 0) {
      return data.agent_memory;
    }

    return await computeDynamicAgentMemory(agentId);
  } catch (err) {
    console.error('Agent memory read failed, falling back to dynamic computation:', err);
    return await computeDynamicAgentMemory(agentId);
  }
}

/**
 * Update agent memory (saving to column, or logging failure gracefully)
 */
export async function updateAgentMemory(agentId, memoryJson) {
  try {
    const { error } = await supabase
      .from('agents')
      .update({ agent_memory: memoryJson })
      .eq('id', agentId);

    if (error) {
      console.warn('Could not save agent memory column:', error.message);
    }
  } catch (err) {
    console.error('Agent memory save failed:', err);
  }
}

/**
 * Helper to compute agent memory dynamically if column is missing or empty
 */
async function computeDynamicAgentMemory(agentId) {
  try {
    const { data: memories } = await supabase
      .from('editorial_memory')
      .select('technical_concepts, topic')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    const totalCount = memories?.length || 0;
    const lastTopics = (memories || []).slice(0, 3).map(m => m.topic);

    const conceptCounts = {};
    (memories || []).forEach(m => {
      const concepts = m.technical_concepts || [];
      concepts.forEach(c => {
        const normalized = c.toLowerCase().trim();
        if (normalized.length > 2) {
          conceptCounts[normalized] = (conceptCounts[normalized] || 0) + 1;
        }
      });
    });

    const recurring = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(entry => entry[0]);

    if (recurring.length === 0) {
      recurring.push("prompt injection defenses", "model supply-chain security");
    }

    return {
      recurring_concerns: recurring,
      post_count: totalCount,
      last_topics: lastTopics
    };
  } catch (err) {
    console.error('Dynamic memory calculation failed:', err);
    return {
      recurring_concerns: ["prompt injection defenses", "model supply-chain security"],
      post_count: 0,
      last_topics: []
    };
  }
}
