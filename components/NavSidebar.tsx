'use client';

import { useState, memo } from 'react';

interface NavSidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  onClearChat: () => void;
  messageCount: number;
}

const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'research', icon: '📡', label: 'Research Feed' },
  { id: 'search', icon: '🔍', label: 'Search Posts' },
  { id: 'creators', icon: '👤', label: 'Creators' },
  { id: 'boards', icon: '📌', label: 'Boards' },
  { id: 'carousel', icon: '📸', label: 'Carousels' },
  { id: 'transcribe', icon: '🎬', label: 'Transcribe' },
  { id: 'voice', icon: '🎙', label: 'Voice Profile' },
  { id: 'agents', icon: '🤖', label: 'Agents' },
  { id: 'projects', icon: '📁', label: 'Projects' },
  { id: 'style', icon: '🎨', label: 'Style Guide' },
  { id: 'history', icon: '📜', label: 'History' },
];

const BOTTOM_ITEMS = [
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

function NavSidebar({ activeNav, onNavChange, onClearChat, messageCount }: NavSidebarProps) {
  const [expanded, setExpanded] = useState(false);

  const collapsedWidth = 'w-16';
  const expandedWidth = 'w-52';

  return (
    <aside
      className={`${expanded ? expandedWidth : collapsedWidth} flex flex-col py-4 border-r transition-all duration-200 ease-in-out relative`}
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo + Toggle */}
      <div className="mb-6 flex items-center px-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0" style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
          color: '#000',
        }}>
          SG
        </div>
        {expanded && (
          <div className="ml-3 flex-1 min-w-0">
            <span className="text-[11px] font-bold block truncate" style={{ color: 'var(--accent)' }}>
              StraughterG OS
            </span>
            <span className="text-[9px] block" style={{ color: 'var(--text-muted)' }}>
              v1.0
            </span>
          </div>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] transition-all ${expanded ? '' : 'ml-2'}`}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={`flex items-center rounded-lg text-sm transition-all relative group ${
                expanded ? 'px-3 py-2.5 gap-3' : 'w-10 h-10 justify-center mx-auto'
              }`}
              style={{
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                border: isActive ? '1px solid var(--accent-dim)' : '1px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
              title={expanded ? '' : item.label}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {expanded && (
                <span className="text-[11px] font-medium truncate text-left flex-1">
                  {item.label}
                </span>
              )}
              {/* Tooltip for collapsed state */}
              {!expanded && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 px-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        {/* Clear Chat */}
        <button
          onClick={onClearChat}
          className={`flex items-center rounded-lg text-sm transition-all relative group ${
            expanded ? 'px-3 py-2.5 gap-3' : 'w-10 h-10 justify-center mx-auto'
          }`}
          style={{
            background: messageCount > 0 ? 'var(--bg-tertiary)' : 'transparent',
            border: '1px solid var(--border)',
            color: messageCount > 0 ? 'var(--danger)' : 'var(--text-muted)',
            cursor: messageCount > 0 ? 'pointer' : 'default',
            opacity: messageCount > 0 ? 1 : 0.4,
          }}
          title={expanded ? '' : 'Clear chat'}
          disabled={messageCount === 0}
        >
          <span className="text-base flex-shrink-0">🗑</span>
          {expanded && (
            <span className="text-[11px] font-medium truncate">Clear Chat</span>
          )}
          {!expanded && (
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              Clear Chat
            </div>
          )}
        </button>

        {/* Settings */}
        {BOTTOM_ITEMS.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={`flex items-center rounded-lg text-sm transition-all relative group ${
                expanded ? 'px-3 py-2.5 gap-3' : 'w-10 h-10 justify-center mx-auto'
              }`}
              style={{
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                border: isActive ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = isActive ? 'var(--bg-tertiary)' : 'transparent';
              }}
              title={expanded ? '' : item.label}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {expanded && (
                <span className="text-[11px] font-medium truncate">{item.label}</span>
              )}
              {!expanded && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default memo(NavSidebar);
