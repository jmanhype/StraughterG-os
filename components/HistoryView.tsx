'use client';

import { useState } from 'react';
import { Session } from '@/lib/sessionStore';

interface HistoryViewProps {
  sessions: Session[];
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function HistoryView({ sessions, onSwitchSession, onDeleteSession }: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = sessions.filter(s => {
    // Hide empty sessions with no messages
    if (s.messages.length === 0) return false;
    return s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()));
  });

  const clearAll = () => {
    if (confirm('Delete all sessions? This cannot be undone.')) {
      sessions.forEach(s => onDeleteSession(s.id));
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            History
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {sessions.length} sessions
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            className="px-3 py-1.5 rounded text-[11px] outline-none w-48"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          {sessions.length > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded text-[10px] uppercase font-bold transition-all"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--danger)' }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <div className="text-3xl mb-3">📜</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {sessions.length === 0 ? 'No sessions yet' : 'No matches found'}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {sessions.length === 0 ? 'Start a conversation in the Content Engine' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {filtered.map(session => {
              const isExpanded = expanded === session.id;
              return (
                <div
                  key={session.id}
                  className="rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isExpanded ? 'var(--accent-dim)' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {session.messages.length} messages
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(session.updatedAt)}
                        </span>
                        {session.workspace && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{
                            background: 'var(--accent-dim)', color: 'var(--accent)',
                          }}>
                            {session.workspace.model.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSwitchSession(session.id); }}
                        className="text-[10px] px-2 py-1 rounded transition-all"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', cursor: 'pointer' }}
                      >
                        Open
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                        className="text-[10px] opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      {session.messages.slice(0, 20).map((msg, i) => (
                        <div key={i} className="pt-2">
                          <span className="text-[9px] uppercase font-bold" style={{
                            color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {msg.role === 'user' ? 'You' : 'SGOS'}
                          </span>
                          <p className="text-[11px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                            {msg.content.slice(0, 500)}
                            {msg.content.length > 500 ? '...' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
