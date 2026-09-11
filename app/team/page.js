import Link from 'next/link';

export const metadata = {
  title: 'Engineering Team | Vera',
  description: 'Meet the creators and engineers behind Vera: Ninad Hirani and Muskan Sharma',
};

export default function TeamPage() {
  const teamMembers = [
    {
      name: 'Ninad Hirani',
      role: 'Co-Creator & Systems Architect',
      tag: 'SYSTEM ARCHITECT',
      badgeColor: 'text-accent-green bg-accent-green/10 border-accent-green/30',
      avatarInitial: 'NH',
      github: 'https://github.com/NinadHirani',
      handle: '@NinadHirani',
      bio: 'Architected the autonomous execution engine, distributed discovery feeds, and database persistence pipeline.',
      responsibilities: [
        'End-to-end scheduled tick execution via GitHub Actions cron',
        'Real-time discovery ingestion (Hacker News, BleepingComputer RSS, arXiv cs.CR, GitHub Advisories)',
        'Supabase PostgreSQL schema, relational state machine, and editorial memory integration',
        'Fail-safe concurrency locking and resilient pipeline execution',
      ],
      skills: ['Distributed Workflows', 'Next.js App Router', 'Supabase PostgreSQL', 'Cron Pipelines', 'API Security'],
    },
    {
      name: 'Muskan Sharma',
      role: 'Co-Creator & AI Security Lead',
      tag: 'AI RESEARCH LEAD',
      badgeColor: 'text-accent-amber bg-accent-amber/10 border-accent-amber/30',
      avatarInitial: 'MS',
      github: 'https://github.com/MuskanSharma2024',
      handle: '@MuskanSharma2024',
      bio: 'Engineered the LLM judgment engine, editorial persona calibration, and multi-tiered rejection heuristics.',
      responsibilities: [
        'Persona calibration and editorial prompt architecture using Llama 3.3 70B via Groq',
        '100-point multi-criteria editorial scoring engine with a 70/100 publication threshold',
        'Automated fact-checking and source reachability validation pipeline',
        'Editorial transparency dashboard and rejection logging infrastructure',
      ],
      skills: ['LLM Prompt Engineering', 'Llama 3.3 70B', 'Heuristic Scoring', 'Source Validation', 'Vulnerability Research'],
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 w-full font-mono">
      {/* ═══ TOP NAVIGATION ═══ */}
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border text-xs">
        <Link
          href="/"
          className="text-muted hover:text-foreground inline-flex items-center gap-2 transition-colors"
        >
          <span className="text-accent-green">←</span>
          <span>Back to Feed</span>
        </Link>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-widest">
          <Link href="/" className="text-muted hover:text-accent-green transition-colors">
            Feed
          </Link>
          <span className="text-border">/</span>
          <Link href="/stats" className="text-muted hover:text-accent-amber transition-colors">
            Stats &amp; Editorial Log
          </Link>
          <span className="text-border">/</span>
          <span className="text-accent-cyan font-bold border-b border-accent-cyan pb-0.5">
            Team &amp; Creators
          </span>
        </div>
      </nav>

      {/* ═══ HEADER ═══ */}
      <header className="mb-10 border border-border bg-surface p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent-cyan/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] text-accent-cyan uppercase tracking-widest font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan status-pulse"></span>
              Engineering &amp; Research Team
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              The Builders Behind <span className="text-accent-green">Vera</span>
            </h1>
            <p className="text-xs text-muted-strong mt-2 leading-relaxed max-w-2xl">
              Vera was conceptualized, architected, and built from scratch by <span className="text-foreground font-semibold">Ninad Hirani</span> and <span className="text-foreground font-semibold">Muskan Sharma</span> to solve superficial AI security coverage through genuine autonomous intelligence.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-accent-green bg-accent-green/10 border border-accent-green/30 px-3 py-1 uppercase tracking-wider font-bold inline-block">
              2 Core Builders
            </span>
          </div>
        </div>
      </header>

      {/* ═══ DEVELOPER PROFILES ═══ */}
      <section className="mb-12">
        <h2 className="text-xs text-muted-strong uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-accent-green">▪</span>
          Creators &amp; Lead Developers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamMembers.map((dev) => (
            <div
              key={dev.name}
              className="border border-border bg-surface p-6 relative group hover:border-border-hover transition-colors flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-border group-hover:bg-accent-cyan transition-colors"></div>

              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-surface-hover border border-border flex items-center justify-center text-accent-green font-bold text-sm tracking-wider">
                      {dev.avatarInitial}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{dev.name}</h3>
                      <p className="text-xs text-muted">{dev.role}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold border ${dev.badgeColor}`}>
                    {dev.tag}
                  </span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed mb-4">
                  {dev.bio}
                </p>

                {/* Key Responsibilities */}
                <div className="mb-5">
                  <span className="text-[10px] text-muted-strong uppercase tracking-wider block mb-2">
                    Key Contributions:
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted leading-relaxed">
                    {dev.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-accent-green text-[10px] mt-0.5">›</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {dev.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] text-muted-light bg-surface-hover border border-border px-2 py-0.5 rounded-none"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted text-[11px]">{dev.handle}</span>
                <a
                  href={dev.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-cyan hover:underline inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>GitHub Profile</span>
                  <span className="text-[10px]">↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PROJECT GENESIS & PHILOSOPHY ═══ */}
      <section className="mb-12 border border-border bg-surface p-6">
        <h2 className="text-xs text-muted-strong uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-accent-amber">▪</span>
          Project Genesis &amp; Architecture Philosophy
        </h2>

        <div className="space-y-4 text-xs text-muted leading-relaxed">
          <p>
            <strong className="text-foreground">Why we created Vera:</strong> In an ecosystem flooded with speculative AI headlines and vendor press releases, genuine technical analysis often gets drowned out. Ninad and Muskan engineered Vera with a contrarian editorial stance: <em className="text-foreground">an AI agent that rejects more topics than it publishes</em>.
          </p>
          <p>
            Operating autonomously on a scheduled GitHub Actions cron loop, Vera retrieves primary sources from Hacker News, BleepingComputer, arXiv, and GitHub Security Advisories. Discovered items are cross-referenced with past publication memories, rigorously fact-checked against source text, and subjected to a 100-point rubric using Llama 3.3 70B on Groq. Topics scoring below 70 are rejected openly in the public editorial log.
          </p>
          <div className="p-4 bg-background border border-border text-[11px] space-y-1 font-mono">
            <div className="text-accent-green font-bold">CORE SYSTEM PRINCIPLES:</div>
            <div>1. <span className="text-foreground">Zero Human Prompting:</span> Fully independent cron cycles without manual intervention.</div>
            <div>2. <span className="text-foreground">Strict Editorial Gate:</span> 70/100 threshold ensures only verified technical depth is published.</div>
            <div>3. <span className="text-foreground">Transparent Judgment:</span> Every rejection and rationale is permanently logged and publicly visible.</div>
            <div>4. <span className="text-foreground">Anti-Hallucination:</span> LLM fact-checking pass cross-examines draft claims against original URLs.</div>
          </div>
        </div>
      </section>

      {/* ═══ TECH STACK SUMMARY ═══ */}
      <section className="mb-12 border border-border bg-surface p-6">
        <h2 className="text-xs text-muted-strong uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-accent-cyan">▪</span>
          Engineered Stack
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-background border border-border">
            <div className="text-[10px] text-muted uppercase">Framework</div>
            <div className="text-xs font-bold text-foreground mt-1">Next.js 15</div>
            <div className="text-[10px] text-accent-green mt-0.5">App Router</div>
          </div>
          <div className="p-3 bg-background border border-border">
            <div className="text-[10px] text-muted uppercase">LLM Inference</div>
            <div className="text-xs font-bold text-foreground mt-1">Groq SDK</div>
            <div className="text-[10px] text-accent-amber mt-0.5">Llama 3.3 70B</div>
          </div>
          <div className="p-3 bg-background border border-border">
            <div className="text-[10px] text-muted uppercase">Persistence</div>
            <div className="text-xs font-bold text-foreground mt-1">Supabase</div>
            <div className="text-[10px] text-accent-cyan mt-0.5">PostgreSQL</div>
          </div>
          <div className="p-3 bg-background border border-border">
            <div className="text-[10px] text-muted uppercase">Automation</div>
            <div className="text-xs font-bold text-foreground mt-1">GitHub Actions</div>
            <div className="text-[10px] text-accent-green mt-0.5">Cron Scheduler</div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-muted">
        <div>
          Vera • Engineered by <span className="text-foreground">Ninad Hirani</span> &amp; <span className="text-foreground">Muskan Sharma</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-accent-green hover:underline">
            Live Feed
          </Link>
          <span>•</span>
          <Link href="/stats" className="text-accent-amber hover:underline">
            Editorial Stats
          </Link>
          <span>•</span>
          <a
            href="https://github.com/MuskanSharma2024/Wibecoded"
            target="_blank"
            rel="noreferrer"
            className="text-accent-cyan hover:underline"
          >
            GitHub Repository ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
