'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8420';

interface Post {
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
  ingested_at: string;
}

interface Board {
  id: number;
  name: string;
  color: string;
  post_count: number;
}

interface SearchViewProps {
  onGenerate?: (topic: string) => void;
  onSavePost?: (post: any) => void;
}

type SearchMode = 'keyword' | 'semantic' | 'hybrid';
type Platform = 'all' | 'reddit' | 'hackernews';

export default function SearchView({ onGenerate, onSavePost }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<Platform>('all');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Record<string, Post[]>>({});
  const [loadingRelated, setLoadingRelated] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Board save state
  const [boards, setBoards] = useState<Board[]>([]);
  const [savingToBoard, setSavingToBoard] = useState<string | null>(null); // post id being saved
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef<string>('');

  // Debounced auto-search: triggers 500ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim() === lastSearchedRef.current) return;
    debounceRef.current = setTimeout(() => {
      lastSearchedRef.current = query.trim();
      performSearch();
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, platform, mode]);

  // Fetch boards on mount
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/boards`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
      }
    } catch {
      // Boards not available, that's fine
    }
  }, []);

  const getZScoreColor = (z: number) => {
    if (z >= 3.0) return '#ff4444';
    if (z >= 2.0) return '#ff8800';
    if (z >= 1.5) return '#ffcc00';
    return 'var(--text-muted)';
  };

  const getZScoreBg = (z: number) => {
    if (z >= 3.0) return 'rgba(255, 68, 68, 0.15)';
    if (z >= 2.0) return 'rgba(255, 136, 0, 0.15)';
    if (z >= 1.5) return 'rgba(255, 204, 0, 0.15)';
    return 'var(--bg-tertiary)';
  };

  const getPlatformIcon = (p: string) => {
    switch (p) {
      case 'hackernews': return '🟧';
      case 'reddit': return '🔴';
      default: return '📄';
    }
  };

  const getPlatformLabel = (subreddit: string, p: string) => {
    if (p === 'hackernews') return subreddit === 'frontpage' ? 'HN TOP' : 'HN BEST';
    if (p === 'reddit') return `R/${subreddit.toUpperCase()}`;
    return p.toUpperCase();
  };

  const formatTimeSince = (isoString: string) => {
    if (!isoString) return 'unknown';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setExpandedId(null);
    setRelatedPosts({});

    const start = performance.now();
    try {
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('limit', '20');
      if (platform !== 'all') params.set('platform', platform);

      const endpoint = mode === 'keyword' ? '/search' : mode === 'hybrid' ? '/search/hybrid' : '/search/similar';
      const url = `${BACKEND_URL}${endpoint}?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Search failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const elapsed = performance.now() - start;
      setSearchTime(elapsed);

      const posts: Post[] = Array.isArray(data) ? data : (data.results || data.posts || []);
      setResults(posts);
    } catch (e: any) {
      setError(e.message || 'Search failed');
      setSearchTime(null);
    } finally {
      setLoading(false);
    }
  }, [query, platform, mode]);

  const fetchRelated = useCallback(async (postId: string) => {
    setLoadingRelated(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/search/related/${postId}`);
      if (!res.ok) throw new Error(`Related fetch failed (${res.status})`);
      const data = await res.json();
      const posts: Post[] = Array.isArray(data) ? data : (data.results || data.posts || []);
      setRelatedPosts(prev => ({ ...prev, [postId]: posts }));
    } catch (e) {
      console.error('Failed to fetch related posts:', e);
    } finally {
      setLoadingRelated(prev => ({ ...prev, [postId]: false }));
    }
  }, []);

  const handleSaveToBoard = useCallback(async (post: Post, boardId: number) => {
    setSaveStatus(prev => ({ ...prev, [post.id]: 'saving' }));
    setSaveError(null);
    try {
      const params = new URLSearchParams({
        post_id: post.id,
        platform: post.platform,
        title: post.title,
        content: post.content || '',
        url: post.url || '',
        author: post.author || '',
        score: String(post.score || 0),
        z_score: String(post.z_score || 0),
      });
      const res = await fetch(`${BACKEND_URL}/boards/${boardId}/posts?${params}`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Save failed (${res.status})`);
      }
      setSaveStatus(prev => ({ ...prev, [post.id]: 'saved' }));
      setSavingToBoard(null);
      if (onSavePost) onSavePost(post);
      // Refresh boards to update counts
      fetchBoards();
    } catch (e: any) {
      setSaveStatus(prev => ({ ...prev, [post.id]: 'error' }));
      setSaveError(e.message);
    }
  }, [onSavePost, fetchBoards]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') performSearch();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            🔍 Search
          </span>
          {searchTime !== null && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {results.length} results · {searchTime.toFixed(0)}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {mode === 'keyword' ? 'FTS5 full-text' : mode === 'hybrid' ? 'Hybrid (FTS5 + TF-IDF)' : 'TF-IDF semantic'}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <form onSubmit={(e) => { e.preventDefault(); performSearch(); }} className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'keyword' ? 'Search posts by keyword...' : 'Semantic search — describe what you\'re looking for...'}
              className="w-full px-4 py-2.5 rounded text-[12px] outline-none transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          {/* Platform Filter */}
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value as Platform)}
            className="px-3 py-2.5 rounded text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <option value="all">All Platforms</option>
            <option value="reddit">Reddit</option>
            <option value="hackernews">Hacker News</option>
            <option value="twitter">Twitter/X</option>
            <option value="youtube">YouTube</option>
          </select>

          {/* Mode Toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMode('keyword')}
              className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: mode === 'keyword' ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                color: mode === 'keyword' ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              FTS
            </button>
            <button
              onClick={() => setMode('semantic')}
              className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: mode === 'semantic' ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                color: mode === 'semantic' ? 'var(--accent)' : 'var(--text-muted)',
                borderLeft: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SEM
            </button>
            <button
              onClick={() => setMode('hybrid')}
              className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: mode === 'hybrid' ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                color: mode === 'hybrid' ? 'var(--accent)' : 'var(--text-muted)',
                borderLeft: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              HYB
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={performSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: loading || !query.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: loading || !query.trim() ? 'var(--text-muted)' : '#000',
              fontFamily: "'JetBrains Mono', monospace",
              opacity: loading || !query.trim() ? 0.6 : 1,
            }}
          >
            {loading ? '⏳' : '→'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="max-w-3xl mx-auto mb-4 p-4 rounded-lg" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)' }}>
            <p className="text-[12px]" style={{ color: '#ff4444' }}>{error}</p>
          </div>
        )}

        {saveError && (
          <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)' }}>
            <p className="text-[11px]" style={{ color: '#ff4444' }}>Save failed: {saveError}</p>
            <button onClick={() => setSaveError(null)} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        )}

        <div className="space-y-3 max-w-3xl mx-auto">
          {loading && (
            <div className="text-center py-12">
              <div className="text-2xl mb-2 animate-pulse">🔍</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Searching {mode === 'keyword' ? 'full-text index' : 'semantic vectors'}...
              </p>
            </div>
          )}

          {!loading && results.length === 0 && searchTime === null && !error && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔎</div>
              <h2 className="text-[14px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Search the Archive
              </h2>
              <p className="text-[12px] mb-1" style={{ color: 'var(--text-muted)' }}>
                {mode === 'keyword'
                  ? 'Use keywords to search post titles and content via FTS5.'
                  : 'Describe a topic or idea to find semantically similar posts via TF-IDF.'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Supports Reddit + Hacker News. {boards.length > 0 ? `${boards.length} boards available for saving.` : ''}
              </p>
            </div>
          )}

          {!loading && results.length === 0 && searchTime !== null && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🫥</div>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Try {mode === 'keyword' ? 'semantic mode' : 'different keywords'} or broaden your platform filter.
              </p>
            </div>
          )}

          {!loading && results.map((post) => {
            const isExpanded = expandedId === post.id;
            const related = relatedPosts[post.id];
            const isLoadingRelated = loadingRelated[post.id];
            const postSaveStatus = saveStatus[post.id] || 'idle';
            const isShowingBoardPicker = savingToBoard === post.id;

            return (
              <div
                key={post.id}
                className="rounded-lg transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${getZScoreColor(post.z_score || 0)}`,
                }}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{getPlatformIcon(post.platform)}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                      >
                        {getPlatformLabel(post.subreddit, post.platform)}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono"
                        style={{ background: getZScoreBg(post.z_score || 0), color: getZScoreColor(post.z_score || 0) }}
                      >
                        Z={(post.z_score || 0).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {formatTimeSince(post.created_at)}
                    </span>
                  </div>

                  {/* Title (clickable to expand) */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : post.id)}
                    className="text-[13px] font-bold leading-tight text-left block mb-2 w-full transition-all"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {isExpanded ? '▾ ' : '▸ '}{post.title}
                  </button>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>⬆️ {post.score.toLocaleString()}</span>
                    <span>💬 {post.comment_count.toLocaleString()}</span>
                    <span>by <span style={{ color: 'var(--text-secondary)' }}>{post.author}</span></span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {/* Save to Board */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (postSaveStatus === 'saved') return;
                          if (isShowingBoardPicker) {
                            setSavingToBoard(null);
                          } else {
                            setSavingToBoard(post.id);
                            fetchBoards(); // refresh
                          }
                        }}
                        disabled={postSaveStatus === 'saving'}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: postSaveStatus === 'saved' ? 'rgba(0,255,136,0.15)' : 'var(--bg-tertiary)',
                          color: postSaveStatus === 'saved' ? 'var(--accent)' : postSaveStatus === 'saving' ? 'var(--text-muted)' : 'var(--text-secondary)',
                          border: `1px solid ${postSaveStatus === 'saved' ? 'var(--accent-dim)' : 'var(--border)'}`,
                          fontFamily: "'JetBrains Mono', monospace",
                          opacity: postSaveStatus === 'saving' ? 0.6 : 1,
                        }}
                        onMouseEnter={e => { if (postSaveStatus === 'idle') { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; } }}
                        onMouseLeave={e => { if (postSaveStatus === 'idle') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        {postSaveStatus === 'saving' ? '⏳ Saving...' : postSaveStatus === 'saved' ? '✓ Saved' : '📌 Save to Board'}
                      </button>

                      {/* Board Picker Dropdown */}
                      {isShowingBoardPicker && (
                        <div
                          className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden"
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            minWidth: '200px',
                          }}
                        >
                          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Save to board
                            </span>
                          </div>
                          {boards.length === 0 ? (
                            <div className="px-3 py-3">
                              <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                                No boards yet.
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                Create one in the Boards view first.
                              </p>
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto">
                              {boards.map(board => (
                                <button
                                  key={board.id}
                                  onClick={() => handleSaveToBoard(post, board.id)}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2 transition-all"
                                  style={{ borderBottom: '1px solid var(--border)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: board.color }} />
                                  <span className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {board.name}
                                  </span>
                                  <span className="text-[9px] ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                    {board.post_count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {onGenerate && (
                      <button
                        onClick={() => onGenerate(post.title)}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent-dim)',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      >
                        ⚡ Write About This
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!related && !isLoadingRelated) fetchRelated(post.id);
                        setExpandedId(post.id);
                      }}
                      className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: related ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${related ? 'var(--accent-dim)' : 'var(--border)'}`,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = related ? 'var(--accent-dim)' : 'var(--border)'; }}
                    >
                      {isLoadingRelated ? '⏳ Loading...' : related ? `🔗 Related (${related.length})` : '🔗 Related Posts'}
                    </button>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          fontFamily: "'JetBrains Mono', monospace",
                          textDecoration: 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        ↗ Source
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t px-4 py-4" style={{ borderColor: 'var(--border)' }}>
                    {/* Full content */}
                    <div className="mb-4">
                      <p
                        className="text-[12px] leading-relaxed whitespace-pre-wrap"
                        style={{
                          color: 'var(--text-secondary)',
                          fontFamily: "'JetBrains Mono', monospace",
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}
                      >
                        {post.content || '(No content available)'}
                      </p>
                    </div>

                    {/* Related Posts */}
                    {related && related.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                          🔗 Related Posts
                        </h4>
                        <div className="space-y-2">
                          {related.map((rel) => (
                            <div
                              key={rel.id}
                              className="p-3 rounded flex items-start gap-2"
                              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                            >
                              <span className="text-xs mt-0.5">{getPlatformIcon(rel.platform)}</span>
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => {
                                    setResults(prev => {
                                      const exists = prev.find(p => p.id === rel.id);
                                      if (exists) return prev;
                                      return [rel, ...prev];
                                    });
                                    setExpandedId(rel.id);
                                  }}
                                  className="text-[11px] font-bold text-left truncate block w-full"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {rel.title}
                                </button>
                                <div className="flex items-center gap-3 text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                  <span>{getPlatformLabel(rel.subreddit, rel.platform)}</span>
                                  <span>⬆️ {rel.score.toLocaleString()}</span>
                                  <span className="font-mono font-bold" style={{ color: getZScoreColor(rel.z_score) }}>
                                    z={rel.z_score.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {related && related.length === 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          No related posts found.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
