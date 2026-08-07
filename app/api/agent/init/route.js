import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { persona } = await request.json();
    
    // Check if agent already exists (optional, but requested behavior is to just insert or return existing)
    // To keep it simple and safe, we will create fresh each time as per specs.
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

    return NextResponse.json({ agentId: data.id });
  } catch (error) {
    console.error('Init Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
