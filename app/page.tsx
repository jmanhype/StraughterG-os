'use client';

import { useState, useCallback } from 'react';
import { Message, WorkspaceState, ViralScores } from '@/lib/types';
import NavSidebar from '@/components/NavSidebar';
import ChatPanel from '@/components/ChatPanel';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';

const DEFAULT_WORKSPACE: WorkspaceState = {
  model: 'qwen-latest-series-invite-beta-v34',
  temperature: 0.7,
  platform: 'twitter',
  format: 'post',
  length: 'medium',
  tone: {
    casual: 75,
    witty: 50,
    provocative: 60,
    technical: 40,
  },
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceState>(DEFAULT_WORKSPACE);
  const [isLoading, setIsLoading] = useState(false);
  const [latestScores, setLatestScores] = useState<ViralScores | null>(null);
  const [activeNav, setActiveNav] = useState('generate');

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

  return (
    <div className="flex h-screen overflow-hidden">
      <NavSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onClearChat={clearChat}
        messageCount={messages.length}
      />
      <main className="flex flex-1 overflow-hidden">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
        />
        <WorkspaceSidebar
          workspace={workspace}
          onWorkspaceChange={setWorkspace}
          scores={latestScores}
          onAction={handleAction}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
