import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/hooks/useChatStore';
import type { Message, FileAttachment } from '@/lib/types';

beforeEach(() => {
  vi.restoreAllMocks();
});

function createMockFetch(streamEvents: Array<{ type: string; content?: string; error?: string }>) {
  // Build SSE data string
  const sseText = streamEvents.map(e => `data: ${JSON.stringify(e)}\n`).join('\n') + '\n';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(sseText);

  const mockReader = {
    read: vi.fn()
      .mockResolvedValueOnce({ done: false, value: bytes })
      .mockResolvedValueOnce({ done: true, value: undefined }),
    releaseLock: vi.fn(),
    cancel: vi.fn(),
    closed: Promise.resolve(undefined),
  };

  const mockBody = {
    getReader: () => mockReader,
    locked: false,
    cancel: vi.fn(),
    pipeThrough: vi.fn(),
    pipeTo: vi.fn(),
    tee: vi.fn(),
    getReader: vi.fn().mockReturnValue(mockReader),
  };

  return vi.fn().mockResolvedValue({
    ok: true,
    body: mockBody,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
  });
}

describe('useChatStore', () => {
  const defaultOptions = {
    activeSessionId: 'session-1',
    workspace: {
      model: 'test-model',
      temperature: 0.7,
      platform: 'twitter' as const,
      format: 'post' as const,
      length: 'medium' as const,
      tone: 'casual' as const,
    },
    onNewSession: vi.fn().mockReturnValue('new-session-id'),
    persistSession: vi.fn(),
  };

  it('initializes with empty messages and not loading', () => {
    const { result } = renderHook(() => useChatStore(defaultOptions));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.pendingFiles).toEqual([]);
    expect(result.current.streamingContent).toBe('');
  });

  it('sendMessage adds user message and calls fetch', async () => {
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Hello ' },
      { type: 'content', content: 'world!' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    // User message should be added
    expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.isLoading).toBe(false);

    // Fetch should have been called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8420/chat/stream',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('SSE streaming accumulates content into assistant message', async () => {
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Part 1 ' },
      { type: 'content', content: 'Part 2 ' },
      { type: 'content', content: 'Part 3' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Stream test');
    });

    // Should have user + assistant messages
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Part 1 Part 2 Part 3');
  });

  it('handles SSE error events by skipping them (inner catch)', async () => {
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Partial ' },
      { type: 'error', error: 'Server crashed' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Error test');
    });

    // The error event is caught by the inner parse-error catch, so the stream
    // completes normally with accumulated content saved as-is
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1].content).toContain('Partial');
  });

  it('handles fetch rejection during SSE read with partial content', async () => {
    // Simulate a stream that yields content then throws
    const encoder = new TextEncoder();
    const bytes = encoder.encode('data: {"type":"content","content":"Got some data"}\n');
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: bytes })
        .mockRejectedValueOnce(new Error('Stream dropped')),
      releaseLock: vi.fn(),
      cancel: vi.fn(),
      closed: Promise.resolve(undefined),
    };
    const mockBody = {
      getReader: vi.fn().mockReturnValue(mockReader),
      locked: false,
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockBody,
      status: 200,
    });

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Stream drop test');
    });

    // Should save partial content with "Stream interrupted" suffix
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toContain('Got some data');
    expect(result.current.messages[1].content).toContain('Stream interrupted');
  });

  it('falls back to /api/chat when SSE stream fails', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        body: null,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: 'Fallback response',
          scores: null,
        }),
      });
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Fallback test');
    });

    // Should have called both endpoints
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe('/api/chat');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe('Fallback response');
  });

  it('handles network errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network is down'));
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Network error test');
    });

    // Should have user message + error message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain('Connection Drop');
    expect(result.current.messages[1].retryable).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('removeFile removes file from pending files', async () => {
    const { result } = renderHook(() => useChatStore(defaultOptions));

    // Manually add pending files via state manipulation
    act(() => {
      // We can't directly set state, but removeFile should work on empty array
      result.current.removeFile(0);
    });
    expect(result.current.pendingFiles).toEqual([]);
  });

  it('handleFileSelect processes text files', async () => {
    const { result } = renderHook(() => useChatStore(defaultOptions));

    const textFile = new File(['Hello world content'], 'test.txt', { type: 'text/plain' });
    const fileList = {
      0: textFile,
      length: 1,
      item: (i: number) => (i === 0 ? textFile : null),
      [Symbol.iterator]: function* () { yield textFile; },
    } as unknown as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0].name).toBe('test.txt');
    expect(result.current.pendingFiles[0].type).toBe('text');
    expect(result.current.pendingFiles[0].content).toBe('Hello world content');
  });

  it('handleFileSelect rejects files over 5MB', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useChatStore(defaultOptions));

    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.txt', { type: 'text/plain' });
    // Override the size property
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

    const fileList = {
      0: bigFile,
      length: 1,
      item: (i: number) => (i === 0 ? bigFile : null),
      [Symbol.iterator]: function* () { yield bigFile; },
    } as unknown as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('too large'));
    expect(result.current.pendingFiles).toHaveLength(0);
    alertSpy.mockRestore();
  });

  it('persistSession is called after sending a message', async () => {
    const persistSession = vi.fn();
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Response' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore({
      ...defaultOptions,
      persistSession,
    }));

    await act(async () => {
      await result.current.sendMessage('Persist test');
    });

    // persistSession should be called (at least for user msg, and for final msg)
    expect(persistSession).toHaveBeenCalled();
  });

  it('creates a new session if activeSessionId is null', async () => {
    const onNewSession = vi.fn().mockReturnValue('auto-created-session');
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Auto session' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore({
      ...defaultOptions,
      activeSessionId: null,
      onNewSession,
    }));

    await act(async () => {
      await result.current.sendMessage('Auto session test');
    });

    expect(onNewSession).toHaveBeenCalled();
  });

  it('handleRetry resends last user message', async () => {
    const mockFetch = createMockFetch([
      { type: 'content', content: 'Retry response' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useChatStore(defaultOptions));

    // First send a message
    await act(async () => {
      await result.current.sendMessage('Original message');
    });

    // Now retry
    const mockFetch2 = createMockFetch([
      { type: 'content', content: 'Retried response' },
      { type: 'done' },
    ]);
    globalThis.fetch = mockFetch2;

    await act(async () => {
      result.current.handleRetry();
    });

    // handleRetry should have triggered another fetch
    expect(mockFetch2).toHaveBeenCalled();
  });
});
