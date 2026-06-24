import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '@/hooks/useSessionStore';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  get length() { return Object.keys(mockStorage).length; },
  key: vi.fn((i: number) => Object.keys(mockStorage)[i] || null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('useSessionStore', () => {
  it('initializes with empty sessions and default workspace', () => {
    const { result } = renderHook(() => useSessionStore());
    expect(result.current.sessions).toEqual([]);
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.workspace.model).toBe('qwen-latest-series-invite-beta-v34');
    expect(result.current.workspace.platform).toBe('twitter');
  });

  it('handleNewSession creates a new session and sets it as active', () => {
    const { result } = renderHook(() => useSessionStore());
    let newId: string;
    act(() => {
      newId = result.current.handleNewSession();
    });
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSessionId).toBe(newId!);
    expect(result.current.sessions[0].title).toBe('New Session');
  });

  it('handleNewSession persists to localStorage', () => {
    const { result } = renderHook(() => useSessionStore());
    act(() => {
      result.current.handleNewSession();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'sgos-sessions',
      expect.any(String)
    );
  });

  it('handleSwitchSession changes active session and returns messages', () => {
    const { result } = renderHook(() => useSessionStore());
    let sessionId: string;
    act(() => {
      sessionId = result.current.handleNewSession();
    });

    // Create second session
    let secondId: string;
    act(() => {
      secondId = result.current.handleNewSession();
    });
    expect(result.current.activeSessionId).toBe(secondId!);

    // Switch back to first
    let msgs: any;
    act(() => {
      msgs = result.current.handleSwitchSession(sessionId!);
    });
    expect(result.current.activeSessionId).toBe(sessionId!);
    expect(msgs).toEqual([]);
  });

  it('handleSwitchSession returns null for nonexistent session', () => {
    const { result } = renderHook(() => useSessionStore());
    let msgs: any;
    act(() => {
      msgs = result.current.handleSwitchSession('nonexistent-id');
    });
    expect(msgs).toBeNull();
  });

  it('handleDeleteSession removes session and switches to remaining', () => {
    const { result } = renderHook(() => useSessionStore());
    let id1: string, id2: string;
    act(() => { id1 = result.current.handleNewSession(); });
    act(() => { id2 = result.current.handleNewSession(); });

    // Active is id2; delete it
    let switchResult: any;
    act(() => {
      switchResult = result.current.handleDeleteSession(id2!, id2!);
    });
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSessionId).toBe(id1!);
    expect(switchResult).toBeTruthy();
  });

  it('handleDeleteSession returns null when deleting non-active session', () => {
    const { result } = renderHook(() => useSessionStore());
    let id1: string, id2: string;
    act(() => { id1 = result.current.handleNewSession(); });
    act(() => { id2 = result.current.handleNewSession(); });

    // Active is id2; delete id1
    let switchResult: any;
    act(() => {
      switchResult = result.current.handleDeleteSession(id1!, id2!);
    });
    expect(switchResult).toBeNull();
    expect(result.current.activeSessionId).toBe(id2!);
    expect(result.current.sessions).toHaveLength(1);
  });

  it('persistSession updates session messages and title', () => {
    const { result } = renderHook(() => useSessionStore());
    let sessionId: string;
    act(() => { sessionId = result.current.handleNewSession(); });

    act(() => {
      result.current.persistSession(sessionId!, [
        { id: 'm1', role: 'user', content: 'Hello world test', timestamp: Date.now() },
      ]);
    });

    expect(result.current.sessions[0].messages).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe('Hello world test');
  });

  it('loads sessions from localStorage on mount', () => {
    const savedSessions = [
      { id: 'saved-1', title: 'Saved Session', messages: [], workspace: null, createdAt: 100, updatedAt: 100 },
    ];
    mockStorage['sgos-sessions'] = JSON.stringify(savedSessions);
    mockStorage['sgos-active-session'] = 'saved-1';

    const { result } = renderHook(() => useSessionStore());
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe('Saved Session');
    expect(result.current.activeSessionId).toBe('saved-1');
  });

  it('handleWorkspaceChange updates workspace and persists', () => {
    const { result } = renderHook(() => useSessionStore());
    let sessionId: string;
    act(() => { sessionId = result.current.handleNewSession(); });

    act(() => {
      result.current.handleWorkspaceChange(
        { ...result.current.workspace, platform: 'linkedin', tone: 'professional' },
        sessionId!,
        []
      );
    });
    expect(result.current.workspace.platform).toBe('linkedin');
    expect(result.current.workspace.tone).toBe('professional');
  });
});
