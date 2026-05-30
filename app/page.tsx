'use client';

import { useState, useCallback } from 'react';
import { Message, WorkspaceState, ViralScores } from '@/lib/types';
import NavSidebar from '@/components/NavSidebar';
import ChatPanel from '@/components/ChatPanel';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import ProjectsView from '@/components/ProjectsView';
import StyleGuideView from '@/components/StyleGuideView';
import HistoryView from '@/components/HistoryView';
import SettingsView from '@/components/SettingsView';

const DEFAULT_WORKSPACE: WorkspaceState = {
  model: 'qwen-latest-series-invite-beta-v34',
  temperature: 0.7,
  platform: 'twitter',
  format: 'post',
  length: 'medium',
  tone: 'casual',
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceState>(DEFAULT_WORKSPACE);
  const [isLoading, setIsLoading] = useState(false);
  const [latestScores, setLatestScores] = useState<ViralScores | null>(null);
  const [activeNav, setActiveNav] = useState('home');

  const sendMessage = useCallback(async (content: string, action?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = action ? messages : [...messages, userMessage];
    if (!action) {
      setMessages(prev => [...prev, userMessage]);
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          workspace,
          action,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        scores: data.scores || undefined,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (data.scores) {
        setLatestScores(data.scores);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**ERROR:** ${error.message}\n\nCheck your API key in .env.local and restart the dev server.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, workspace]);

  const handleAction = useCallback((action: string) => {
    if (messages.length === 0) return;
    setIsLoading(true);
    sendMessage('', action);
  }, [messages, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setLatestScores(null);
  }, []);

  // Chat view (agents tab) includes the workspace sidebar
  const isChatView = activeNav === 'agents' || activeNav === 'generate';

  const renderMainContent = () => {
    switch (activeNav) {
      case 'agents':
      case 'generate':
        return (
          <>
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              onAction={handleAction}
            />
            <WorkspaceSidebar
              workspace={workspace}
              onWorkspaceChange={setWorkspace}
              scores={latestScores}
              onAction={handleAction}
              isLoading={isLoading}
            />
          </>
        );
      case 'projects':
        return <ProjectsView />;
      case 'style':
        return <StyleGuideView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      case 'home':
      default:
        return <HomeView onNavigate={setActiveNav} messageCount={messages.length} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <NavSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onClearChat={clearChat}
        messageCount={messages.length}
      />
      <main className="flex flex-1 overflow-hidden">
        {renderMainContent()}
      </main>
    </div>
  );
}

// ===== HOME DASHBOARD =====
function HomeView({ onNavigate, messageCount }: { onNavigate: (nav: string) => void; messageCount: number }) {
  const cards = [
    {
      id: 'agents',
      icon: '⚡',
      title: 'Content Engine',
      desc: 'Generate viral posts, threads, hooks, and reply angles with multi-model AI.',
      badge: messageCount > 0 ? `${messageCount} msgs` : null,
    },
    {
      id: 'projects',
      icon: '📁',
      title: 'Projects',
      desc: 'Organize content campaigns, track drafts, and manage publishing status.',
      badge: null,
    },
    {
      id: 'style',
      icon: '🎨',
      title: 'Style Guide',
      desc: 'Your writing rules, tone engine, hook formulas, and content pillars.',
      badge: null,
    },
    {
      id: 'history',
      icon: '📜',
      title: 'History',
      desc: 'Browse past conversations, search outputs, and reuse generated content.',
      badge: null,
    },
    {
      id: 'settings',
      icon: '⚙',
      title: 'Settings',
      desc: 'API keys, model configuration, defaults, and preferences.',
      badge: null,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
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
      </div>

      {/* Dashboard */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
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

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="text-left p-5 rounded-lg transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-dim)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{card.icon}</span>
                  {card.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                    }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {card.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Quick Start */}
          <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Quick Start
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Generate hooks about AI agents', nav: 'agents' },
                { label: 'Write a thread about VAOS', nav: 'agents' },
                { label: 'Create a new project', nav: 'projects' },
                { label: 'Review your style guide', nav: 'style' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(item.nav)}
                  className="text-left px-3 py-2 rounded text-[11px] transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
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
