import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandidateTopics } from '@/lib/discovery';
import { processAgentTick } from '@/lib/pipeline';

export async function POST(request) {
  try {
    const { persona } = await request.json();
    
    const { data, error } = await supabase
      .from('agents')
      .insert([
        { name: persona.name, domain: persona.domain }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger an immediate first tick in the background so the feed is populated immediately
    after(async () => {
      try {
        console.log(`Triggering immediate first tick for new agent ${data.name} (${data.id})...`);
        const candidates = await fetchCandidateTopics();
        if (candidates && candidates.length > 0) {
          const tickResult = await processAgentTick(data, candidates);
          console.log(`Immediate first tick completed for new agent ${data.id}:`, tickResult);
        }
      } catch (err) {
        console.error(`Immediate first tick failed for new agent ${data.id}:`, err);
      }
    });

    return NextResponse.json({ agentId: data.id });
  } catch (error) {
    console.error('Init Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
