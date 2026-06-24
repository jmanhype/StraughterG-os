'use client';

import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:8420';

interface Outlier {
  id: string;
  platform: string;
  platform_id: string;
  subreddit: string;
  title: string;
  content: string;
  author: string;
  url: string;
  score: number;
  comment_count: number;
  z_score: number;
  created_at: string;
}

interface Trend {
  topic: string;
  count: number;
  posts: number;
}

interface BriefData {
  brief: string;
  outliers: Outlier[];
  trends: Trend[];
  generated_at: string;
}

interface StatsData {
  total_posts: number;
  platforms: Record<string, number>;
  subreddits: Record<string, number>;
  last_ingest: string;
  outliers_24h: number;
}

interface ResearchFeedProps {
  onGenerate?: (topic: string) => void;
}

export default function ResearchFeed({ onGenerate }: ResearchFeedProps) {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<'outliers' | 'trends' | 'brief'>('outliers');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Check backend health
  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setBackendStatus('online');
        return true;
      }
    } catch {
      setBackendStatus('offline');
      return false;
    }
  }, []);

  // Fetch brief + stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [briefRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/brief`),
        fetch(`${BACKEND_URL}/stats`),
      ]);
      if (briefRes.ok) setBrief(await briefRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error('Failed to fetch research data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger manual ingestion
  const triggerIngest = useCallback(async () => {
    setIngesting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ingest/sync`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Ingestion failed:', e);
    } finally {
      setIngesting(false);
    }
  }, [fetchData]);

  useEffect(() => {
    checkBackend().then(ok => { if (ok) fetchData(); else setLoading(false); });
  }, [checkBackend, fetchData]);

  const formatTimeSince = (isoString: string) => {
    if (!isoString) return 'never';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getZScoreColor = (z: number) => {
    if (z >= 3.0) return '#ff4444';
    if (z >= 2.0) return '#ff8800';
    if (z >= 1.5) return '#ffcc00';
    return 'var(--text-muted)';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'hackernews': return '🟧';
      case 'reddit': return '🔴';
      case 'twitter': return '🐦';
      default: return '📄';
    }
  };

  const getPlatformLabel = (subreddit: string, platform: string) => {
    if (platform === 'hackernews') return subreddit === 'frontpage' ? 'HN Top' : 'HN Best';
    if (platform === 'reddit') return `r/${subreddit}`;
    return platform;
  };

  // Backend offline state
  if (backendStatus === 'offline' && !loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Research Feed
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">📡</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Backend Offline
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              The SGOS research engine is not running. Start it with:
            </p>
            <code className="block px-4 py-3 rounded text-xs font-mono text-left mb-4" style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--accent)',
            }}>
              cd ~/sgos-backend && bash start.sh
            </code>
            <button
              onClick={checkBackend}
              className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">📡</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading research feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full pulse-green" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Research Feed
          </span>
          {stats && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {stats.total_posts} posts · {stats.outliers_24h} outliers
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats?.last_ingest && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Last: {formatTimeSince(stats.last_ingest)}
            </span>
          )}
          <button
            onClick={triggerIngest}
            disabled={ingesting}
            className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: ingesting ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: ingesting ? 'var(--text-muted)' : '#000',
              opacity: ingesting ? 0.6 : 1,
            }}
          >
            {ingesting ? '⏳ Ingesting...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-2">
        {(['outliers', 'trends', 'brief'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === tab ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab ? 'var(--accent-dim)' : 'transparent'}`,
            }}
          >
            {tab === 'outliers' ? '🔥 Outliers' : tab === 'trends' ? '📈 Trends' : '📋 Brief'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* OUTLIERS TAB */}
        {activeTab === 'outliers' && brief?.outliers && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {/* Platform Filter */}
            <div className="flex gap-1 mb-2">
              {([
                { key: 'all', label: 'All', icon: '📊' },
                { key: 'reddit', label: 'Reddit', icon: '🔴' },
                { key: 'twitter', label: 'Twitter', icon: '🐦' },
                { key: 'hackernews', label: 'HN', icon: '🟧' },
                { key: 'youtube', label: 'YouTube', icon: '▶️' },
                { key: 'web', label: 'Web', icon: '🌐' },
              ] as const).map(f => {
                const count = f.key === 'all' 
                  ? brief.outliers.length 
                  : brief.outliers.filter(p => p.platform === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setPlatformFilter(f.key)}
                    className="px-2 py-1 rounded text-[10px] font-bold transition-all"
                    style={{
                      background: platformFilter === f.key ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                      color: platformFilter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${platformFilter === f.key ? 'var(--accent-dim)' : 'var(--border)'}`,
                      opacity: count === 0 && f.key !== 'all' ? 0.4 : 1,
                    }}
                  >
                    {f.icon} {f.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                  </button>
                );
              })}
            </div>

            {brief.outliers.filter(p => platformFilter === 'all' || p.platform === platformFilter).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No outliers detected yet. Run ingestion to find viral content.
                </p>
              </div>
            ) : (
              brief.outliers.filter(p => platformFilter === 'all' || p.platform === platformFilter).map((post, i) => (
                <div
                  key={post.id}
                  className="p-4 rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${getZScoreColor(post.z_score)}`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getPlatformIcon(post.platform)}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }}>
                        {getPlatformLabel(post.subreddit, post.platform)}
                      </span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: getZScoreColor(post.z_score) }}>
                        z={post.z_score.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      #{i + 1}
                    </span>
                  </div>

                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-bold leading-tight hover:underline block mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {post.title}
                  </a>

                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>⬆️ {post.score.toLocaleString()}</span>
                    <span>💬 {post.comment_count.toLocaleString()}</span>
                    <span>by {post.author}</span>
                    <span>{formatTimeSince(post.created_at)}</span>
                  </div>

                  {/* Generate button */}
                  {onGenerate && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onGenerate(post.title)}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent-dim)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      >
                        ⚡ Write About This
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${BACKEND_URL}/repurpose?post_id=${post.id}`, { method: 'POST' });
                            if (res.ok) {
                              const data = await res.json();
                              if (onGenerate) onGenerate(data.prompt);
                            }
                          } catch (e) {
                            console.error('Repurpose failed:', e);
                          }
                        }}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        🔄 Repurpose (5 formats)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TRENDS TAB */}
        {activeTab === 'trends' && brief?.trends && (
          <div className="max-w-2xl mx-auto">
            {brief.trends.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No trending topics yet. Need more data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {brief.trends.map((trend, i) => {
                  const maxCount = brief.trends[0]?.count || 1;
                  const width = Math.max(20, (trend.count / maxCount) * 100);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-[11px] font-bold w-6 text-right" style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                            {trend.topic}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {trend.count} mentions
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${width}%`,
                              background: `linear-gradient(90deg, var(--accent), var(--accent-dim))`,
                            }}
                          />
                        </div>
                      </div>
                      {onGenerate && (
                        <button
                          onClick={() => onGenerate(trend.topic)}
                          className="px-2 py-1 rounded text-[9px] font-bold transition-all"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                        >
                          ✍️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BRIEF TAB */}
        {activeTab === 'brief' && brief?.brief && (
          <div className="max-w-2xl mx-auto">
            <div className="p-5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-sans" style={{ color: 'var(--text-primary)' }}>
                {brief.brief}
              </pre>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Generated: {formatTimeSince(brief.generated_at)}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(brief.brief)}
                className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                📋 Copy Brief
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
