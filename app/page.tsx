'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Message, WorkspaceState, ViralScores, FileAttachment } from '@/lib/types';
import { Session, loadSessions, saveSessions, createSession, updateSession, deleteSession, getActiveSessionId, setActiveSessionId } from '@/lib/sessionStore';
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSession] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>(DEFAULT_WORKSPACE);
  const [isLoading, setIsLoading] = useState(false);
  const [latestScores, setLatestScores] = useState<ViralScores | null>(null);
  const [activeNav, setActiveNav] = useState('home');
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const loaded = loadSessions();
    const activeId = getActiveSessionId();
    if (loaded.length > 0) {
      setSessions(loaded);
      const active = activeId ? loaded.find(s => s.id === activeId) : loaded[0];
      if (active) {
        setActiveSession(active.id);
        if (active.workspace) setWorkspace(active.workspace);
      }
    }
  }, []);

  // Get current session messages
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const messages = currentSession?.messages || [];

  // Save session whenever it changes
  const saveCurrentSession = useCallback((updatedMessages: Message[], updatedWorkspace?: WorkspaceState) => {
    if (!activeSessionId) return;
    const title = updatedMessages.find(m => m.role === 'user')?.content.slice(0, 60) || 'New Session';
    const updated = updateSession(sessions, activeSessionId, {
      messages: updatedMessages,
      workspace: updatedWorkspace || workspace,
      title: currentSession?.title === 'New Session' ? title : currentSession?.title || title,
    });
    setSessions(updated);
    saveSessions(updated);
  }, [sessions, activeSessionId, workspace, currentSession]);

  const handleNewSession = useCallback(() => {
    const newSession = createSession();
    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    setActiveSession(newSession.id);
    setActiveSessionId(newSession.id);
    setWorkspace(DEFAULT_WORKSPACE);
    setLatestScores(null);
    setActiveNav('agents');
  }, [sessions]);

  const handleSwitchSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    setActiveSessionId(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session?.workspace) setWorkspace(session.workspace);
    setLatestScores(null);
    setActiveNav('agents');
  }, [sessions]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    const updated = deleteSession(sessions, sessionId);
    setSessions(updated);
    saveSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSession(updated[0].id);
        setActiveSessionId(updated[0].id);
        if (updated[0].workspace) setWorkspace(updated[0].workspace);
      } else {
        setActiveSession(null);
        setWorkspace(DEFAULT_WORKSPACE);
      }
    }
  }, [sessions, activeSessionId]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const attachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') ||
        ['.txt', '.md', '.csv', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.sh', '.bash', '.zsh', '.env', '.log', '.sql'].some(ext => file.name.endsWith(ext));

      if (isImage) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachments.push({ name: file.name, type: 'image', content: dataUrl, size: file.size });
      } else if (isText) {
        const text = await file.text();
        attachments.push({ name: file.name, type: 'text', content: text, size: file.size });
      } else {
        alert(`${file.name}: unsupported file type`);
      }
    }

    setPendingFiles(prev => [...prev, ...attachments]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async (content: string, action?: string) => {
    // Build the message content with file attachments
    let fullContent = content;
    const attachments = [...pendingFiles];

    if (attachments.length > 0 && !action) {
      const textFiles = attachments.filter(a => a.type === 'text');
      if (textFiles.length > 0) {
        const fileContext = textFiles.map(f => `[FILE: ${f.name}]\n${f.content}\n[/FILE]`).join('\n\n');
        fullContent = `${content}\n\n---\n\n${fileContext}`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = action ? messages : [...messages, userMessage];
    if (!action) {
      saveCurrentSession(updatedMessages);
    }
    setIsLoading(true);
    setPendingFiles([]);

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

      const finalMessages = [...updatedMessages, assistantMessage];
      saveCurrentSession(finalMessages);
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
      const finalMessages = [...updatedMessages, errorMessage];
      saveCurrentSession(finalMessages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, workspace, pendingFiles, saveCurrentSession]);

  const handleAction = useCallback((action: string) => {
    if (messages.length === 0) return;
    setIsLoading(true);
    sendMessage('', action);
  }, [messages, sendMessage]);

  const clearChat = useCallback(() => {
    handleNewSession();
  }, [handleNewSession]);

  const insertTemplate = useCallback((template: string) => {
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    if (input) {
      input.focus();
      input.value = template;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // Keyboard shortcuts for templates (Cmd+1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const templateIndex = parseInt(e.key) - 1;
        const templates = [
          'Generate 5 viral hook variations about [TOPIC]. Each hook should: create a curiosity gap, lead with the most shocking fact, use numbers not words, and be under 280 characters. Format as a numbered list.',
          'Build a 6-post thread about [TOPIC]. Structure: 1/ Hook with shocking fact, 2/ Context and problem, 3-5/ Core insights with examples, 6/ CTA. Use short sentences, one idea per line, em dashes for pauses.',
          'Create a listicle post: "X things about [TOPIC] that [audience] needs to know". Use numbered format (1/ 2/ 3/), each point 1-2 lines. Lead with the most valuable insight. End with a sharp closer.',
          'Generate 3 strategic reply angles to a viral tweet about [TOPIC]: (1) Value Add - expand with unique data, (2) Respectful Contrarian - disagree with evidence, (3) Synthesizer - condense into punchy bullets. Each reply 1-3 sentences.',
          'Create 5 high-converting call-to-action variations for [PRODUCT/SERVICE]. Use urgency, social proof, and clear benefits. Format: direct, question-based, FOMO-driven, value-first, and contrarian. Each under 100 characters.',
          'Write a post that connects [TRENDING TOPIC] to [YOUR NICHE]. Formula: reference the trend → pivot to your angle → deliver unexpected insight → close with provocative statement. Make it feel timely but evergreen.',
        ];
        if (templates[templateIndex]) {
          insertTemplate(templates[templateIndex]);
        }
      }
      // Cmd+N for new session
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insertTemplate, handleNewSession]);

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
              onFileSelect={handleFileSelect}
              onRemoveFile={removeFile}
              pendingFiles={pendingFiles}
              fileInputRef={fileInputRef}
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewSession={handleNewSession}
              onSwitchSession={handleSwitchSession}
              onDeleteSession={handleDeleteSession}
            />
            <WorkspaceSidebar
              workspace={workspace}
              onWorkspaceChange={(ws) => {
                setWorkspace(ws);
                if (activeSessionId) {
                  const updated = updateSession(sessions, activeSessionId, { workspace: ws });
                  setSessions(updated);
                  saveSessions(updated);
                }
              }}
              scores={latestScores}
              onAction={handleAction}
              onInsertTemplate={insertTemplate}
              isLoading={isLoading}
            />
          </>
        );
      case 'projects':
        return <ProjectsView />;
      case 'style':
        return <StyleGuideView />;
      case 'history':
        return (
          <HistoryView
            sessions={sessions}
            onSwitchSession={handleSwitchSession}
            onDeleteSession={handleDeleteSession}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'home':
      default:
        return <HomeView onNavigate={setActiveNav} messageCount={messages.length} sessionCount={sessions.length} onNewSession={handleNewSession} />;
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
function HomeView({ onNavigate, messageCount, sessionCount, onNewSession }: { onNavigate: (nav: string) => void; messageCount: number; sessionCount: number; onNewSession: () => void }) {
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
      badge: sessionCount > 0 ? `${sessionCount} sessions` : null,
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
        <button
          onClick={onNewSession}
          className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
          style={{ background: 'var(--accent)', color: '#000', border: 'none' }}
        >
          + New Session
        </button>
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
