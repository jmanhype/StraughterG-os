'use client';

interface NavSidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  onClearChat: () => void;
  messageCount: number;
}

const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'agents', icon: '🤖', label: 'Agents' },
  { id: 'projects', icon: '📁', label: 'Projects' },
  { id: 'style', icon: '🎨', label: 'Style Guide' },
  { id: 'history', icon: '📜', label: 'History' },
];

const BOTTOM_ITEMS = [
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export default function NavSidebar({ activeNav, onNavChange, onClearChat, messageCount }: NavSidebarProps) {
  return (
    <aside className="w-16 flex flex-col items-center py-4 border-r" style={{
      background: 'var(--bg-secondary)',
      borderColor: 'var(--border)',
    }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
          color: '#000',
        }}>
          SG
        </div>
        <span className="text-[9px] mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
          SGOS
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-2">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all"
            style={{
              background: activeNav === item.id ? 'var(--bg-tertiary)' : 'transparent',
              border: activeNav === item.id ? '1px solid var(--accent-dim)' : '1px solid transparent',
              color: activeNav === item.id ? 'var(--accent)' : 'var(--text-muted)',
            }}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={onClearChat}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all"
          style={{
            background: messageCount > 0 ? 'var(--bg-tertiary)' : 'transparent',
            border: '1px solid var(--border)',
            color: messageCount > 0 ? 'var(--danger)' : 'var(--text-muted)',
            cursor: messageCount > 0 ? 'pointer' : 'default',
            opacity: messageCount > 0 ? 1 : 0.4,
          }}
          title="Clear chat"
          disabled={messageCount === 0}
        >
          🗑
        </button>
        {BOTTOM_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all"
            style={{
              background: activeNav === item.id ? 'var(--bg-tertiary)' : 'transparent',
              border: activeNav === item.id ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
              color: activeNav === item.id ? 'var(--accent)' : 'var(--text-muted)',
            }}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </aside>
  );
}
