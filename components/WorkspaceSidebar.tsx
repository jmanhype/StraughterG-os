'use client';

import { useState } from 'react';
import { WorkspaceState, ViralScores } from '@/lib/types';

interface WorkspaceSidebarProps {
  workspace: WorkspaceState;
  onWorkspaceChange: (ws: WorkspaceState) => void;
  scores: ViralScores | null;
  onAction: (action: string) => void;
  onInsertTemplate: (template: string) => void;
  isLoading: boolean;
}

const QUICK_TEMPLATES = [
  { id: 1, name: 'Viral Hook Generator', prompt: 'Generate 5 viral hook variations about [TOPIC]. Each hook should: create a curiosity gap, lead with the most shocking fact, use numbers not words, and be under 280 characters. Format as a numbered list.' },
  { id: 2, name: 'Story Thread Builder', prompt: 'Build a 6-post thread about [TOPIC]. Structure: 1/ Hook with shocking fact, 2/ Context and problem, 3-5/ Core insights with examples, 6/ CTA. Use short sentences, one idea per line, em dashes for pauses.' },
  { id: 3, name: 'Listicle Framework', prompt: 'Create a listicle post: "X things about [TOPIC] that [audience] needs to know". Use numbered format (1/ 2/ 3/), each point 1-2 lines. Lead with the most valuable insight. End with a sharp closer.' },
  { id: 4, name: 'Reply Chain Strategist', prompt: 'Generate 3 strategic reply angles to a viral tweet about [TOPIC]: (1) Value Add - expand with unique data, (2) Respectful Contrarian - disagree with evidence, (3) Synthesizer - condense into punchy bullets. Each reply 1-3 sentences.' },
  { id: 5, name: 'CTA Optimizer', prompt: 'Create 5 high-converting call-to-action variations for [PRODUCT/SERVICE]. Use urgency, social proof, and clear benefits. Format: direct, question-based, FOMO-driven, value-first, and contrarian. Each under 100 characters.' },
  { id: 6, name: 'Trend Jacking Template', prompt: 'Write a post that connects [TRENDING TOPIC] to [YOUR NICHE]. Formula: reference the trend → pivot to your angle → deliver unexpected insight → close with provocative statement. Make it feel timely but evergreen.' },
];

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


export default function WorkspaceSidebar({
  workspace,
  onWorkspaceChange,
  scores,
  onAction,
  onInsertTemplate,
  isLoading,
}: WorkspaceSidebarProps) {
  const [showTemplates, setShowTemplates] = useState(true);

  const updateWorkspace = (partial: Partial<WorkspaceState>) => {
    onWorkspaceChange({ ...workspace, ...partial });
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
          
          {/* Length */}
          <div className="mb-3">
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

          {/* Format & Platform */}
          <div className="grid grid-cols-2 gap-2">
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
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Platform</label>
              <select
                value={workspace.platform}
                onChange={e => updateWorkspace({ platform: e.target.value as WorkspaceState['platform'] })}
                className="w-full"
              >
                <option value="twitter">X (Twitter)</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tone Engine */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            TONE ENGINE
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['professional', 'casual', 'bold', 'witty', 'empathetic', 'technical'] as const).map(tone => (
              <button
                key={tone}
                onClick={() => updateWorkspace({ tone })}
                className="py-2 rounded text-[11px] uppercase font-semibold transition-all"
                style={{
                  background: workspace.tone === tone ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: `1px solid ${workspace.tone === tone ? 'var(--accent)' : 'var(--border)'}`,
                  color: workspace.tone === tone ? '#000' : 'var(--text-muted)',
                }}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Viral Scores */}
        {scores && (
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              VIRAL SCORE
            </div>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Overall</span>
                <span className="text-[14px] font-bold" style={{ 
                  color: scores.viralScore >= 80 ? 'var(--accent)' : scores.viralScore >= 60 ? '#f59e0b' : '#ef4444' 
                }}>
                  {scores.viralScore}/100
                </span>
              </div>
            </div>
            
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              ENGAGEMENT POTENTIAL
            </div>
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
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            QUICK TEMPLATES
          </div>
          <div className="space-y-1.5">
            {QUICK_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => onInsertTemplate(template.prompt)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center justify-between"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  opacity: isLoading ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-dim)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <span>{template.name}</span>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  ⌘{template.id}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
