import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Internal stats endpoint — returns agent activity metrics for the dashboard.
 * Not part of the required API contract.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  try {
    // Fetch counts in parallel
    const [postsResult, rejectionsResult, cyclesResult, recentActivityResult] = await Promise.all([
      // Total published posts
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId),

      // Total rejections
      supabase
        .from('rejected_topics')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId),

      // Recent tick cycles
      supabase
        .from('tick_cycles')
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(5),

      // Recent editorial activity (last 20 decisions)
      supabase
        .from('rejected_topics')
        .select('topic, reason, decision_type, editorial_score, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Calculate total sources analyzed across all cycles
    const cycles = cyclesResult.data || [];
    const totalSourcesAnalyzed = cycles.reduce((sum, c) => sum + (c.discovered_count || 0), 0);

    // Last cycle info
    const lastCycle = cycles[0] || null;
    let lastCycleAge = null;
    if (lastCycle?.completed_at) {
      lastCycleAge = Math.round((Date.now() - new Date(lastCycle.completed_at).getTime()) / 60000);
    }

    // Recent published posts for activity feed
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, text, rationale, editorial_score, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build combined editorial activity feed (interleave published + rejected, sorted by time)
    const activity = [];

    for (const post of (recentPosts || []).slice(0, 5)) {
      activity.push({
        type: 'published',
        title: post.text?.substring(0, 80) + (post.text?.length > 80 ? '...' : ''),
        reason: post.rationale,
        score: post.editorial_score,
        timestamp: post.created_at,
      });
    }

    for (const rej of (recentActivityResult.data || []).slice(0, 15)) {
      activity.push({
        type: rej.decision_type || 'rejected',
        title: rej.topic?.substring(0, 80) + (rej.topic?.length > 80 ? '...' : ''),
        reason: rej.reason,
        score: rej.editorial_score,
        timestamp: rej.created_at,
      });
    }

    // Sort activity by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({
      publishedCount: postsResult.count || 0,
      rejectedCount: rejectionsResult.count || 0,
      sourcesAnalyzed: totalSourcesAnalyzed,
      lastCycleMinutesAgo: lastCycleAge,
      lastCycleStatus: lastCycle?.status || null,
      recentActivity: activity.slice(0, 20),
    });

  } catch (error) {
    console.error('Stats Error:', error);
    return NextResponse.json({
      publishedCount: 0,
      rejectedCount: 0,
      sourcesAnalyzed: 0,
      lastCycleMinutesAgo: null,
      lastCycleStatus: null,
      recentActivity: [],
    });
  }
}
