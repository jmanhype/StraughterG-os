'use client';

import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:8420';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Creator {
  handle: string;
  platform: string;
  niche: string;
  followed_at: string;
}

interface CreatorStats {
  handle: string;
  total_posts: number;
  avg_score: number;
  top_score: number;
  total_comments: number;
  outlier_count: number;
}

interface CreatorPost {
  id: string;
  title: string;
  content: string;
  url: string;
  score: number;
  z_score: number;
  comment_count?: number;
  created_at: string;
  platform: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  creator_handle?: string;
}

interface CreatorViewProps {
  onGenerate?: (topic: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreatorView({ onGenerate }: CreatorViewProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, CreatorStats>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<'creators' | 'follow' | 'alerts'>('creators');
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [creatorPosts, setCreatorPosts] = useState<Record<string, CreatorPost[]>>({});
  const [postsLoading, setPostsLoading] = useState<Record<string, boolean>>({});

  // Follow form state
  const [followHandle, setFollowHandle] = useState('');
  const [followPlatform, setFollowPlatform] = useState('twitter');
  const [followNiche, setFollowNiche] = useState('');
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [followError, setFollowError] = useState('');
  const [followSuccess, setFollowSuccess] = useState('');

  // ─── Backend check ──────────────────────────────────────────────────────────

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

  // ─── Fetch data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [creatorsRes, statsRes, alertsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/creators`),
        fetch(`${BACKEND_URL}/creators/stats`),
        fetch(`${BACKEND_URL}/alerts`),
      ]);
      if (creatorsRes.ok) {
        const data = await creatorsRes.json();
        setCreators(Array.isArray(data) ? data : data.creators || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        // Could be array or object map
        if (Array.isArray(data)) {
          const map: Record<string, CreatorStats> = {};
          data.forEach((s: CreatorStats) => { map[s.handle] = s; });
          setStatsMap(map);
        } else {
          setStatsMap(data);
        }
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(Array.isArray(data) ? data : data.alerts || []);
      }
    } catch (e) {
      console.error('Failed to fetch creator data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch posts for a creator ───────────────────────────────────────────────

  const fetchCreatorPosts = useCallback(async (handle: string) => {
    setPostsLoading(prev => ({ ...prev, [handle]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/creators/${handle}/posts`);
      if (res.ok) {
        const data = await res.json();
        setCreatorPosts(prev => ({ ...prev, [handle]: Array.isArray(data) ? data : data.posts || [] }));
      }
    } catch (e) {
      console.error(`Failed to fetch posts for ${handle}:`, e);
    } finally {
      setPostsLoading(prev => ({ ...prev, [handle]: false }));
    }
  }, []);

  // ─── Expand/collapse creator ─────────────────────────────────────────────────

  const toggleCreator = (handle: string) => {
    if (expandedCreator === handle) {
      setExpandedCreator(null);
    } else {
      setExpandedCreator(handle);
      if (!creatorPosts[handle]) {
        fetchCreatorPosts(handle);
      }
    }
  };

  // ─── Follow creator ──────────────────────────────────────────────────────────

  const handleFollow = async () => {
    if (!followHandle.trim()) {
      setFollowError('Handle is required');
      return;
    }
    setFollowSubmitting(true);
    setFollowError('');
    setFollowSuccess('');
    try {
      const params = new URLSearchParams({
        handle: followHandle.trim(),
        platform: followPlatform,
        niche: followNiche.trim() || 'general',
      });
      const res = await fetch(`${BACKEND_URL}/creators/follow?${params}`, { method: 'POST' });
      if (res.ok) {
        setFollowSuccess(`Now following @${followHandle.trim()} on ${followPlatform}`);
        setFollowHandle('');
        setFollowNiche('');
        setTimeout(() => {
          fetchData();
          setFollowSuccess('');
          setActiveTab('creators');
        }, 1500);
      } else {
        const errData = await res.json().catch(() => null);
        setFollowError(errData?.detail || `Failed to follow (HTTP ${res.status})`);
      }
    } catch (e) {
      setFollowError('Network error. Is the backend running?');
    } finally {
      setFollowSubmitting(false);
    }
  };

  // ─── Unfollow creator ────────────────────────────────────────────────────────

  const handleUnfollow = async (handle: string, platform: string) => {
    try {
      const params = new URLSearchParams({ handle, platform });
      const res = await fetch(`${BACKEND_URL}/creators/unfollow?${params}`, { method: 'DELETE' });
      if (res.ok) {
        setCreators(prev => prev.filter(c => !(c.handle === handle && c.platform === platform)));
        if (expandedCreator === handle) setExpandedCreator(null);
      }
    } catch (e) {
      console.error('Unfollow failed:', e);
    }
  };

  // ─── Mark alert as read ──────────────────────────────────────────────────────

  const markAlertRead = async (alertId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/alerts/${alertId}/read`, { method: 'POST' });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
      }
    } catch (e) {
      console.error('Mark alert read failed:', e);
    }
  };

  const markAllAlertsRead = async () => {
    const unread = alerts.filter(a => !a.read);
    await Promise.all(unread.map(a => markAlertRead(a.id)));
  };

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkBackend().then(ok => { if (ok) fetchData(); else setLoading(false); });
  }, [checkBackend, fetchData]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x': return '𝕏';
      case 'youtube': return '▶️';
      case 'tiktok': return '🎵';
      case 'instagram': return '📷';
      case 'reddit': return '🔴';
      case 'substack': return '📝';
      case 'linkedin': return '💼';
      default: return '📄';
    }
  };

  const getPlatformBorderColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x': return '#1d9bf0';
      case 'youtube': return '#ff0000';
      case 'tiktok': return '#ff0050';
      case 'instagram': return '#e1306c';
      case 'reddit': return '#ff4500';
      case 'substack': return '#ff6719';
      case 'linkedin': return '#0a66c2';
      default: return 'var(--accent)';
    }
  };

  const unreadAlertCount = alerts.filter(a => !a.read).length;

  // ─── Render: Backend offline ─────────────────────────────────────────────────

  if (backendStatus === 'offline' && !loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Creator Intel
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
              The SGOS backend is not running. Start it with:
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

  // ─── Render: Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">👁️</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading creator intel...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Main ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full pulse-green" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Creator Intel
          </span>
          {creators.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {creators.length} tracked
            </span>
          )}
          {unreadAlertCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
              {unreadAlertCount} alert{unreadAlertCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-2">
        {([
          { key: 'creators', label: '👥 Creators' },
          { key: 'follow', label: '➕ Follow' },
          { key: 'alerts', label: `🔔 Alerts${unreadAlertCount > 0 ? ` (${unreadAlertCount})` : ''}` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--accent-dim)' : 'transparent'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* ─── CREATORS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'creators' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {creators.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">👤</div>
                <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>No creators tracked yet</p>
                <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
                  Follow creators to monitor their content performance.
                </p>
                <button
                  onClick={() => setActiveTab('follow')}
                  className="px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  ➕ Follow a Creator
                </button>
              </div>
            ) : (
              creators.map(creator => {
                const stats = statsMap[creator.handle];
                const isExpanded = expandedCreator === creator.handle;
                const posts = creatorPosts[creator.handle];
                const isLoadingPosts = postsLoading[creator.handle];
                const borderColor = getPlatformBorderColor(creator.platform);

                return (
                  <div key={`${creator.handle}-${creator.platform}`}>
                    {/* Creator card */}
                    <div
                      className="p-4 rounded-lg transition-all cursor-pointer"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${borderColor}`,
                      }}
                      onClick={() => toggleCreator(creator.handle)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getPlatformIcon(creator.platform)}</span>
                          <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            @{creator.handle}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-muted)',
                          }}>
                            {creator.platform}
                          </span>
                          {creator.niche && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                              background: 'var(--accent-dim)',
                              color: 'var(--accent)',
                            }}>
                              {creator.niche}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {/* Stats row */}
                      {stats && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Posts:</span>
                            <span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                              {stats.total_posts || 0}
                            </span>
                          </div>
                          {stats.avg_score > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg:</span>
                              <span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                                {stats.avg_score?.toFixed(0)}
                              </span>
                            </div>
                          )}
                          {stats.top_score > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Top:</span>
                              <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                                {stats.top_score?.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {stats.total_comments > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>💬</span>
                              <span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                                {stats.total_comments?.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {stats.outlier_count > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{
                                background: '#7f1d1d',
                                color: '#fca5a5',
                              }}>
                                🔥 {stats.outlier_count} outlier{stats.outlier_count > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unfollow button */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Following since {formatTimeSince(creator.followed_at)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnfollow(creator.handle, creator.platform);
                          }}
                          className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                          style={{
                            background: 'transparent',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            opacity: 0.7,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--danger)'; }}
                        >
                          ✕ Unfollow
                        </button>
                      </div>
                    </div>

                    {/* Expanded posts */}
                    {isExpanded && (
                      <div className="ml-4 mt-2 space-y-2">
                        {isLoadingPosts ? (
                          <div className="text-center py-4">
                            <p className="text-[11px] animate-pulse" style={{ color: 'var(--text-muted)' }}>
                              Loading posts...
                            </p>
                          </div>
                        ) : posts && posts.length > 0 ? (
                          posts.map((post, i) => (
                            <div
                              key={post.id || i}
                              className="p-3 rounded-lg"
                              style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                borderLeft: `2px solid ${getZScoreColor(post.z_score || 0)}`,
                              }}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {(post.z_score && post.z_score >= 1.5) && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{
                                      background: post.z_score >= 3.0 ? '#7f1d1d' : post.z_score >= 2.0 ? '#78350f' : '#713f12',
                                      color: getZScoreColor(post.z_score),
                                    }}>
                                      z={post.z_score.toFixed(1)}
                                    </span>
                                  )}
                                  {post.score != null && (
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                      ⬆️ {post.score.toLocaleString()}
                                    </span>
                                  )}
                                  {post.comment_count != null && (
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                      💬 {post.comment_count.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                  {formatTimeSince(post.created_at)}
                                </span>
                              </div>

                              {post.url ? (
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[12px] font-bold leading-tight hover:underline block mb-1"
                                  style={{ color: 'var(--text-primary)' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {post.title}
                                </a>
                              ) : (
                                <p className="text-[12px] font-bold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                                  {post.title}
                                </p>
                              )}

                              {post.content && (
                                <p className="text-[11px] leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                  {post.content.slice(0, 200)}
                                  {post.content.length > 200 ? '...' : ''}
                                </p>
                              )}

                              {onGenerate && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerate(post.title);
                                  }}
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
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              No posts tracked yet for this creator.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── FOLLOW TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'follow' && (
          <div className="max-w-lg mx-auto">
            <div className="p-5 rounded-lg" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
            }}>
              <h3 className="text-[12px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                Follow a New Creator
              </h3>

              <div className="space-y-3">
                {/* Handle input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Handle *
                  </label>
                  <input
                    type="text"
                    value={followHandle}
                    onChange={e => setFollowHandle(e.target.value)}
                    placeholder="@creator_handle"
                    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  />
                </div>

                {/* Platform dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Platform
                  </label>
                  <select
                    value={followPlatform}
                    onChange={e => setFollowPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    <option value="twitter">𝕏 Twitter/X</option>
                    <option value="youtube">▶️ YouTube</option>
                    <option value="tiktok">🎵 TikTok</option>
                    <option value="instagram">📷 Instagram</option>
                    <option value="reddit">🔴 Reddit</option>
                    <option value="substack">📝 Substack</option>
                    <option value="linkedin">💼 LinkedIn</option>
                  </select>
                </div>

                {/* Niche input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Niche / Topic
                  </label>
                  <input
                    type="text"
                    value={followNiche}
                    onChange={e => setFollowNiche(e.target.value)}
                    placeholder="e.g. AI, crypto, fitness..."
                    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  />
                </div>

                {/* Error / Success messages */}
                {followError && (
                  <div className="px-3 py-2 rounded text-[11px]" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                    ⚠️ {followError}
                  </div>
                )}
                {followSuccess && (
                  <div className="px-3 py-2 rounded text-[11px]" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    ✅ {followSuccess}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleFollow}
                  disabled={followSubmitting || !followHandle.trim()}
                  className="w-full px-4 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: followSubmitting || !followHandle.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
                    color: followSubmitting || !followHandle.trim() ? 'var(--text-muted)' : '#000',
                    opacity: followSubmitting || !followHandle.trim() ? 0.6 : 1,
                  }}
                >
                  {followSubmitting ? '⏳ Following...' : '➕ Follow Creator'}
                </button>
              </div>
            </div>

            {/* Quick add suggestions */}
            <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Tips
              </p>
              <ul className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <li>• Use the exact handle (without @) for best results</li>
                <li>• Niche helps the system categorize and score content</li>
                <li>• Posts will appear after the next ingestion cycle</li>
                <li>• Outliers (high z-score) indicate viral/breakout content</li>
              </ul>
            </div>
          </div>
        )}

        {/* ─── ALERTS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="max-w-2xl mx-auto">
            {/* Mark all read button */}
            {unreadAlertCount > 0 && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={markAllAlertsRead}
                  className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  ✓ Mark All Read
                </button>
              </div>
            )}

            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">🔔</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No alerts yet. Alerts will appear when tracked creators post outliers.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg transition-all"
                    style={{
                      background: alert.read ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${alert.read ? 'var(--border)' : 'var(--accent)'}`,
                      opacity: alert.read ? 0.7 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        {!alert.read && (
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{
                              background: alert.read ? 'var(--bg-tertiary)' : 'var(--accent-dim)',
                              color: alert.read ? 'var(--text-muted)' : 'var(--accent)',
                            }}>
                              {alert.type || 'alert'}
                            </span>
                            {alert.creator_handle && (
                              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                @{alert.creator_handle}
                              </span>
                            )}
                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                              {formatTimeSince(alert.created_at)}
                            </span>
                          </div>
                          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      {!alert.read && (
                        <button
                          onClick={() => markAlertRead(alert.id)}
                          className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ml-2"
                          style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          ✓ Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
