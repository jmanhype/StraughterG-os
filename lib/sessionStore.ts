import { Message, WorkspaceState } from './types';

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  workspace: WorkspaceState | null;
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = 'sgos-sessions';
const ACTIVE_SESSION_KEY = 'sgos-active-session';

export function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createSession(): Session {
  return {
    id: Date.now().toString(),
    title: 'New Session',
    messages: [],
    workspace: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateSession(sessions: Session[], sessionId: string, updates: Partial<Session>): Session[] {
  return sessions.map(s =>
    s.id === sessionId ? { ...s, ...updates, updatedAt: Date.now() } : s
  );
}

export function deleteSession(sessions: Session[], sessionId: string): Session[] {
  return sessions.filter(s => s.id !== sessionId);
}
