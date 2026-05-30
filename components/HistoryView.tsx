'use client';

import { useState, useEffect } from 'react';

interface HistoryEntry {
  id: string;
  date: number;
  firstMessage: string;
  messageCount: number;
  model: string;
  messages: { role: string; content: string }[];
}

const STORAGE_KEY = 'sgos-history';

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(messages: { role: string; content: string }[], model: string) {
  if (typeof window === 'undefined') return;
  const existing = loadHistory();
  const entry: HistoryEntry = {
    id: Date.now().toString(),
    date: Date.now(),
    firstMessage: messages.find(m => m.role === 'user')?.content.slice(0, 80) || 'Empty',
    messageCount: messages.length,
    model,
    messages: messages.slice(0, 20), // cap stored messages
  };
  const updated = [entry, ...existing].slice(0, 100); // keep last 100
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export default function HistoryView() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const filtered = history.filter(h =>
    h.firstMessage.toLowerCase().includes(search.toLowerCase()) ||
    h.model.toLowerCase().includes(search.toLowerCase())
  );

  const deleteEntry = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
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
            {history.length} sessions
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
          {history.length > 0 && (
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
              {history.length === 0 ? 'No history yet' : 'No matches found'}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {history.length === 0 ? 'Conversations are saved automatically' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {filtered.map(entry => {
              const isExpanded = expanded === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isExpanded ? 'var(--accent-dim)' : 'var(--border)'}`,
                  }}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{
                          background: 'var(--accent-dim)', color: 'var(--accent)',
                        }}>
                          {entry.model.split('/').pop()}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {entry.messageCount} messages
                        </span>
                      </div>
                      <p className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.firstMessage}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(entry.date)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }}
                        className="text-[10px] opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      {entry.messages.map((msg, i) => (
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
