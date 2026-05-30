'use client';

import { useState } from 'react';
import { WorkspaceState, ViralScores } from '@/lib/types';
import { QUICK_TEMPLATES } from '@/lib/systemPrompt';

interface WorkspaceSidebarProps {
  workspace: WorkspaceState;
  onWorkspaceChange: (ws: WorkspaceState) => void;
  scores: ViralScores | null;
  onAction: (action: string) => void;
  isLoading: boolean;
}

function ScoreGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="h-full rounded-full gauge-fill"
          style={{
            '--gauge-width': `${value}%`,
            width: `${value}%`,
            background: color,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function ToneSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function WorkspaceSidebar({
  workspace,
  onWorkspaceChange,
  scores,
  onAction,
  isLoading,
}: WorkspaceSidebarProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const updateWorkspace = (partial: Partial<WorkspaceState>) => {
    onWorkspaceChange({ ...workspace, ...partial });
  };

  const updateTone = (key: keyof WorkspaceState['tone'], value: number) => {
    updateWorkspace({
      tone: { ...workspace.tone, [key]: value },
    });
  };

  return (
    <aside className="w-72 flex flex-col overflow-hidden border-l" style={{
      background: 'var(--bg-secondary)',
      borderColor: 'var(--border)',
    }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            WORKSPACE
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Agent Status */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            AGENT STATUS
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full pulse-green" style={{ background: 'var(--accent)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>ONLINE</span>
          </div>
          <select
            value={workspace.model}
            onChange={e => updateWorkspace({ model: e.target.value })}
            className="w-full"
          >
            <optgroup label="Qwen (DashScope)">
              <option value="qwen-latest-series-invite-beta-v34">Qwen 3.7 Max</option>
              <option value="qwen-plus">Qwen Plus</option>
              <option value="qwen-turbo">Qwen Turbo</option>
              <option value="qwen-max">Qwen Max</option>
            </optgroup>
            <optgroup label="Z.AI / GLM">
              <option value="glm-4-plus">GLM-4 Plus</option>
              <option value="glm-4">GLM-4</option>
              <option value="glm-4-flash">GLM-4 Flash</option>
            </optgroup>
            <optgroup label="OpenAI (if configured)">
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </optgroup>
          </select>
        </div>

        {/* Creativity (Temperature) */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            CREATIVITY
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={200}
              value={workspace.temperature * 100}
              onChange={e => updateWorkspace({ temperature: Number(e.target.value) / 100 })}
              className="flex-1"
            />
            <span className="text-[11px] font-mono w-8 text-right" style={{ color: 'var(--accent)' }}>
              {workspace.temperature.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Content Controls */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            CONTENT CONTROLS
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Platform</label>
              <select
                value={workspace.platform}
                onChange={e => updateWorkspace({ platform: e.target.value as WorkspaceState['platform'] })}
                className="w-full"
              >
                <option value="twitter">X / Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="longform">Long-form</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Format</label>
              <select
                value={workspace.format}
                onChange={e => updateWorkspace({ format: e.target.value as WorkspaceState['format'] })}
                className="w-full"
              >
                <option value="post">Post</option>
                <option value="thread">Thread</option>
                <option value="article">Article</option>
                <option value="reply">Reply</option>
                <option value="hook">Hooks (5x)</option>
              </select>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-[9px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Length</label>
            <div className="flex gap-1">
              {(['short', 'medium', 'long'] as const).map(len => (
                <button
                  key={len}
                  onClick={() => updateWorkspace({ length: len })}
                  className="flex-1 py-1.5 rounded text-[10px] uppercase font-semibold transition-all"
                  style={{
                    background: workspace.length === len ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                    border: `1px solid ${workspace.length === len ? 'var(--accent)' : 'var(--border)'}`,
                    color: workspace.length === len ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tone Engine */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            TONE ENGINE
          </div>
          <ToneSlider label="Casual ↔ Formal" value={workspace.tone.casual} onChange={v => updateTone('casual', v)} />
          <ToneSlider label="Witty" value={workspace.tone.witty} onChange={v => updateTone('witty', v)} />
          <ToneSlider label="Provocative" value={workspace.tone.provocative} onChange={v => updateTone('provocative', v)} />
          <ToneSlider label="Technical" value={workspace.tone.technical} onChange={v => updateTone('technical', v)} />
        </div>

        {/* Viral Scores */}
        {scores && (
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              VIRAL SCORE
            </div>
            <ScoreGauge
              label="Overall"
              value={scores.viralScore}
              color={scores.viralScore >= 80 ? 'var(--accent)' : scores.viralScore >= 60 ? '#f59e0b' : '#ef4444'}
            />
            <ScoreGauge
              label="Hook Strength"
              value={scores.hookStrength}
              color={scores.hookStrength >= 80 ? 'var(--accent)' : scores.hookStrength >= 60 ? '#f59e0b' : '#ef4444'}
            />
            <ScoreGauge
              label="Readability"
              value={scores.readability}
              color={scores.readability >= 80 ? 'var(--accent)' : scores.readability >= 60 ? '#f59e0b' : '#ef4444'}
            />
            <ScoreGauge
              label="Emotional Pull"
              value={scores.emotionalPull}
              color={scores.emotionalPull >= 80 ? 'var(--accent)' : scores.emotionalPull >= 60 ? '#f59e0b' : '#ef4444'}
            />
          </div>
        )}

        {/* Quick Templates */}
        <div className="mb-4">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full text-left flex items-center justify-between py-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              QUICK TEMPLATES
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {showTemplates ? '▲' : '▼'}
            </span>
          </button>
          {showTemplates && (
            <div className="space-y-1 mt-2">
              {Object.entries(QUICK_TEMPLATES).map(([name, prompt]) => (
                <button
                  key={name}
                  onClick={() => {
                    // Copy template to clipboard or trigger send
                    navigator.clipboard.writeText(prompt);
                  }}
                  className="w-full text-left px-3 py-2 rounded text-[11px] transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-dim)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons (Fixed at bottom) */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          QUICK ACTIONS
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Rewrite', action: 'rewrite' },
            { label: 'Expand', action: 'expand' },
            { label: 'Shorten', action: 'shorten' },
            { label: 'Formalize', action: 'formalize' },
            { label: 'Casualize', action: 'casualize' },
            { label: 'Hooks', action: 'generate 5 alternative hooks for the above content' },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => onAction(btn.action)}
              disabled={isLoading}
              className="btn-action text-center"
              style={{
                padding: '6px 4px',
                fontSize: '10px',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
