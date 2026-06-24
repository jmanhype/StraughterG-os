import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import HomeView from '@/components/HomeView';

describe('HomeView', () => {
  const defaultProps = {
    onNavigate: vi.fn(),
    messageCount: 0,
    sessionCount: 0,
    onNewSession: vi.fn(),
    onInsertTemplate: vi.fn(),
  };

  it('renders the main title', () => {
    render(<HomeView {...defaultProps} />);
    const titles = screen.getAllByText('StraughterG OS');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all navigation cards', () => {
    render(<HomeView {...defaultProps} />);
    expect(screen.getByText('Research Feed')).toBeInTheDocument();
    expect(screen.getByText('Content Engine')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Creator Intel')).toBeInTheDocument();
    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(screen.getByText('Voice Profile')).toBeInTheDocument();
    expect(screen.getByText('Style Guide')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onNavigate when a card is clicked', () => {
    const onNavigate = vi.fn();
    render(<HomeView {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Research Feed'));
    expect(onNavigate).toHaveBeenCalledWith('research');
  });

  it('shows message count badge on Content Engine when messages exist', () => {
    render(<HomeView {...defaultProps} messageCount={5} />);
    expect(screen.getByText('5 msgs')).toBeInTheDocument();
  });

  it('shows session count badge on History when sessions exist', () => {
    render(<HomeView {...defaultProps} sessionCount={3} />);
    expect(screen.getByText('3 sessions')).toBeInTheDocument();
  });

  it('calls onNewSession when + New Session button is clicked', () => {
    const onNewSession = vi.fn();
    render(<HomeView {...defaultProps} onNewSession={onNewSession} />);
    fireEvent.click(screen.getByText('+ New Session'));
    expect(onNewSession).toHaveBeenCalled();
  });

  it('renders Quick Start section with template buttons', () => {
    render(<HomeView {...defaultProps} />);
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Generate hooks about AI agents')).toBeInTheDocument();
    expect(screen.getByText('Write a thread about VAOS')).toBeInTheDocument();
  });

  it('navigates and inserts template when quick start is clicked', async () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const onInsertTemplate = vi.fn();
    render(<HomeView {...defaultProps} onNavigate={onNavigate} onInsertTemplate={onInsertTemplate} />);

    fireEvent.click(screen.getByText('Generate hooks about AI agents'));
    expect(onNavigate).toHaveBeenCalledWith('agents');

    // Template insertion is delayed by 200ms
    vi.advanceTimersByTime(300);
    expect(onInsertTemplate).toHaveBeenCalledWith(
      expect.stringContaining('Generate 5 viral hook variations')
    );
    vi.useRealTimers();
  });

  it('navigates to correct view for each card', () => {
    const onNavigate = vi.fn();
    render(<HomeView {...defaultProps} onNavigate={onNavigate} />);

    const navTests = [
      { text: 'Projects', expected: 'projects' },
      { text: 'Settings', expected: 'settings' },
      { text: 'Style Guide', expected: 'style' },
    ];

    navTests.forEach(({ text, expected }) => {
      fireEvent.click(screen.getByText(text));
      expect(onNavigate).toHaveBeenCalledWith(expected);
    });
  });

  it('renders version badge', () => {
    render(<HomeView {...defaultProps} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });
});
