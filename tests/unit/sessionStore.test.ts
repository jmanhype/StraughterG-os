import { describe, it, expect, beforeEach } from 'vitest';
import { loadSessions, saveSessions, getActiveSessionId, setActiveSessionId, createSession, updateSession, deleteSession } from '@/lib/sessionStore';
import type { Session } from '@/lib/sessionStore';

describe('sessionStore utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSessions returns empty array when no data', () => {
    expect(loadSessions()).toEqual([]);
  });

  it('saveSessions persists to localStorage and loadSessions retrieves them', () => {
    const sessions: Session[] = [
      {
        id: 'test-1',
        title: 'Test Session',
        messages: [],
        workspace: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    saveSessions(sessions);
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-1');
    expect(loaded[0].title).toBe('Test Session');
  });

  it('getActiveSessionId returns null when not set', () => {
    expect(getActiveSessionId()).toBeNull();
  });

  it('setActiveSessionId persists and getActiveSessionId retrieves it', () => {
    setActiveSessionId('session-42');
    expect(getActiveSessionId()).toBe('session-42');
  });

  it('createSession returns a valid session object', () => {
    const session = createSession();
    expect(session.id).toBeTruthy();
    expect(session.title).toBe('New Session');
    expect(session.messages).toEqual([]);
    expect(session.workspace).toBeNull();
    expect(session.createdAt).toBeLessThanOrEqual(Date.now());
    expect(session.updatedAt).toBeLessThanOrEqual(Date.now());
  });

  it('updateSession updates matching session', () => {
    const sessions: Session[] = [
      { id: 's1', title: 'Old Title', messages: [], workspace: null, createdAt: 100, updatedAt: 100 },
      { id: 's2', title: 'Other', messages: [], workspace: null, createdAt: 200, updatedAt: 200 },
    ];
    const updated = updateSession(sessions, 's1', { title: 'New Title' });
    expect(updated[0].title).toBe('New Title');
    expect(updated[0].updatedAt).toBeGreaterThan(100);
    expect(updated[1].title).toBe('Other'); // unchanged
  });

  it('deleteSession removes matching session', () => {
    const sessions: Session[] = [
      { id: 's1', title: 'First', messages: [], workspace: null, createdAt: 100, updatedAt: 100 },
      { id: 's2', title: 'Second', messages: [], workspace: null, createdAt: 200, updatedAt: 200 },
    ];
    const result = deleteSession(sessions, 's1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s2');
  });

  it('loadSessions handles corrupted JSON gracefully', () => {
    localStorage.setItem('sgos-sessions', 'not-valid-json{{{');
    expect(loadSessions()).toEqual([]);
  });

  it('saveSessions overwrites existing data', () => {
    const sessions1: Session[] = [
      { id: 's1', title: 'First', messages: [], workspace: null, createdAt: 100, updatedAt: 100 },
    ];
    const sessions2: Session[] = [
      { id: 's2', title: 'Second', messages: [], workspace: null, createdAt: 200, updatedAt: 200 },
      { id: 's3', title: 'Third', messages: [], workspace: null, createdAt: 300, updatedAt: 300 },
    ];
    saveSessions(sessions1);
    saveSessions(sessions2);
    const loaded = loadSessions();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('s2');
  });
});
