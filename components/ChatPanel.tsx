'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, FileAttachment } from '@/lib/types';
import { Session } from '@/lib/sessionStore';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onAction?: (action: string) => void;
  onFileSelect?: (files: FileList | null) => void;
  onRemoveFile?: (index: number) => void;
  pendingFiles?: FileAttachment[];
  fileInputRef?: React.RefObject<HTMLInputElement>;
  sessions?: Session[];
  activeSessionId?: string | null;
  onNewSession?: () => void;
  onSwitchSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  onSendMessage,
  onAction,
  onFileSelect,
  onRemoveFile,
  pendingFiles = [],
  fileInputRef,
  sessions = [],
  activeSessionId,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('```')) {
        return null;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold" style={{ color: 'var(--text-primary)' }}>{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ color: 'var(--accent)' }}>{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</h3>;
      }
      if (line.startsWith('> ')) {
        return <p key={i} className="pl-3 border-l-2" style={{ borderColor: 'var(--accent-dim)', color: 'var(--text-secondary)' }}>{line.slice(2)}</p>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      const parts = line.split(/(`[^`]+`)/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={j} className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}>{part.slice(1, -1)}</code>;
            }
            const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
            return boldParts.map((bp, k) => {
              if (bp.startsWith('**') && bp.endsWith('**')) {
                return <strong key={`${j}-${k}`} style={{ color: 'var(--text-primary)' }}>{bp.slice(2, -2)}</strong>;
              }
              return <span key={`${j}-${k}`}>{bp}</span>;
            });
          })}
        </p>
      );
    });
  };

  const renderCodeBlocks = (content: string) => {
    const blocks = content.match(/```[\s\S]*?```/g);
    if (!blocks) return null;
    return blocks.map((block, i) => {
      const code = block.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      const lang = block.match(/```(\w+)/)?.[1] || '';
      return (
        <div key={i} className="my-2 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {lang && (
            <div className="px-3 py-1 text-[10px] uppercase font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {lang}
            </div>
          )}
          <pre className="p-3 text-[11px] overflow-x-auto" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            <code>{code}</code>
          </pre>
        </div>
      );
    });
  };

  const contentWithoutCode = (content: string) => {
    return content.replace(/```[\s\S]*?```/g, '').trim();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Session Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
            {activeSession?.title || 'New Session'}
          </span>
          {messages.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {messages.length} msgs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewSession}
            className="px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
            style={{ background: 'var(--accent)', color: '#000', border: 'none' }}
            title="New Session (Cmd+N)"
          >
            + New
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="px-2 py-1 rounded text-[10px] transition-all"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              History ▼
            </button>
            {showSessions && recentSessions.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-lg overflow-hidden z-50" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Recent Sessions</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentSessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-opacity-50 transition-all"
                      style={{
                        background: session.id === activeSessionId ? 'var(--bg-tertiary)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        onSwitchSession?.(session.id);
                        setShowSessions(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {session.title}
                        </div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                          {session.messages.length} msgs • {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {onDeleteSession && session.id !== activeSessionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="ml-2 text-[10px] opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <div className="text-4xl mb-4">⚡</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Start a new conversation</p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>Ask for hooks, threads, or content ideas</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] space-y-2">
              <div className="text-[9px] uppercase font-bold mb-1" style={{ color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)' }}>
                {msg.role === 'user' ? 'You' : 'SGOS'}
              </div>

              {/* File Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="space-y-1 mb-2">
                  {msg.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px]" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                      <span>{att.type === 'image' ? '🖼' : '📄'}</span>
                      <span className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{att.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatFileSize(att.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              <div
                className="chat-message p-4 rounded-lg text-[13px] leading-relaxed"
                style={{
                  background: msg.role === 'user' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--border)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}
              >
                {formatContent(contentWithoutCode(msg.content))}
                {renderCodeBlocks(msg.content)}
              </div>

              {/* Story Metrics */}
              {msg.role === 'assistant' && msg.scores && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Story Score</span>
                        <span className="text-[12px] font-bold" style={{ color: (msg.scores.storyScore ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.storyScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {msg.scores.storyScore ?? '—'}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                        <div className="h-full rounded-full" style={{ width: `${msg.scores.storyScore ?? 0}%`, background: (msg.scores.storyScore ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.storyScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Emotional Arc</span>
                        <span className="text-[12px] font-bold" style={{ color: (msg.scores.emotionalArc ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.emotionalArc ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {msg.scores.emotionalArc ?? '—'}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                        <div className="h-full rounded-full" style={{ width: `${msg.scores.emotionalArc ?? 0}%`, background: (msg.scores.emotionalArc ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.emotionalArc ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Retention</span>
                        <span className="text-[12px] font-bold" style={{ color: (msg.scores.retention ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.retention ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {msg.scores.retention ?? '—'}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                        <div className="h-full rounded-full" style={{ width: `${msg.scores.retention ?? 0}%`, background: (msg.scores.retention ?? 0) >= 80 ? 'var(--accent)' : (msg.scores.retention ?? 0) >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    {['Rewrite', 'Expand', 'Shorten', 'Formalize', 'Casualize'].map(action => (
                      <button
                        key={action}
                        onClick={() => onAction?.(action.toLowerCase())}
                        disabled={isLoading}
                        className="flex-1 py-1.5 rounded text-[10px] uppercase font-semibold tracking-wider transition-all"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Sources */}
              {msg.role === 'assistant' && msg.research && msg.research.sources.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <details>
                    <summary className="text-[10px] uppercase font-bold tracking-wider cursor-pointer" style={{ color: 'var(--accent)' }}>
                      📚 Research Sources ({msg.research.sources.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {msg.research.facts.slice(0, 5).map((fact, i) => (
                        <div key={i} className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <p className="mb-1">{fact.claim}</p>
                          <a 
                            href={fact.source} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] underline hover:no-underline"
                            style={{ color: 'var(--accent)' }}
                          >
                            {fact.source}
                          </a>
                        </div>
                      ))}
                      {msg.research.sources.length > 5 && (
                        <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                          + {msg.research.sources.length - 5} more sources
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="text-[9px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>SGOS</div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-[10px]" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                <span>{file.type === 'image' ? '🖼' : '📄'}</span>
                <span className="truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>
                <button
                  onClick={() => onRemoveFile?.(i)}
                  className="ml-1 opacity-60 hover:opacity-100"
                  style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh,.bash,.zsh,.env,.log,.sql,image/*"
            onChange={(e) => onFileSelect?.(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef?.current?.click()}
            className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Attach file"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter topic, paste a tweet, or type a command..."
            className="flex-1 resize-none outline-none text-[13px] leading-relaxed py-2"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              padding: '8px 12px',
              minHeight: '40px',
              maxHeight: '120px',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            rows={1}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 h-8 px-4 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: input.trim() && !isLoading ? '#000' : 'var(--text-muted)',
              border: 'none',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
