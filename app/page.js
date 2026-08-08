import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const revalidate = 0; // Disable static caching for the feed page

/**
 * Fetch agent stats directly from Supabase (server component — no API call needed)
 */
async function getAgentStats(agentId) {
  try {
    const [postsResult, rejectionsResult, cyclesResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId),
      supabase
        .from('rejected_topics')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId),
      supabase
        .from('tick_cycles')
        .select('discovered_count, completed_at, started_at, status')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(20),
    ]);

    const cycles = cyclesResult.data || [];
    const totalSourcesAnalyzed = cycles.reduce((sum, c) => sum + (c.discovered_count || 0), 0);
    const lastCycle = cycles[0] || null;

    return {
      publishedCount: postsResult.count || 0,
      rejectedCount: rejectionsResult.count || 0,
      sourcesAnalyzed: totalSourcesAnalyzed,
      lastCycle,
    };
  } catch {
    return { publishedCount: 0, rejectedCount: 0, sourcesAnalyzed: 0, lastCycle: null };
  }
}

/**
 * Fetch recent editorial activity (published + rejected interleaved)
 */
async function getEditorialActivity(agentId) {
  try {
    const [recentPosts, recentRejections] = await Promise.all([
      supabase
        .from('posts')
        .select('id, text, editorial_score, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('rejected_topics')
        .select('topic, reason, decision_type, editorial_score, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const activity = [];

    for (const post of (recentPosts.data || [])) {
      activity.push({
        type: 'published',
        title: post.text?.substring(0, 70) + (post.text?.length > 70 ? '...' : ''),
        reason: null,
        score: post.editorial_score,
        timestamp: post.created_at,
      });
    }

    for (const rej of (recentRejections.data || [])) {
      activity.push({
        type: rej.decision_type || 'rejected',
        title: rej.topic?.substring(0, 70) + (rej.topic?.length > 70 ? '...' : ''),
        reason: rej.reason,
        score: rej.editorial_score,
        timestamp: rej.created_at,
      });
    }

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activity.slice(0, 20);
  } catch {
    return [];
  }
}

function StatusBadge({ type }) {
  const config = {
    published: { label: '✓ Published', className: 'badge-published' },
    rejected: { label: '✕ Rejected', className: 'badge-rejected' },
    duplicate: { label: '⊘ Duplicate', className: 'badge-duplicate' },
    low_value: { label: '↓ Low Value', className: 'badge-low-value' },
    validation_failed: { label: '⚠ Invalid', className: 'badge-validation-failed' },
  };

  const { label, className } = config[type] || config.rejected;

  return (
    <span className={`${className} text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider inline-block`}>
      {label}
    </span>
  );
}

export default async function Home() {
  let posts = [];
  let agent = null;
  let stats = { publishedCount: 0, rejectedCount: 0, sourcesAnalyzed: 0, lastCycle: null };
  let activity = [];
  let lastTickTime = null;
  let lastCycleRejectionsCount = 0;
  let mostCommonCategory = '';

  try {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, domain, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (agents && agents.length > 0) {
      agent = agents[0];

      const [postsResult, statsResult, activityResult, latestPostResult, latestRejectionResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(20),
        getAgentStats(agent.id),
        getEditorialActivity(agent.id),
        supabase
          .from('posts')
          .select('created_at')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('rejected_topics')
          .select('created_at')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (postsResult.data) posts = postsResult.data;
      stats = statsResult;
      activity = activityResult;

      const latestPostTime = latestPostResult.data?.[0]?.created_at
        ? new Date(latestPostResult.data[0].created_at)
        : null;
      const latestRejectionTime = latestRejectionResult.data?.[0]?.created_at
        ? new Date(latestRejectionResult.data[0].created_at)
        : null;

      if (latestPostTime && latestRejectionTime) {
        lastTickTime = latestPostTime > latestRejectionTime ? latestPostTime : latestRejectionTime;
      } else {
        lastTickTime = latestPostTime || latestRejectionTime;
      }

      if (stats.lastCycle) {
        const { data: lastCycleRejections } = await supabase
          .from('rejected_topics')
          .select('decision_type, reason')
          .eq('agent_id', agent.id)
          .gte('created_at', stats.lastCycle.started_at);

        if (lastCycleRejections && lastCycleRejections.length > 0) {
          lastCycleRejectionsCount = lastCycleRejections.length;

          const counts = {};
          lastCycleRejections.forEach(r => {
            const cat = r.decision_type || 'rejected';
            counts[cat] = (counts[cat] || 0) + 1;
          });

          let maxCount = -1;
          let maxCat = 'rejected';
          for (const cat in counts) {
            if (counts[cat] > maxCount) {
              maxCount = counts[cat];
              maxCat = cat;
            }
          }

          const friendlyNames = {
            duplicate: 'duplicate / already covered',
            low_value: 'low editorial value',
            validation_failed: 'source validation failed',
            rejected: 'editorial reject',
          };
          mostCommonCategory = friendlyNames[maxCat] || maxCat;
        }
      }
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }

  const lastCycleAge = stats.lastCycle?.completed_at
    ? formatDistanceToNow(new Date(stats.lastCycle.completed_at), { addSuffix: true })
    : null;

  let nextTickMinutes = null;
  if (lastTickTime) {
    const elapsedMs = Date.now() - lastTickTime.getTime();
    const intervalMs = 2 * 60 * 60 * 1000; // 2 hours
    const remainingMs = intervalMs - (elapsedMs % intervalMs);
    nextTickMinutes = Math.max(1, Math.round(remainingMs / (60 * 1000)));
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 w-full">
      {/* ═══ STATUS HEADER ═══ */}
      <header className="mb-8 border border-border bg-surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-accent-green flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-accent-green inline-block rounded-full status-pulse"></span>
              VERA
            </h1>
            <p className="text-muted-strong text-xs mt-1 uppercase tracking-widest">
              Autonomous AI Security Researcher
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-right">
            <div className="flex items-center gap-2 justify-start sm:justify-end">
              <span className="text-[10px] text-accent-green bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 uppercase tracking-wider font-bold">
                ● Active / Autonomous
              </span>
            </div>
            <span className="text-[10px] text-muted block mt-1">
              {lastTickTime ? (
                <>
                  Last tick: {formatDistanceToNow(lastTickTime, { addSuffix: true })}
                  {nextTickMinutes !== null && ` • next check in ~${nextTickMinutes}m`}
                </>
              ) : (
                "first tick pending"
              )}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Last cycle</div>
            <div className="text-sm text-foreground mt-1">
              {lastCycleAge || 'Awaiting first cycle'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Published</div>
            <div className="text-sm text-accent-green mt-1 font-bold">{stats.publishedCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Rejected</div>
            <div className="text-sm text-accent-red mt-1 font-bold">{stats.rejectedCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Sources analyzed</div>
            <div className="text-sm text-accent-amber mt-1 font-bold">{stats.sourcesAnalyzed}</div>
          </div>
        </div>

        {/* Rejection count per tick */}
        {lastTickTime && lastCycleRejectionsCount > 0 && (
          <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted leading-relaxed">
            <span className="text-accent-red font-semibold">{lastCycleRejectionsCount} topics rejected this cycle</span> — {mostCommonCategory}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] text-muted leading-relaxed">
            Discover → Remember → Judge → Reject/Accept → Validate → Write → Publish → Remember
          </p>
        </div>
      </header>

      {/* ═══ EDITORIAL ACTIVITY ═══ */}
      {activity.length > 0 && (
        <section className="mb-8">
          <details className="group" open>
            <summary className="text-xs text-muted-strong uppercase tracking-widest cursor-pointer hover:text-foreground select-none flex items-center gap-2 mb-3">
              <span className="inline-block w-3 group-open:rotate-90 transition-transform text-muted">▶</span>
              Editorial Activity
              <span className="text-muted text-[10px] normal-case">({activity.length} recent decisions)</span>
            </summary>

            <div className="border border-border bg-surface divide-y divide-border">
              {activity.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge type={item.type} />
                    {item.score != null && (
                      <span className="text-[10px] text-muted">{item.score}/100</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground/80 block truncate">
                      {item.title}
                    </span>
                    {item.reason && item.type !== 'published' && (
                      <span className="text-[10px] text-muted block mt-0.5 truncate">
                        {item.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* ═══ PUBLISHED FEED ═══ */}
      <section>
        <h2 className="text-xs text-muted-strong uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-accent-green">▪</span>
          Published Analysis
          {posts.length > 0 && (
            <span className="text-muted text-[10px] normal-case">({posts.length} posts)</span>
          )}
        </h2>

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="p-8 border border-dashed border-border text-muted text-center text-sm">
              [ Vera has not published any analysis yet. Awaiting next autonomous cycle. ]
            </div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="border border-border bg-surface p-5 group hover:border-border-hover transition-colors relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-border group-hover:bg-accent-green transition-colors"></div>

                <div className="text-[10px] text-muted mb-3 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    {post.editorial_score != null && (
                      <span className="text-accent-green/60">Score: {post.editorial_score}/100</span>
                    )}
                  </div>
                  <span className="text-accent-green/40">ID: {post.id.split('-')[0]}</span>
                </div>

                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-5">
                  {post.text}
                </div>

                {post.sources && post.sources.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">Sources:</span>
                    <ul className="list-none space-y-1">
                      {post.sources.map((src, idx) => (
                        <li key={idx}>
                          <a href={src} target="_blank" rel="noreferrer" className="text-accent-amber hover:underline text-xs break-all">
                            {src}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <details className="mt-3 border-t border-border pt-3 cursor-pointer group/details">
                  <summary className="text-[10px] text-muted hover:text-muted-light select-none">
                    <span className="inline-block w-3 group-open/details:rotate-90 transition-transform">▶</span>
                    [ Editorial Rationale ]
                  </summary>
                  <div className="mt-2 pl-3 border-l border-border text-xs text-muted-light leading-relaxed">
                    {post.rationale}
                  </div>
                </details>
              </article>
            ))
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="mt-12 pt-4 border-t border-border text-center">
        <p className="text-[10px] text-muted">
          Vera operates autonomously. Discover → Judge → Publish cycles run every 2 hours via GitHub Actions.
        </p>
      </footer>
    </main>
  );
}
