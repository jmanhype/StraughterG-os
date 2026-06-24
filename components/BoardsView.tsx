'use client';

import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:8420';

interface Board {
  id: number;
  name: string;
  description: string;
  color: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

interface SavedPost {
  id: number;
  board_id: number;
  post_id: string;
  platform: string;
  title: string;
  content: string;
  url: string;
  author: string;
  score: number;
  z_score: number;
  note: string;
  saved_at: string;
}

interface BoardDetail extends Board {
  posts: SavedPost[];
}

interface BoardsViewProps {
  onGenerate?: (topic: string) => void;
}

export default function BoardsView({ onGenerate }: BoardsViewProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<'boards' | 'create'>('boards');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#00ff88');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

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

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/boards`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
      }
    } catch (e) {
      console.error('Failed to fetch boards:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBoardDetail = useCallback(async (boardId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/boards/${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBoard(data);
      }
    } catch (e) {
      console.error('Failed to fetch board:', e);
    }
  }, []);

  useEffect(() => {
    checkBackend().then(ok => { if (ok) fetchBoards(); else setLoading(false); });
  }, [checkBackend, fetchBoards]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      setCreateError('Board name is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const params = new URLSearchParams({ name: newName, description: newDesc, color: newColor });
      const res = await fetch(`${BACKEND_URL}/boards?${params}`, { method: 'POST' });
      if (res.ok) {
        setNewName('');
        setNewDesc('');
        setNewColor('#00ff88');
        setActiveTab('boards');
        await fetchBoards();
      } else {
        const err = await res.json();
        setCreateError(err.detail || 'Failed to create board');
      }
    } catch (e) {
      setCreateError('Network error');
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, newColor, fetchBoards]);

  const handleDelete = useCallback(async (boardId: number) => {
    if (!confirm('Delete this board and all saved posts?')) return;
    try {
      await fetch(`${BACKEND_URL}/boards/${boardId}`, { method: 'DELETE' });
      setSelectedBoard(null);
      await fetchBoards();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }, [fetchBoards]);

  const handleRemovePost = useCallback(async (boardId: number, postId: string) => {
    try {
      await fetch(`${BACKEND_URL}/boards/${boardId}/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      await fetchBoardDetail(boardId);
    } catch (e) {
      console.error('Remove failed:', e);
    }
  }, [fetchBoardDetail]);

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

  // Backend offline
  if (backendStatus === 'offline' && !loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Boards
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">📌</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Backend Offline</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Start the SGOS backend to use boards.</p>
            <code className="block px-4 py-3 rounded text-xs font-mono text-left mb-4" style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--accent)',
            }}>
              cd ~/sgos-backend && bash start.sh
            </code>
            <button onClick={checkBackend} className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider"
              style={{ background: 'var(--accent)', color: '#000' }}>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Board detail view
  if (selectedBoard) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedBoard(null)} className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
              ← Back
            </button>
            <div className="w-3 h-3 rounded-full" style={{ background: selectedBoard.color }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              {selectedBoard.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {selectedBoard.posts?.length || 0} posts
            </span>
          </div>
          <button onClick={() => handleDelete(selectedBoard.id)} className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'transparent', color: 'var(--danger, #ff4444)', border: '1px solid var(--danger, #ff4444)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger, #ff4444)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--danger, #ff4444)'; }}>
            🗑 Delete Board
          </button>
        </div>

        {selectedBoard.description && (
          <div className="px-6 pt-3">
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{selectedBoard.description}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3 max-w-3xl mx-auto">
            {!selectedBoard.posts || selectedBoard.posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No posts saved yet. Use the Search or Research Feed to save posts here.
                </p>
              </div>
            ) : (
              selectedBoard.posts.map((post) => (
                <div key={post.id} className="p-4 rounded-lg transition-all" style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${getZScoreColor(post.z_score)}`,
                }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getPlatformIcon(post.platform)}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider" style={{
                        background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                      }}>
                        {post.platform}
                      </span>
                      {post.z_score > 0 && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{
                          background: `${getZScoreColor(post.z_score)}22`,
                          color: getZScoreColor(post.z_score),
                        }}>
                          z={post.z_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Saved {formatTimeSince(post.saved_at)}
                      </span>
                      <button onClick={() => handleRemovePost(selectedBoard.id, post.post_id)}
                        className="text-[9px] px-2 py-1 rounded transition-all"
                        style={{ color: 'var(--text-muted)', background: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger, #ff4444)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        ✕ Remove
                      </button>
                    </div>
                  </div>

                  <a href={post.url} target="_blank" rel="noopener noreferrer"
                    className="text-[13px] font-bold leading-tight hover:underline block mb-2"
                    style={{ color: 'var(--text-primary)' }}>
                    {post.title}
                  </a>

                  {post.content && (
                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                      {post.content.substring(0, 200)}{post.content.length > 200 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>⬆️ {post.score?.toLocaleString() || 0}</span>
                    {post.author && <span>by {post.author}</span>}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {onGenerate && (
                      <button onClick={() => onGenerate(post.title)}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}>
                        ⚡ Write About This
                      </button>
                    )}
                    {post.url && (
                      <a href={post.url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        ↗ Source
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">📌</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading boards...</p>
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
            Boards
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            {boards.length} collections
          </span>
        </div>
        <button onClick={() => fetchBoards()} className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-2">
        {(['boards', 'create'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === tab ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab ? 'var(--accent-dim)' : 'transparent'}`,
            }}>
            {tab === 'boards' ? '📌 My Boards' : '+ New Board'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* BOARDS LIST */}
        {activeTab === 'boards' && (
          <div className="max-w-2xl mx-auto">
            {boards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">📌</div>
                <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>No boards yet</p>
                <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
                  Create a board to save posts for later research and inspiration.
                </p>
                <button onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--accent)', color: '#000' }}>
                  + Create First Board
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {boards.map(board => (
                  <button key={board.id} onClick={() => fetchBoardDetail(board.id)}
                    className="text-left p-5 rounded-lg transition-all"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = board.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: board.color }} />
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {board.name}
                      </span>
                    </div>
                    {board.description && (
                      <p className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {board.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span>{board.post_count} posts</span>
                      <span>Updated {formatTimeSince(board.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE BOARD */}
        {activeTab === 'create' && (
          <div className="max-w-md mx-auto">
            <div className="p-5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Create New Board
              </h3>

              {createError && (
                <div className="mb-3 px-3 py-2 rounded text-[11px]" style={{
                  background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)',
                }}>
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Board Name *
                  </label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Swipe File, AI Trends, Competitor Intel"
                    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: 'inherit' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Description
                  </label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="What's this board for?"
                    rows={2}
                    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all resize-none"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: 'inherit' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer" style={{ border: 'none', background: 'transparent' }} />
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{newColor}</span>
                  </div>
                </div>

                <button onClick={handleCreate} disabled={creating}
                  className="w-full px-4 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: creating ? 'var(--bg-tertiary)' : 'var(--accent)', color: creating ? 'var(--text-muted)' : '#000', opacity: creating ? 0.6 : 1 }}>
                  {creating ? '⏳ Creating...' : '+ Create Board'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
