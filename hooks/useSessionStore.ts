'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Session, loadSessions, saveSessions, createSession, updateSession, deleteSession, getActiveSessionId, setActiveSessionId } from '@/lib/sessionStore';
import { WorkspaceState } from '@/lib/types';

const DEFAULT_WORKSPACE: WorkspaceState = {
  model: 'qwen-latest-series-invite-beta-v34',
  temperature: 0.7,
  platform: 'twitter',
  format: 'post',
  length: 'medium',
  tone: 'casual',
};

export function useSessionStore() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSession] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>(DEFAULT_WORKSPACE);
  const sessionsRef = useRef<Session[]>([]);
  const workspaceRef = useRef<WorkspaceState>(workspace);

  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);

  // Load sessions on mount
  useEffect(() => {
    const loaded = loadSessions();
    const activeId = getActiveSessionId();
    if (loaded.length > 0) {
      setSessions(loaded);
      const active = activeId ? loaded.find(s => s.id === activeId) : loaded[0];
      if (active) {
        setActiveSession(active.id);
        setActiveSessionId(active.id);
        if (active.workspace) setWorkspace(active.workspace);
      }
    }
  }, []);

  const persistSession = useCallback((sessionId: string, updatedMessages: any[], ws?: WorkspaceState) => {
    const currentWorkspace = ws || workspaceRef.current;
    setSessions(prev => {
      const title = updatedMessages.find((m: any) => m.role === 'user')?.content.slice(0, 60) || 'New Session';
      const existing = prev.find(s => s.id === sessionId);
      const currentTitle = existing?.title;
      const finalTitle = (!currentTitle || currentTitle === 'New Session') ? title : currentTitle;
      const updated = prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: updatedMessages, workspace: currentWorkspace, title: finalTitle, updatedAt: Date.now() }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, []);

  const handleNewSession = useCallback(() => {
    const newSession = createSession();
    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveSession(newSession.id);
    setActiveSessionId(newSession.id);
    setWorkspace(DEFAULT_WORKSPACE);
    return newSession.id;
  }, []);

  const handleSwitchSession = useCallback((sessionId: string): any[] | null => {
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (!session) return null;
    setActiveSession(sessionId);
    setActiveSessionId(sessionId);
    if (session.workspace) setWorkspace(session.workspace);
    else setWorkspace(DEFAULT_WORKSPACE);
    return session.messages || [];
  }, []);

  const handleDeleteSession = useCallback((sessionId: string, currentActiveId: string | null): { messages: any[]; workspace: WorkspaceState } | null => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (currentActiveId === sessionId) {
      const remaining = sessionsRef.current.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        setActiveSession(remaining[0].id);
        setActiveSessionId(remaining[0].id);
        if (remaining[0].workspace) setWorkspace(remaining[0].workspace);
        else setWorkspace(DEFAULT_WORKSPACE);
        return { messages: remaining[0].messages || [], workspace: remaining[0].workspace || DEFAULT_WORKSPACE };
      } else {
        setActiveSession(null);
        setWorkspace(DEFAULT_WORKSPACE);
        return { messages: [], workspace: DEFAULT_WORKSPACE };
      }
    }
    return null;
  }, []);

  const handleWorkspaceChange = useCallback((ws: WorkspaceState, sessionId: string | null, messages: any[]) => {
    setWorkspace(ws);
    if (sessionId) {
      persistSession(sessionId, messages, ws);
    }
  }, [persistSession]);

  return {
    sessions,
    activeSessionId,
    workspace,
    sessionsRef,
    persistSession,
    handleNewSession,
    handleSwitchSession,
    handleDeleteSession,
    handleWorkspaceChange,
    setWorkspace,
    DEFAULT_WORKSPACE,
  };
}
