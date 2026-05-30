'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({ messages, isLoading, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
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
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Code blocks
      if (line.startsWith('```')) {
        return null; // handled separately
      }
      // Bold
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold" style={{ color: 'var(--text-primary)' }}>{line.slice(2, -2)}</p>;
      }
      // Headers
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ color: 'var(--accent)' }}>{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</h3>;
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return <p key={i} className="pl-3 border-l-2" style={{ borderColor: 'var(--accent-dim)', color: 'var(--text-secondary)' }}>{line.slice(2)}</p>;
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Regular text with inline code
      const parts = line.split(/(`[^`]+`)/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={j} className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}>{part.slice(1, -1)}</code>;
            }
            // Bold inline
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
            <div className="px-3 py-1 text-[10px] uppercase" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {lang}
            </div>
          )}
          <pre className="p-3 overflow-x-auto text-[11px]" style={{ background: 'var(--bg-secondary)', margin: 0 }}>
            <code>{code}</code>
          </pre>
        </div>
      );
    });
  };

  // Strip code blocks from main content for separate rendering
  const contentWithoutCode = (content: string) => content.replace(/```[\s\S]*?```/g, '').trim();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full pulse-green" style={{ background: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Content Engine
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            ACTIVE
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
              KAIZE OS — Content Engine
            </h2>
            <p className="text-xs text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
              Generate viral content, hooks, threads, and reply angles.
              <br />Type a topic or paste a tweet to get started.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm w-full">
              {[
                'Generate 5 hooks about AI agents',
                'Write a thread about Claude Code',
                'Create a POV hook about freelancing',
                'Break down this news: [paste]',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="text-left p-3 rounded text-[11px] transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-dim)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 animate-slide-in ${msg.role === 'user' ? 'ml-auto max-w-[80%]' : 'max-w-[90%]'}`}
          >
            {/* Role label */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{
                color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {msg.role === 'user' ? '→ You' : '← KAIZE OS'}
              </span>
              {msg.scores && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                  background: msg.scores.viralScore >= 80 ? 'var(--accent-dim)' : msg.scores.viralScore >= 60 ? '#78350f' : '#7f1d1d',
                  color: msg.scores.viralScore >= 80 ? 'var(--accent)' : msg.scores.viralScore >= 60 ? '#fbbf24' : '#fca5a5',
                }}>
                  SCORE: {msg.scores.viralScore}/100
                </span>
              )}
            </div>

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
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-4 animate-slide-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                ← KAIZE OS
              </span>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>generating...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter topic, paste a tweet, or type a command..."
              className="w-full resize-none rounded-lg px-4 py-3 text-[13px] outline-none"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                minHeight: '44px',
                maxHeight: '120px',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-[44px] px-5 rounded-lg font-semibold text-[12px] uppercase tracking-wider transition-all"
            style={{
              background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: input.trim() && !isLoading ? '#000' : 'var(--text-muted)',
              border: 'none',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !isLoading ? 1 : 0.5,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
