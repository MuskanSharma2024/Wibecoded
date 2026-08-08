/**
 * Agent Tick Route (/api/agent/tick)
 * This is the main chron job endpoint that drives the agent's workflow. It fetches candidates,
 * runs them through the pipeline (discovery, judgment, writing, memory), and handles concurrency.
 * Depends on: Supabase (state), lib/discovery (sources), lib/pipeline (agent logic).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandidateTopics } from '@/lib/discovery';
import { processAgentTick } from '@/lib/pipeline';

export const maxDuration = 300; // Allow 5 minutes on Vercel

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

export async function POST(request) {
  const tickSecret = request.headers.get('x-tick-secret');

  if (tickSecret !== process.env.TICK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch all agents from database (limit to 10 to prevent runaway cost/timeouts)
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, domain')
      .order('created_at', { ascending: false })
      .limit(10);

    if (agentsError) {
      console.error('Failed to fetch agents:', agentsError);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents initialized' }, { status: 400 });
    }

    // Filter to pinned agent if AGENT_ID is specified in environment variables
    let agentsToProcess = agents;
    const pinnedId = process.env.AGENT_ID;
    if (pinnedId) {
      const pinnedAgent = agents.find(a => a.id === pinnedId);
      if (pinnedAgent) {
        agentsToProcess = [pinnedAgent];
      } else {
        const { data: directAgent } = await supabase
          .from('agents')
          .select('id, name, domain')
          .eq('id', pinnedId)
          .single();
        if (directAgent) {
          agentsToProcess = [directAgent];
        } else {
          console.warn(`Pinned AGENT_ID ${pinnedId} not found, falling back to all agents`);
        }
      }
    }

    // 2. Discover candidate topics (fetched once per tick and reused across agents)
    let candidates = [];
    try {
      candidates = await fetchCandidateTopics();
    } catch (err) {
      console.error("Discovery fetch failed:", err);
      return NextResponse.json({ published: 0, rejected: 0, error: "discovery fetch" });
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        agentsProcessed: agentsToProcess.length,
        totalPublished: 0,
        totalRejected: 0,
        published: 0,
        rejected: 0,
      });
    }

    let totalPublished = 0;
    let totalRejected = 0;
    let totalDuplicates = 0;

    // Process each agent independently using the shared pipeline module
    for (const agent of agentsToProcess) {
      const result = await processAgentTick(agent, candidates);
      totalPublished += result.published || 0;
      totalRejected += result.rejected || 0;
      totalDuplicates += result.duplicates || 0;
    }

    return NextResponse.json({
      agentsProcessed: agentsToProcess.length,
      totalPublished,
      totalRejected,
      published: totalPublished,
      rejected: totalRejected,
      duplicates: totalDuplicates,
      message: `Ticked successfully across ${agentsToProcess.length} agents: ${totalPublished} published, ${totalRejected} rejected`,
    });

  } catch (error) {
    console.error('Tick Error:', error);
    return NextResponse.json({ published: 0, rejected: 0, error: "unexpected failure: " + error.message });
  }
}
