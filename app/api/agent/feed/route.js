/**
 * Agent Feed Route (/api/agent/feed)
 * This endpoint serves the generated posts for a specific agent to the frontend.
 * Depends on: Supabase (fetching posts).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, created_at, text, rationale, sources')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      // Return empty feed rather than error for empty or failed cases, as per spec:
      // "If none exist yet, return {"posts":[]} — never throw an error for an empty feed."
      return NextResponse.json({ posts: [] });
    }

    // Map `created_at` to `createdAt` for output
    const posts = data.map(post => ({
      id: post.id,
      createdAt: post.created_at,
      text: post.text,
      rationale: post.rationale,
      sources: post.sources
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Feed Error:', error);
    return NextResponse.json({ posts: [] });
  }
}
