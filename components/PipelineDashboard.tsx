'use client';

import React, { useState, useCallback, useEffect, memo } from 'react';

const BACKEND_URL = 'http://localhost:8420';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Opportunity {
  id: number;
  genome_id: string;
  variant_type: string;
  title: string;
  content: string;
  score: number;
  score_breakdown: string;
  hook: string;
  created_at: string;
  viewed: number;
  dismissed: number;
  hook_type?: string;
  structural_pattern?: string;
  genome_engagement?: number;
  published?: boolean;
  feedback_id?: number;
}

interface Genome {
  post_id: string;
  hook_type: string;
  hook_text: string;
  emotional_arc: string[];
  structural_pattern: string;
  key_phrases: string[];
  content_length_words: number;
  platform_signals: Record<string, unknown>;
  engagement_score: number;
}

interface PipelineStats {
  total_genomes: number;
  total_opportunities: number;
  unseen_opportunities: number;
  top_genome: { post_id: string; hook_type: string; engagement_score: number } | null;
  hook_distribution: Record<string, number>;
}

interface PipelineDashboardProps {
  onGenerate?: (prompt: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const FORMAT_ICONS: Record<string, string> = {
  thread: '🧵',
  post: '📝',
  newsletter: '📰',
  script: '🎬',
  carousel: '📸',
};

const HOOK_COLORS: Record<string, string> = {
  question: '#f59e0b',
  statistic: '#3b82f6',
  story: '#8b5cf6',
  contrarian: '#ef4444',
  list: '#10b981',
  bold_claim: '#f97316',
  tutorial: '#06b6d4',
  announcement: '#ec4899',
};

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#6b7280';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseBreakdown(raw: string): Record<string, { raw: number; weight: number; weighted: number }> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── Components ────────────────────────────────────────────────────────────

const StatsBar = memo(({ stats, onRefresh }: { stats: PipelineStats | null; onRefresh: () => void }) => (
  <div className="flex items-center gap-4 px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
    <div className="flex items-center gap-2">
      <span className="text-lg">🧬</span>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        Viral Pipeline
      </span>
      {stats && stats.unseen_opportunities > 0 && (
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
          {stats.unseen_opportunities} new
        </span>
      )}
    </div>
    {stats && (
      <div className="flex items-center gap-4 ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{stats.total_genomes} genomes</span>
        <span>•</span>
        <span>{stats.total_opportunities} drafts</span>
        {stats.top_genome && (
          <>
            <span>•</span>
            <span>
              Top: <strong style={{ color: HOOK_COLORS[stats.top_genome.hook_type] || 'var(--text-secondary)' }}>
                {stats.top_genome.hook_type}
              </strong>
            </span>
          </>
        )}
        <button
          onClick={onRefresh}
          className="px-2 py-1 rounded text-[9px] font-bold uppercase transition-all"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          ↻ Refresh
        </button>
      </div>
    )}
  </div>
));
StatsBar.displayName = 'StatsBar';

const OpportunityCard = memo(({ opp, expanded, onToggle, onView, onDismiss, onCopy, onRegenerate, onGenerate }: {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onDismiss: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onPublish: () => void;
  onGenerate: (prompt: string) => void;
}) => {
  const breakdown = parseBreakdown(opp.score_breakdown);
  const icon = FORMAT_ICONS[opp.variant_type] || '📄';
  const hookColor = HOOK_COLORS[opp.hook_type || ''] || '#6b7280';

  return (
    <div
      className="rounded-lg transition-all"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${expanded ? 'var(--accent-dim)' : 'var(--border)'}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => { onToggle(); if (!opp.viewed) onView(); }}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
              style={{ background: `${hookColor}20`, color: hookColor }}
            >
              {opp.hook_type || opp.variant_type}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {opp.variant_type}
            </span>
            {!opp.viewed && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
            )}
            <span className="text-[9px] ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(opp.created_at)}
            </span>
          </div>
          <h3 className="text-[12px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {opp.title}
          </h3>
          {opp.hook && (
            <p className="text-[10px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              {opp.hook}
            </p>
          )}
        </div>
        {/* Score */}
        <div className="flex-shrink-0 text-center ml-2">
          <div
            className="text-[16px] font-black leading-none"
            style={{ color: scoreColor(opp.score) }}
          >
            {opp.score.toFixed(0)}
          </div>
          <div className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>score</div>
        </div>
        <span className="text-[10px] flex-shrink-0 self-center" style={{ color: 'var(--text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Score breakdown */}
          <div className="flex items-center gap-3 mt-3 mb-3">
            {Object.entries(breakdown).map(([key, val]) => (
              <div key={key} className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                <span className="font-bold capitalize">{key}: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{val.raw.toFixed(1)}</span>
                <span className="ml-1">×{val.weight}</span>
              </div>
            ))}
            {opp.genome_engagement != null && (
              <div className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                source engagement: <strong style={{ color: 'var(--accent)' }}>{(opp.genome_engagement * 100).toFixed(0)}%</strong>
              </div>
            )}
          </div>

          {/* Content preview */}
          <div
            className="rounded p-3 text-[11px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto mb-3"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {opp.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="px-3 py-1.5 rounded text-[10px] font-bold transition-all"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              📋 Copy
            </button>
            {!opp.published && (
              <button
                onClick={(e) => { e.stopPropagation(); onPublish(); }}
                className="px-3 py-1.5 rounded text-[10px] font-bold transition-all"
                style={{ background: '#10b981', color: '#fff' }}
              >
                ✅ Published
              </button>
            )}
            {opp.published && (
              <span className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: '#10b98120', color: '#10b981' }}>
                ✓ Published
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate(`Refine this content draft into a polished ${opp.variant_type}:\n\nTitle: ${opp.title}\nHook: ${opp.hook}\n\n${opp.content}`);
              }}
              className="px-3 py-1.5 rounded text-[10px] font-bold transition-all"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}
            >
              ✨ Refine in Chat
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="px-3 py-1.5 rounded text-[10px] font-bold transition-all"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              🔄 Regenerate
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="px-3 py-1.5 rounded text-[10px] font-bold transition-all ml-auto"
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
OpportunityCard.displayName = 'OpportunityCard';

const GenomeCard = memo(({ genome }: { genome: Genome }) => {
  const hookColor = HOOK_COLORS[genome.hook_type] || '#6b7280';
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: `${hookColor}20`, color: hookColor }}>
          {genome.hook_type}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
          {genome.structural_pattern}
        </span>
        <span className="text-[10px] font-bold ml-auto" style={{ color: scoreColor(genome.engagement_score * 100) }}>
          {(genome.engagement_score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {genome.hook_text}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {genome.emotional_arc.map((e, i) => (
          <span key={i} className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {e}
          </span>
        ))}
      </div>
      {genome.key_phrases.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {genome.key_phrases.slice(0, 3).map((p, i) => (
            <span key={i} className="text-[8px] px-1 py-0.5 rounded italic" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
GenomeCard.displayName = 'GenomeCard';

const HookDistribution = memo(({ distribution }: { distribution: Record<string, number> }) => {
  const max = Math.max(...Object.values(distribution), 1);
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        Hook Genome Library
      </h3>
      <div className="flex flex-col gap-1.5">
        {sorted.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="text-[9px] w-20 truncate" style={{ color: 'var(--text-muted)' }}>{type}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: HOOK_COLORS[type] || '#6b7280',
                }}
              />
            </div>
            <span className="text-[9px] font-bold w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
HookDistribution.displayName = 'HookDistribution';

// ─── Main Component ────────────────────────────────────────────────────────

export default function PipelineDashboard({ onGenerate }: PipelineDashboardProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [genomes, setGenomes] = useState<Genome[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'genomes'>('opportunities');
  const [filter, setFilter] = useState<'unseen' | 'all'>('unseen');
  const [copyStatus, setCopyStatus] = useState<number | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      setBackendStatus(res.ok ? 'online' : 'offline');
      return res.ok;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, oppsRes, genomesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/pipeline/stats`),
        fetch(`${BACKEND_URL}/pipeline/opportunities?limit=50&unseen_only=${filter === 'unseen'}`),
        fetch(`${BACKEND_URL}/pipeline/genomes?limit=20`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setOpportunities(data.opportunities || []);
      }
      if (genomesRes.ok) {
        const data = await genomesRes.json();
        setGenomes(data.genomes || []);
      }
    } catch (e) {
      setError('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    checkBackend().then(ok => { if (ok) fetchAll(); else setLoading(false); });
  }, [checkBackend, fetchAll]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const runPipeline = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/pipeline/run?hours=24&limit=10&num_variants=3`, { method: 'POST' });
      if (res.ok) {
        await fetchAll();
      }
    } catch {
      setError('Pipeline run failed');
    } finally {
      setRunning(false);
    }
  }, [fetchAll]);

  const markViewed = useCallback(async (id: number) => {
    try {
      await fetch(`${BACKEND_URL}/pipeline/opportunities/${id}/view`, { method: 'POST' });
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, viewed: 1 } : o));
      setStats(prev => prev ? { ...prev, unseen_opportunities: Math.max(0, prev.unseen_opportunities - 1) } : prev);
    } catch { /* ignore */ }
  }, []);

  const dismiss = useCallback(async (id: number) => {
    try {
      await fetch(`${BACKEND_URL}/pipeline/opportunities/${id}/dismiss`, { method: 'POST' });
      setOpportunities(prev => prev.filter(o => o.id !== id));
      setStats(prev => prev ? { ...prev, unseen_opportunities: Math.max(0, prev.unseen_opportunities - 1) } : prev);
    } catch { /* ignore */ }
  }, []);

  const regenerate = useCallback(async (genomeId: string) => {
    try {
      await fetch(`${BACKEND_URL}/pipeline/genomes/${genomeId}/regenerate?num_variants=3`, { method: 'POST' });
      await fetchAll();
    } catch { /* ignore */ }
  }, [fetchAll]);

  const copyContent = useCallback(async (opp: Opportunity) => {
    try {
      await navigator.clipboard.writeText(opp.content);
      setCopyStatus(opp.id);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch { /* ignore */ }
  }, []);

  const publishOpportunity = useCallback(async (opp: Opportunity) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/feedback/published?opportunity_id=${opp.id}&genome_id=${opp.genome_id}&variant_type=${opp.variant_type}&score=${opp.score}&platform=twitter`,
        { method: 'POST' }
      );
      if (res.ok) {
        const data = await res.json();
        setOpportunities(prev => prev.map(o =>
          o.id === opp.id ? { ...o, published: true, feedback_id: data.id } : o
        ));
      }
    } catch { /* ignore */ }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (backendStatus === 'offline') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-4xl">🧬</span>
        <h2 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Backend Offline</h2>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Start the SGOS backend to use the Viral Pipeline</p>
        <button
          onClick={checkBackend}
          className="px-4 py-2 rounded text-[11px] font-bold"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <StatsBar stats={stats} onRefresh={fetchAll} />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['opportunities', 'genomes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: activeTab === tab ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {tab === 'opportunities' ? `🔥 Drafts (${opportunities.length})` : `🧬 Genomes (${genomes.length})`}
              </button>
            ))}
          </div>

          {/* Filter (opportunities only) */}
          {activeTab === 'opportunities' && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['unseen', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-2 py-1 text-[9px] font-bold uppercase transition-all"
                  style={{
                    background: filter === f ? 'var(--bg-tertiary)' : 'transparent',
                    color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Run Pipeline button */}
          <button
            onClick={runPipeline}
            disabled={running}
            className="ml-auto px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: running ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: running ? 'var(--text-muted)' : '#000',
              cursor: running ? 'wait' : 'pointer',
            }}
          >
            {running ? '⏳ Running...' : '▶ Run Pipeline'}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded text-[10px]" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-[12px] animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading pipeline...</span>
          </div>
        ) : activeTab === 'opportunities' ? (
          <div className="flex flex-col gap-3">
            {/* Hook distribution chart */}
            {stats?.hook_distribution && Object.keys(stats.hook_distribution).length > 0 && (
              <HookDistribution distribution={stats.hook_distribution} />
            )}

            {opportunities.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-3xl mb-3 block">🔥</span>
                <p className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {filter === 'unseen' ? 'All caught up!' : 'No opportunities yet'}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {filter === 'unseen'
                    ? 'Run the pipeline to find new viral opportunities'
                    : 'The pipeline auto-runs after each ingestion'}
                </p>
              </div>
            ) : (
              opportunities.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  expanded={expandedId === opp.id}
                  onToggle={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                  onView={() => markViewed(opp.id)}
                  onDismiss={() => dismiss(opp.id)}
                  onCopy={() => copyContent(opp)}
                  onRegenerate={() => regenerate(opp.genome_id)}
                  onPublish={() => publishOpportunity(opp)}
                  onGenerate={(p) => onGenerate?.(p)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {genomes.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-3xl mb-3 block">🧬</span>
                <p className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>No genomes extracted yet</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Run the pipeline to extract viral DNA from outliers</p>
              </div>
            ) : (
              genomes.map(g => <GenomeCard key={g.post_id} genome={g} />)
            )}
          </div>
        )}
      </div>

      {/* Copy toast */}
      {copyStatus !== null && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2 rounded-lg text-[11px] font-bold z-50 transition-all"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
}
