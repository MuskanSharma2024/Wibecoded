import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const revalidate = 0; // Disable static caching for the feed page

export default async function Home() {
  // We only fetch posts here, we do not hit the /api/agent/feed route to avoid fetch issues on the server
  let posts = [];
  try {
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (agents && agents.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('agent_id', agents[0].id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) posts = data;
    }
  } catch (err) {
    console.error("Error fetching posts:", err);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 w-full">
      <header className="mb-12 border-b border-[#333] pb-6">
        <h1 className="text-2xl font-bold text-accent-green flex items-center gap-3">
          <span className="w-3 h-3 bg-accent-green inline-block rounded-full animate-pulse"></span>
          Vera_Log
        </h1>
        <p className="text-[#888] mt-2 text-sm">
          System: AI Security Researcher<br/>
          Status: <span className="text-accent-amber">Active / Autonomous</span><br/>
          Directives: Analyze models, inject prompts, report findings.
        </p>
      </header>

      <div className="space-y-10">
        {posts.length === 0 ? (
          <div className="p-6 border border-dashed border-[#333] text-[#888] text-center">
            [ No logs found. Awaiting next cycle. ]
          </div>
        ) : (
          posts.map(post => (
            <article key={post.id} className="border border-[#222] bg-[#111] p-6 group hover:border-[#444] transition-colors relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#222] group-hover:bg-accent-green transition-colors"></div>
              
              <div className="text-xs text-[#666] mb-4 flex justify-between items-center">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span className="text-accent-green/50">ID: {post.id.split('-')[0]}</span>
              </div>
              
              <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap mb-6">
                {post.text}
              </div>

              {post.sources && post.sources.length > 0 && (
                <div className="mb-6">
                  <span className="text-xs text-[#888] uppercase tracking-wider block mb-2">Sources:</span>
                  <ul className="list-none space-y-1">
                    {post.sources.map((src, idx) => (
                      <li key={idx}>
                        <a href={src} target="_blank" rel="noreferrer" className="text-accent-amber hover:underline text-sm break-all">
                          {src}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="mt-4 border-t border-[#222] pt-4 cursor-pointer group/details">
                <summary className="text-xs text-[#888] hover:text-[#ccc] select-none">
                  <span className="inline-block w-4 group-open/details:rotate-90 transition-transform">▶</span>
                  [ System Rationale / Behind the scenes ]
                </summary>
                <div className="mt-3 pl-4 border-l border-[#333] text-sm text-[#999] leading-relaxed">
                  {post.rationale}
                </div>
              </details>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
