'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, ViralScores, FileAttachment } from '@/lib/types';

interface ChatStoreOptions {
  activeSessionId: string | null;
  workspace: any;
  onNewSession: () => string;
  persistSession: (sessionId: string, messages: Message[], ws?: any) => void;
}

export function useChatStore({ activeSessionId, workspace, onNewSession, persistSession }: ChatStoreOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestScores, setLatestScores] = useState<ViralScores | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<Message[]>([]);

  const syncMessages = (msgs: Message[]) => {
    messagesRef.current = msgs;
    setMessages(msgs);
  };

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

  // SSE streaming via fetch + ReadableStream
  const sendMessage = useCallback(async (content: string, action?: string) => {
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
      id: crypto.randomUUID(),
      role: 'user',
      content: fullContent,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = action ? [...messages] : [...messages, userMessage];

    if (!action) {
      syncMessages(updatedMessages);
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = onNewSession();
    }

    if (!action) {
      persistSession(sessionId, updatedMessages);
    }

    setIsLoading(true);
    setPendingFiles([]);
    setStreamingContent('');

    const assistantId = crypto.randomUUID();
    let accumulated = '';

    let fetchTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      fetchTimeout = setTimeout(() => controller.abort(), 120_000);

      // Try SSE streaming first
      const streamRes = await fetch('http://127.0.0.1:8420/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          action,
          platform: workspace?.platform,
          tone: workspace?.tone,
          length: workspace?.length,
          creativity: workspace?.temperature,
        }),
        signal: controller.signal,
      });

      if (streamRes.ok && streamRes.body) {
        // SSE stream — parse data: lines
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'content') {
                accumulated += event.content;
                setStreamingContent(accumulated);
              } else if (event.type === 'done') {
                // Stream complete
              } else if (event.type === 'error') {
                throw new Error(event.error);
              }
            } catch (parseErr) {
              // Skip malformed SSE events
            }
          }
        }

        // Finalize streamed message
        if (accumulated) {
          const assistantMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: accumulated,
            timestamp: Date.now(),
          };
          const finalMessages = [...updatedMessages, assistantMessage];
          syncMessages(finalMessages);
          persistSession(sessionId, finalMessages);
          setStreamingContent('');
        }
      } else {
        // SSE failed — fall back to blocking JSON via /api/chat
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            workspace,
            action,
            apiOverrides: (() => {
              try {
                const raw = localStorage.getItem('sgos-settings');
                if (!raw) return undefined;
                const s = JSON.parse(raw);
                const overrides: Record<string, string> = {};
                if (s.aiApiKey) overrides.apiKey = s.aiApiKey;
                if (s.aiBaseUrl) overrides.baseUrl = s.aiBaseUrl;
                return Object.keys(overrides).length > 0 ? overrides : undefined;
              } catch { return undefined; }
            })(),
          }),
          signal: controller.signal,
        });

        if (!fallbackRes.ok) {
          const err = await fallbackRes.json();
          const e = new Error(err.error || 'Request failed') as any;
          e.errorType = err.errorType;
          e.retryable = err.retryable;
          throw e;
        }

        const data = await fallbackRes.json();

        const assistantMessage: Message = {
          id: assistantId,
          role: 'assistant',
          content: data.content,
          scores: data.scores || undefined,
          research: data.research || undefined,
          timestamp: Date.now(),
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        syncMessages(finalMessages);
        persistSession(sessionId, finalMessages);

        if (data.scores) {
          setLatestScores(data.scores);
        }
      }
    } catch (error: any) {
      if (accumulated) {
        // Partial stream succeeded before error — save what we have
        const partialMessage: Message = {
          id: assistantId,
          role: 'assistant',
          content: accumulated + '\n\n*[Stream interrupted]*',
          timestamp: Date.now(),
        };
        const finalMessages = [...updatedMessages, partialMessage];
        syncMessages(finalMessages);
        persistSession(sessionId, finalMessages);
        setStreamingContent('');
      } else {
        const errorType = (error.errorType || 'network') as Message['errorType'];
        const retryable: boolean = error.retryable !== undefined ? error.retryable : true;

        const errorMessages: Record<string, string> = {
          network: `**⚠️ Connection Drop:** ${error.message}\n\nThe connection was lost. This is usually transient — hit Retry below.`,
          rate_limit: `**⚠️ Rate Limited:** ${error.message}\n\nThe API hit its rate limit. Wait ~30s and hit Retry, or switch to a lighter model in Settings.`,
          auth: `**⚠️ Auth Error:** ${error.message}\n\nCheck your API key in Settings → AI Configuration. This won't resolve with retry.`,
          server: `**⚠️ Server Error:** ${error.message}\n\nThe API returned a 502/503. Usually transient — hit Retry.`,
          unknown: `**⚠️ Error:** ${error.message}\n\nSomething went wrong. Check the dev console for details.`,
        };

        const errorMessage: Message = {
          id: assistantId,
          role: 'assistant',
          content: errorMessages[errorType || 'unknown'] || errorMessages.unknown,
          timestamp: Date.now(),
          errorType,
          retryable,
        };
        const finalMessages = [...updatedMessages, errorMessage];
        syncMessages(finalMessages);
        persistSession(sessionId, finalMessages);
      }
    } finally {
      clearTimeout(fetchTimeout);
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, workspace, pendingFiles, activeSessionId, onNewSession, persistSession]);

  const handleAction = useCallback((action: string) => {
    if (messages.length === 0) return;
    setIsLoading(true);
    sendMessage('', action);
  }, [messages, sendMessage]);

  const handleRetry = useCallback(() => {
    const currentMessages = messagesRef.current;
    const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    const cleanMessages = currentMessages.filter(m => !m.errorType);
    syncMessages(cleanMessages);
    sendMessage(lastUserMsg.content);
  }, [sendMessage]);

  const insertTemplate = useCallback((template: string) => {
    setPendingTemplate(template);
  }, []);

  const consumeTemplate = useCallback(() => {
    setPendingTemplate(null);
  }, []);

  return {
    messages,
    setMessages: syncMessages,
    isLoading,
    latestScores,
    setLatestScores,
    pendingFiles,
    pendingTemplate,
    streamingContent,
    fileInputRef,
    handleFileSelect,
    removeFile,
    sendMessage,
    handleAction,
    handleRetry,
    insertTemplate,
    consumeTemplate,
  };
}
