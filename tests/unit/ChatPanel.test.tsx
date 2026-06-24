import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ChatPanel from '@/components/ChatPanel';
import type { Message, FileAttachment } from '@/lib/types';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

describe('ChatPanel', () => {
  const defaultProps = {
    messages: [] as Message[],
    isLoading: false,
    onSendMessage: vi.fn(),
    onAction: vi.fn(),
    onRetry: vi.fn(),
    onFileSelect: vi.fn(),
    onRemoveFile: vi.fn(),
    pendingFiles: [] as FileAttachment[],
    pendingTemplate: null,
    onTemplateConsumed: vi.fn(),
    fileInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
    sessions: [],
    activeSessionId: null,
    onNewSession: vi.fn(),
    onSwitchSession: vi.fn(),
    onDeleteSession: vi.fn(),
    streamingContent: '',
  };

  it('renders empty state with welcome message', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
    expect(screen.getByText('Ask for hooks, threads, or content ideas')).toBeInTheDocument();
  });

  it('renders user and assistant messages', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Hello world', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('SGOS')).toBeInTheDocument();
  });

  it('renders message count badge when messages exist', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Test', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Reply', timestamp: Date.now() },
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('2 msgs')).toBeInTheDocument();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<ChatPanel {...defaultProps} isLoading={true} />);
    // Loading state shows "SGOS" label
    const sgosLabels = screen.getAllByText('SGOS');
    expect(sgosLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders streaming content when provided', () => {
    render(<ChatPanel {...defaultProps} streamingContent="Streaming tokens..." />);
    expect(screen.getByText('Streaming tokens...')).toBeInTheDocument();
    expect(screen.getByText('streaming...')).toBeInTheDocument();
  });

  it('sends message on form submit', () => {
    const onSendMessage = vi.fn();
    render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />);
    const textarea = screen.getByPlaceholderText('Enter topic, paste a tweet, or type a command...');
    fireEvent.change(textarea, { target: { value: 'My test message' } });
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    expect(onSendMessage).toHaveBeenCalledWith('My test message');
  });

  it('does not send empty messages', () => {
    const onSendMessage = vi.fn();
    render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />);
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('sends message on Enter key without shift', () => {
    const onSendMessage = vi.fn();
    render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />);
    const textarea = screen.getByPlaceholderText('Enter topic, paste a tweet, or type a command...');
    fireEvent.change(textarea, { target: { value: 'Enter message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSendMessage).toHaveBeenCalledWith('Enter message');
  });

  it('renders pending files with remove buttons', () => {
    const pendingFiles: FileAttachment[] = [
      { name: 'test.txt', type: 'text', content: 'hello', size: 5 },
      { name: 'photo.png', type: 'image', content: 'data:image/png;base64,abc', size: 1024 },
    ];
    render(<ChatPanel {...defaultProps} pendingFiles={pendingFiles} />);
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('5B')).toBeInTheDocument();
    expect(screen.getByText('1.0KB')).toBeInTheDocument();
    // Remove buttons (×)
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBe(2);
  });

  it('calls onRemoveFile when file remove button is clicked', () => {
    const onRemoveFile = vi.fn();
    const pendingFiles: FileAttachment[] = [
      { name: 'test.txt', type: 'text', content: 'hello', size: 5 },
    ];
    render(<ChatPanel {...defaultProps} pendingFiles={pendingFiles} onRemoveFile={onRemoveFile} />);
    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it('renders retry button for retryable error messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Error occurred',
        timestamp: Date.now(),
        errorType: 'network',
        retryable: true,
      },
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
  });

  it('renders session header with "New Session" when no active session', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('New Session')).toBeInTheDocument();
  });

  it('applies pending template to input', async () => {
    render(
      <ChatPanel
        {...defaultProps}
        pendingTemplate="Template text here"
        onTemplateConsumed={defaultProps.onTemplateConsumed}
      />
    );
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Enter topic, paste a tweet, or type a command...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Template text here');
    });
    expect(defaultProps.onTemplateConsumed).toHaveBeenCalled();
  });

  it('renders file attachments in messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Check this file',
        timestamp: Date.now(),
        attachments: [{ name: 'report.pdf', type: 'text', content: 'data', size: 2048 }],
      },
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0KB')).toBeInTheDocument();
  });

  it('renders New button for sessions', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('+ New')).toBeInTheDocument();
  });

  it('renders History dropdown button', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('History ▼')).toBeInTheDocument();
  });
});
