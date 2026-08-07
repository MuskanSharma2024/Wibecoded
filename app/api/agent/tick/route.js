import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandidateTopics } from '@/lib/discovery';
import { getJudgmentPrompt, getWritingPrompt } from '@/lib/persona';
import { generateJson } from '@/lib/groq';

export const maxDuration = 300; // Allow 5 minutes on Vercel

export async function POST(request) {
  const tickSecret = request.headers.get('x-tick-secret');
  
  if (tickSecret !== process.env.TICK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get agent ID (Assuming only one agent for simplicity, or we get the latest one)
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (!agentData) {
      return NextResponse.json({ error: 'No agent initialized' }, { status: 400 });
    }
    const agentId = agentData.id;

    // 2. Fetch candidate topics
    const candidates = await fetchCandidateTopics();
    if (candidates.length === 0) {
      return NextResponse.json({ published: 0, rejected: 0, message: "No candidates found" });
    }

    // 3. Run judgment prompt
    const topicsJsonStr = JSON.stringify(candidates);
    const judgmentPrompt = getJudgmentPrompt(topicsJsonStr);
    const judgmentResult = await generateJson(judgmentPrompt);
    
    if (!judgmentResult || !judgmentResult.decisions) {
       return NextResponse.json({ error: 'Failed to parse judgment decisions' }, { status: 500 });
    }

    const decisions = judgmentResult.decisions;
    const publishedTopics = [];
    let rejectedCount = 0;

    // 4. Process decisions
    for (const decision of decisions) {
      const topic = candidates.find(c => c.id === decision.id);
      if (!topic) continue;

      if (decision.decision.toLowerCase() === 'publish') {
        // Simple check against recent posts (skip if overlap is high)
        // Let's do a very simple check in memory against the last 20 posts
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('topic_key')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(20);
          
        const isDuplicate = recentPosts?.some(p => p.topic_key === topic.id);
        
        if (!isDuplicate) {
          publishedTopics.push(topic);
        } else {
          rejectedCount++;
        }
      } else {
        // Rejected topic, log it
        await supabase.from('rejected_topics').insert([{
          agent_id: agentId,
          topic: topic.title,
          reason: decision.reason
        }]);
        rejectedCount++;
      }
    }

    // 5. Run writing prompt on at most 1–2 surviving topics
    const topicsToWrite = publishedTopics.slice(0, 2);
    let publishedCount = 0;

    for (const topic of topicsToWrite) {
      const writingPrompt = getWritingPrompt(topic);
      const postResult = await generateJson(writingPrompt);
      
      if (postResult && postResult.text && postResult.rationale) {
        // 6. Insert resulting posts into `posts` table
        await supabase.from('posts').insert([{
          agent_id: agentId,
          text: postResult.text,
          rationale: postResult.rationale,
          sources: [topic.url],
          topic_key: topic.id
        }]);
        publishedCount++;
      }
    }

    // 8. Return counts
    return NextResponse.json({ published: publishedCount, rejected: rejectedCount });

  } catch (error) {
    console.error('Tick Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
