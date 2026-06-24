'use client';

import React from 'react';

interface HomeViewProps {
  onNavigate: (nav: string) => void;
  messageCount: number;
  sessionCount: number;
  onNewSession: () => void;
  onInsertTemplate: (template: string) => void;
}

export default function HomeView({ onNavigate, messageCount, sessionCount, onNewSession, onInsertTemplate }: HomeViewProps) {
  const cards = [
    { id: 'research', icon: '📡', title: 'Research Feed', desc: 'Outlier detection, trending topics, and daily content briefs from HN + Reddit.', badge: 'LIVE' },
    { id: 'agents', icon: '⚡', title: 'Content Engine', desc: 'Generate viral posts, threads, hooks, and reply angles with multi-model AI.', badge: messageCount > 0 ? `${messageCount} msgs` : null },
    { id: 'projects', icon: '📁', title: 'Projects', desc: 'Organize content campaigns, track drafts, and manage publishing status.', badge: null },
    { id: 'search', icon: '🔍', title: 'Search', desc: 'Full-text and semantic search across all ingested Reddit + HN posts.', badge: null },
    { id: 'creators', icon: '👤', title: 'Creator Intel', desc: 'Track creators across platforms, monitor performance, and get alerts on viral content.', badge: null },
    { id: 'boards', icon: '📌', title: 'Boards', desc: 'Save posts into curated collections for research, swipe files, and inspiration.', badge: null },
    { id: 'voice', icon: '🎙', title: 'Voice Profile', desc: 'Train your AI writing voice from examples. Tone, cadence, vocabulary, and structure.', badge: null },
    { id: 'style', icon: '🎨', title: 'Style Guide', desc: 'Your writing rules, tone engine, hook formulas, and content pillars.', badge: null },
    { id: 'history', icon: '📜', title: 'History', desc: 'Browse past conversations, search outputs, and reuse generated content.', badge: sessionCount > 0 ? `${sessionCount} sessions` : null },
    { id: 'settings', icon: '⚙', title: 'Settings', desc: 'API keys, model configuration, defaults, and preferences.', badge: null },
  ];

  const quickStarts = [
    { label: 'Generate hooks about AI agents', nav: 'agents', template: 'Generate 5 viral hook variations about AI agents. Each hook should: create a curiosity gap, lead with the most shocking fact, use numbers not words, and be under 280 characters.' },
    { label: 'Write a thread about VAOS', nav: 'agents', template: 'Build a 6-post thread about VAOS (Verified Autonomous Operating System). Structure: 1/ Hook with shocking fact about agent survival, 2/ Context and problem, 3-5/ Core insights with architecture examples, 6/ CTA. Use short sentences.' },
    { label: 'Create a new project', nav: 'projects', template: '' },
    { label: 'Review your style guide', nav: 'style', template: '' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full pulse-green" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            StraughterG OS
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            v1.0
          </span>
        </div>
        <button
          onClick={onNewSession}
          className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
          style={{ background: 'var(--accent)', color: '#000', border: 'none' }}
        >
          + New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              StraughterG OS
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              AI content engine built by a systems engineer, for systems engineers.
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              not a chatbot — a system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="text-left p-5 rounded-lg transition-all"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{card.icon}</span>
                  {card.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Quick Start
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickStarts.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onNavigate(item.nav);
                    if (item.template) setTimeout(() => onInsertTemplate(item.template), 200);
                  }}
                  className="text-left px-3 py-2 rounded text-[11px] transition-all"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
