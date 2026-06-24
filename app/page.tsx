'use client';

import React, { useCallback, useEffect, useState } from 'react';
import NavSidebar from '@/components/NavSidebar';
import ChatPanel from '@/components/ChatPanel';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import ProjectsView from '@/components/ProjectsView';
import StyleGuideView from '@/components/StyleGuideView';
import HistoryView from '@/components/HistoryView';
import SettingsView from '@/components/SettingsView';
import ResearchFeed from '@/components/ResearchFeed';
import CreatorView from '@/components/CreatorView';
import VoiceView from '@/components/VoiceView';
import CarouselView from '@/components/CarouselView';
import TranscribeView from '@/components/TranscribeView';
import SearchView from '@/components/SearchView';
import BoardsView from '@/components/BoardsView';
import PipelineDashboard from '@/components/PipelineDashboard';
import HomeView from '@/components/HomeView';
import { NavErrorBoundary } from '@/components/NavErrorBoundary';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useChatStore } from '@/hooks/useChatStore';

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeNav, setActiveNav] = useState('home');

  // Session & workspace state
  const sessionStore = useSessionStore();
  const {
    sessions, activeSessionId, workspace,
    persistSession, handleNewSession, handleSwitchSession,
    handleDeleteSession, handleWorkspaceChange, setLatestScores: setSessionScores,
  } = sessionStore;

  // Chat state
  const chatStore = useChatStore({
    activeSessionId,
    workspace,
    onNewSession: handleNewSession,
    persistSession,
  });
  const {
    messages, setMessages, isLoading, latestScores,
    pendingFiles, pendingTemplate, streamingContent, fileInputRef,
    handleFileSelect, removeFile, sendMessage, handleAction,
    handleRetry, insertTemplate, consumeTemplate,
  } = chatStore;

  // Wire session switching → chat messages
  const onSwitchSession = useCallback((sessionId: string) => {
    const msgs = handleSwitchSession(sessionId);
    if (msgs) setMessages(msgs);
    setLatestScores(null);
    setActiveNav('agents');
  }, [handleSwitchSession, setMessages]);

  const onDeleteSession = useCallback((sessionId: string) => {
    const result = handleDeleteSession(sessionId, activeSessionId);
    if (result) setMessages(result.messages);
  }, [handleDeleteSession, activeSessionId, setMessages]);

  const onNewSession = useCallback(() => {
    handleNewSession();
    setMessages([]);
    setLatestScores(null);
    setActiveNav('agents');
  }, [handleNewSession, setMessages]);

  const clearChat = useCallback(() => {
    onNewSession();
  }, [onNewSession]);

  const onWorkspaceChange = useCallback((ws: typeof workspace) => {
    handleWorkspaceChange(ws, activeSessionId, messages);
  }, [handleWorkspaceChange, activeSessionId, messages]);

  const goToChatWithTemplate = useCallback((template: string) => {
    if (activeNav !== 'agents') setActiveNav('agents');
    insertTemplate(template);
  }, [activeNav, insertTemplate]);

  // Keyboard shortcuts
  useEffect(() => {
    const templates = [
      'Generate 5 viral hook variations about [TOPIC]. Each hook should: create a curiosity gap, lead with the most shocking fact, use numbers not words, and be under 280 characters. Format as a numbered list.',
      'Build a 6-post thread about [TOPIC]. Structure: 1/ Hook with shocking fact, 2/ Context and problem, 3-5/ Core insights with examples, 6/ CTA. Use short sentences, one idea per line, em dashes for pauses.',
      'Create a listicle post: "X things about [TOPIC] that [audience] needs to know". Use numbered format (1/ 2/ 3/), each point 1-2 lines. Lead with the most valuable insight. End with a sharp closer.',
      'Generate 3 strategic reply angles to a viral tweet about [TOPIC]: (1) Value Add - expand with unique data, (2) Respectful Contrarian - disagree with evidence, (3) Synthesizer - condense into punchy bullets. Each reply 1-3 sentences.',
      'Create 5 high-converting call-to-action variations for [PRODUCT/SERVICE]. Use urgency, social proof, and clear benefits. Format: direct, question-based, FOMO-driven, value-first, and contrarian. Each under 100 characters.',
      'Write a post that connects [TRENDING TOPIC] to [YOUR NICHE]. Formula: reference the trend → pivot to your angle → deliver unexpected insight → close with provocative statement. Make it feel timely but evergreen.',
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (templates[idx]) goToChatWithTemplate(templates[idx]);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onNewSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToChatWithTemplate, onNewSession]);

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
              onRetry={handleRetry}
              onFileSelect={handleFileSelect}
              onRemoveFile={removeFile}
              pendingFiles={pendingFiles}
              pendingTemplate={pendingTemplate}
              onTemplateConsumed={consumeTemplate}
              fileInputRef={fileInputRef}
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewSession={onNewSession}
              onSwitchSession={onSwitchSession}
              onDeleteSession={onDeleteSession}
              streamingContent={streamingContent}
            />
            <WorkspaceSidebar
              workspace={workspace}
              onWorkspaceChange={onWorkspaceChange}
              scores={latestScores}
              onAction={handleAction}
              onInsertTemplate={insertTemplate}
              isLoading={isLoading}
            />
          </>
        );
      case 'projects':
        return <ProjectsView sessions={sessions} onSwitchSession={onSwitchSession} onNewSession={onNewSession} />;
      case 'style':
        return <StyleGuideView />;
      case 'history':
        return <HistoryView sessions={sessions} onSwitchSession={onSwitchSession} onDeleteSession={onDeleteSession} />;
      case 'settings':
        return <SettingsView />;
      case 'research':
        return <ResearchFeed onGenerate={(topic) => goToChatWithTemplate(`Write a thread about ${topic}. Use the outlier data to inform the angle.`)} />;
      case 'creators':
        return <CreatorView onGenerate={(topic) => goToChatWithTemplate(`Write about: ${topic}. Use the same energy and angle as the original post.`)} />;
      case 'voice':
        return <VoiceView onGenerate={(topic) => goToChatWithTemplate(topic)} onSelectVoice={(name) => { sessionStore.setWorkspace({ ...workspace, voiceProfile: name }); setActiveNav('agents'); }} />;
      case 'carousel':
        return <CarouselView onGenerate={(topic) => goToChatWithTemplate(topic)} />;
      case 'transcribe':
        return <TranscribeView onGenerate={(topic) => goToChatWithTemplate(topic)} />;
      case 'search':
        return <SearchView onGenerate={(topic) => goToChatWithTemplate(`Write a thread about ${topic}. Reference the outlier data and add your unique angle.`)} onSavePost={() => {}} />;
      case 'boards':
        return <BoardsView onGenerate={(topic) => goToChatWithTemplate(`Write about: ${topic}`)} />;
      case 'pipeline':
        return <PipelineDashboard onGenerate={(prompt) => goToChatWithTemplate(prompt)} />;
      case 'home':
      default:
        return <HomeView onNavigate={setActiveNav} messageCount={messages.length} sessionCount={sessions.length} onNewSession={onNewSession} onInsertTemplate={insertTemplate} />;
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
        <NavErrorBoundary>
          {renderMainContent()}
        </NavErrorBoundary>
      </main>
    </div>
  );
}
