'use client';

import { useState, useEffect, memo } from 'react';

interface Settings {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  zaiApiKey: string;
  zaiBaseUrl: string;
  defaultTemperature: number;
  defaultPlatform: string;
  defaultFormat: string;
}

const STORAGE_KEY = 'sgos-settings';

const DEFAULT_SETTINGS: Settings = {
  aiApiKey: '',
  aiBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  aiModel: 'qwen-latest-series-invite-beta-v34',
  zaiApiKey: '',
  zaiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  defaultTemperature: 0.7,
  defaultPlatform: 'twitter',
  defaultFormat: 'post',
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••' : '';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestError('');
    try {
      // Send a minimal chat request to verify the API key works
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Reply with just the word OK' }],
          workspace: { model: settings.aiModel || 'qwen-latest-series-invite-beta-v34' },
          apiOverrides: {
            ...(settings.aiApiKey ? { apiKey: settings.aiApiKey } : {}),
            ...(settings.aiBaseUrl ? { baseUrl: settings.aiBaseUrl } : {}),
          },
        }),
      });
      if (res.ok) {
        setTestStatus('ok');
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setTestStatus('error');
        setTestError(data.error || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e.message || 'Connection failed');
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Settings
          </span>
        </div>
        {saved && (
          <span className="text-[10px] px-2 py-1 rounded animate-slide-in" style={{
            background: 'var(--accent-dim)', color: 'var(--accent)',
          }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Qwen / DashScope */}
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Qwen / DashScope
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showKeys['ai'] ? 'text' : 'password'}
                    value={settings.aiApiKey}
                    onChange={e => update({ aiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 rounded text-[12px] outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                  <button
                    onClick={() => toggleShowKey('ai')}
                    className="px-3 py-2 rounded text-[10px] uppercase"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    {showKeys['ai'] ? 'Hide' : 'Show'}
                  </button>
                </div>
                {settings.aiApiKey && (
                  <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Key: {maskKey(settings.aiApiKey)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Base URL</label>
                <input
                  type="text"
                  value={settings.aiBaseUrl}
                  onChange={e => update({ aiBaseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded text-[12px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Default Model</label>
                <select
                  value={settings.aiModel}
                  onChange={e => update({ aiModel: e.target.value })}
                  className="w-full py-2"
                >
                  <option value="qwen-latest-series-invite-beta-v34">Qwen 3.7 Max</option>
                  <option value="qwen-plus">Qwen Plus</option>
                  <option value="qwen-turbo">Qwen Turbo</option>
                  <option value="qwen-max">Qwen Max</option>
                </select>
              </div>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wide transition-all"
              style={{
                background: testStatus === 'ok' ? '#10b981' : testStatus === 'error' ? '#ef4444' : 'var(--accent)',
                color: '#fff',
                opacity: testStatus === 'testing' ? 0.6 : 1,
              }}
            >
              {testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? '✓ Connected' : testStatus === 'error' ? '✗ Failed' : 'Test Connection'}
            </button>
            {testStatus === 'error' && testError && (
              <span className="text-[10px]" style={{ color: '#ef4444' }}>{testError}</span>
            )}
            {testStatus === 'ok' && (
              <span className="text-[10px]" style={{ color: '#10b981' }}>API key and endpoint are working.</span>
            )}
          </div>

          {/* Z.AI / ZhiPu */}
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Z.AI / ZhiPu (GLM)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showKeys['zai'] ? 'text' : 'password'}
                    value={settings.zaiApiKey}
                    onChange={e => update({ zaiApiKey: e.target.value })}
                    placeholder="zai-..."
                    className="flex-1 px-3 py-2 rounded text-[12px] outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                  <button
                    onClick={() => toggleShowKey('zai')}
                    className="px-3 py-2 rounded text-[10px] uppercase"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    {showKeys['zai'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Base URL</label>
                <input
                  type="text"
                  value={settings.zaiBaseUrl}
                  onChange={e => update({ zaiBaseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded text-[12px] outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-dim)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>
          </div>

          {/* Defaults */}
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Defaults
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Temperature</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={settings.defaultTemperature * 100}
                    onChange={e => update({ defaultTemperature: Number(e.target.value) / 100 })}
                    className="flex-1"
                  />
                  <span className="text-[11px] font-mono w-8 text-right" style={{ color: 'var(--accent)' }}>
                    {settings.defaultTemperature.toFixed(1)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Platform</label>
                <select
                  value={settings.defaultPlatform}
                  onChange={e => update({ defaultPlatform: e.target.value })}
                  className="w-full py-2"
                >
                  <option value="twitter">X / Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="newsletter">Newsletter</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Format</label>
                <select
                  value={settings.defaultFormat}
                  onChange={e => update({ defaultFormat: e.target.value })}
                  className="w-full py-2"
                >
                  <option value="post">Post</option>
                  <option value="thread">Thread</option>
                  <option value="article">Article</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              About
            </h3>
            <div className="space-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <p>StraughterG OS v1.0</p>
              <p>Built by @StraughterG — systems engineer, not an AI influencer.</p>
              <p>Concept inspired by Kaize OS. This is the working implementation.</p>
              <p className="pt-2">
                <a href="https://github.com/jmanhype/StraughterG-os" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                  github.com/jmanhype/StraughterG-os
                </a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default memo(SettingsView);
