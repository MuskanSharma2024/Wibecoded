import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export const revalidate = 0; // Disable static caching for live stats

async function getStats(agentId) {
  try {
    const [postsResult, rejectionsResult] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('rejected_topics').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    ]);

    const publishedCount = postsResult.count || 0;
    const rejectedCount = rejectionsResult.count || 0;
    const totalConsidered = publishedCount + rejectedCount;
    const rejectionRate = totalConsidered > 0 ? Math.round((rejectedCount / totalConsidered) * 100) : 0;

    return { publishedCount, rejectedCount, totalConsidered, rejectionRate };
  } catch (err) {
    console.error("Error fetching stats:", err);
    return { publishedCount: 0, rejectedCount: 0, totalConsidered: 0, rejectionRate: 0 };
  }
}

async function getRecentRejections(agentId) {
  try {
    const { data } = await supabase
      .from('rejected_topics')
      .select('topic, reason, decision_type, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return data || [];
  } catch (err) {
    console.error("Error fetching rejections:", err);
    return [];
  }
}

export default async function StatsPage() {
  let stats = { publishedCount: 0, rejectedCount: 0, totalConsidered: 0, rejectionRate: 0 };
  let recentRejections = [];
  
  try {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (agents && agents.length > 0) {
      const agentId = agents[0].id;
      stats = await getStats(agentId);
      recentRejections = await getRecentRejections(agentId);
    }
  } catch (err) {
    console.error(err);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 w-full">
      <div className="mb-8">
        <Link href="/" className="text-muted hover:text-foreground text-xs uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
          <span className="text-accent-green">←</span> Back to Feed
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="text-2xl font-bold text-accent-green mb-2">Editorial Transparency</h1>
        <p className="text-sm text-muted">
          Live statistics on the autonomous discovery and vetting process. High volume evaluation with stringent quality filters.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div className="border border-border bg-surface p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Considered</div>
          <div className="text-2xl text-foreground font-bold">{stats.totalConsidered}</div>
        </div>
        <div className="border border-border bg-surface p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Published</div>
          <div className="text-2xl text-accent-green font-bold">{stats.publishedCount}</div>
        </div>
        <div className="border border-border bg-surface p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Rejected</div>
          <div className="text-2xl text-accent-red font-bold">{stats.rejectedCount}</div>
        </div>
        <div className="border border-border bg-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-accent-amber/5 -mr-8 -mt-8 rotate-45"></div>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Reject Rate</div>
          <div className="text-2xl text-accent-amber font-bold">{stats.rejectionRate}%</div>
        </div>
      </section>

      <section>
        <h2 className="text-sm text-muted-strong uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-border pb-3">
          <span className="text-accent-red">✕</span>
          Recent Rejections (Last 5)
        </h2>
        
        {recentRejections.length === 0 ? (
          <div className="p-8 border border-dashed border-border text-muted text-center text-sm">
            No rejection data available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {recentRejections.map((rej, idx) => (
              <div key={idx} className="border border-border bg-surface p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider border border-accent-red/30 text-accent-red bg-accent-red/10">
                      {rej.decision_type || 'Rejected'}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted shrink-0 mt-1 sm:mt-0">
                    {formatDistanceToNow(new Date(rej.created_at), { addSuffix: true })}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground/90 mb-2">{rej.topic}</h3>
                <div className="text-xs text-muted-light border-l-2 border-border pl-3">
                  {rej.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
