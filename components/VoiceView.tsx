'use client';

import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8420';

interface VoiceProfile {
  name: string;
  description: string;
  sample_count: number;
  avg_word_count: number;
  avg_sentence_length: number;
  vocabulary_richness: number;
  common_words: string[];
  punctuation_style: Record<string, number>;
  tone_markers: Record<string, number>;
  hook_patterns: Record<string, number>;
  closing_patterns: Record<string, number>;
  formatting_prefs: Record<string, boolean>;
  last_updated?: string;
}

interface VoiceViewProps {
  onGenerate?: (topic: string) => void;
  onSelectVoice?: (name: string) => void;
}

type Tab = 'list' | 'build' | 'detail';

export default function VoiceView({ onGenerate, onSelectVoice }: VoiceViewProps) {
  const [tab, setTab] = useState<Tab>('list');
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selected, setSelected] = useState<VoiceProfile | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Build form state
  const [buildName, setBuildName] = useState('');
  const [buildTexts, setBuildTexts] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [buildMode, setBuildMode] = useState<'text' | 'author'>('text');

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/voices`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(Array.isArray(data) ? data : data.voices || []);
      }
    } catch {
      // backend not available
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const selectProfile = async (profile: VoiceProfile) => {
    setSelected(profile);
    setPrompt('');
    setTab('detail');
    try {
      const res = await fetch(`${API}/voice/${encodeURIComponent(profile.name)}/prompt`);
      if (res.ok) {
        const data = await res.json();
        setPrompt(data.prompt || data.text || JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  };

  const handleBuildFromText = async () => {
    if (!buildName.trim()) {
      setError('Name is required');
      return;
    }
    const lines = buildTexts.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      setError('At least one sample text is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ name: buildName.trim() });
      lines.forEach(t => params.append('texts', t.trim()));
      const res = await fetch(`${API}/voice/build-from-text?${params.toString()}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
        setTab('detail');
        setBuildName('');
        setBuildTexts('');
        fetchProfiles();
      } else {
        const err = await res.text();
        setError(err || 'Build failed');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildFromAuthor = async () => {
    if (!authorName.trim()) {
      setError('Author name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ name: authorName.trim() });
      const res = await fetch(`${API}/voice/build?${params.toString()}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
        setTab('detail');
        setAuthorName('');
        fetchProfiles();
      } else {
        const err = await res.text();
        setError(err || 'Build failed — author may not exist in database');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const styles = {
    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      outline: 'none',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
    } as React.CSSProperties,
    btn: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: '1px solid var(--border)',
      background: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
      fontFamily: 'inherit',
    } as React.CSSProperties,
    btnPrimary: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: 'none',
      background: 'var(--accent)',
      color: '#000',
      fontFamily: 'inherit',
    } as React.CSSProperties,
    label: {
      fontSize: '10px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      display: 'block',
      marginBottom: '4px',
    } as React.CSSProperties,
    card: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      color: 'var(--text-muted)',
      marginBottom: '12px',
    } as React.CSSProperties,
    tag: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      background: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    } as React.CSSProperties,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Voice Profiles
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {profiles.length} profiles
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('list'); setError(''); }}
            style={{
              ...styles.btn,
              ...(tab === 'list' ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : {}),
            }}
          >
            Library
          </button>
          <button
            onClick={() => { setTab('build'); setError(''); }}
            style={{
              ...styles.btn,
              ...(tab === 'build' ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : {}),
            }}
          >
            + Build
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-2 rounded text-[11px]" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 8, opacity: 0.6, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* LIST TAB */}
        {tab === 'list' && (
          <div className="max-w-3xl mx-auto space-y-2">
            {profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="text-3xl mb-3">🎙️</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No voice profiles yet</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Build one from sample texts or an author in your database
                </p>
                <button
                  onClick={() => setTab('build')}
                  style={{ ...styles.btnPrimary, marginTop: 16 }}
                >
                  + Build Voice Profile
                </button>
              </div>
            ) : (
              profiles.map((p) => (
                <div
                  key={p.name}
                  className="rounded-lg transition-all cursor-pointer"
                  style={{
                    ...styles.card,
                    borderColor: selected?.name === p.name ? 'var(--accent-dim)' : 'var(--border)',
                  }}
                  onClick={() => selectProfile(p)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {p.sample_count} samples
                        </span>
                        {p.last_updated && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            updated {formatDate(p.last_updated)}
                          </span>
                        )}
                        {p.vocabulary_richness && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            richness {p.vocabulary_richness.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] ml-4" style={{ color: 'var(--text-muted)' }}>▶</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BUILD TAB */}
        {tab === 'build' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setBuildMode('text'); setError(''); }}
                style={{
                  ...styles.btn,
                  ...(buildMode === 'text' ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : {}),
                }}
              >
                From Text Samples
              </button>
              <button
                onClick={() => { setBuildMode('author'); setError(''); }}
                style={{
                  ...styles.btn,
                  ...(buildMode === 'author' ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : {}),
                }}
              >
                From Author
              </button>
            </div>

            {buildMode === 'text' && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Build from Sample Texts</h3>
                <div className="space-y-4">
                  <div>
                    <label style={styles.label}>Profile Name</label>
                    <input
                      type="text"
                      value={buildName}
                      onChange={e => setBuildName(e.target.value)}
                      placeholder="e.g. naval-ravikant, concise-tech"
                      style={styles.input}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Sample Texts (one per line)</label>
                    <textarea
                      value={buildTexts}
                      onChange={e => setBuildTexts(e.target.value)}
                      placeholder={"Paste writing samples here...\nOne sample per line.\nAt least 5-10 samples recommended for best results."}
                      rows={8}
                      style={{
                        ...styles.input,
                        resize: 'vertical',
                        lineHeight: 1.6,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {buildTexts.split('\n').filter(l => l.trim()).length} samples ready
                    </p>
                  </div>
                  <button
                    onClick={handleBuildFromText}
                    disabled={loading}
                    style={{
                      ...styles.btnPrimary,
                      opacity: loading ? 0.5 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Building...' : 'Build Voice Profile'}
                  </button>
                </div>
              </div>
            )}

            {buildMode === 'author' && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Build from Author Database</h3>
                <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
                  Type an author name that exists in your post database. The system will analyze their writing to build a voice profile.
                </p>
                <div className="space-y-4">
                  <div>
                    <label style={styles.label}>Author Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      placeholder="e.g. @StraughterG"
                      style={styles.input}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      onKeyDown={e => e.key === 'Enter' && handleBuildFromAuthor()}
                    />
                  </div>
                  <button
                    onClick={handleBuildFromAuthor}
                    disabled={loading}
                    style={{
                      ...styles.btnPrimary,
                      opacity: loading ? 0.5 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Analyzing...' : 'Build from Author'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DETAIL TAB */}
        {tab === 'detail' && selected && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Back button */}
            <button
              onClick={() => { setTab('list'); setSelected(null); }}
              style={{ ...styles.btn, marginBottom: 8 }}
            >
              ← Back to Library
            </button>

            {/* Profile header */}
            <div style={styles.card}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selected.name}
                  </h2>
                  {selected.description && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {selected.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectVoice?.(selected.name)}
                    style={styles.btnPrimary}
                  >
                    Use This Voice
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Stat label="Samples" value={String(selected.sample_count)} />
                <Stat label="Avg Words" value={String(Math.round(selected.avg_word_count || 0))} />
                <Stat label="Avg Sentence" value={String((selected.avg_sentence_length || 0).toFixed(1))} />
                <Stat label="Vocab Richness" value={String((selected.vocabulary_richness || 0).toFixed(2))} />
                {selected.last_updated && (
                  <Stat label="Updated" value={formatDate(selected.last_updated)} />
                )}
              </div>
            </div>

            {/* Common Words */}
            {selected.common_words && selected.common_words.length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Common Words</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.common_words.map((w, i) => (
                    <span key={i} style={styles.tag}>{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Hook Patterns */}
            {selected.hook_patterns && Object.keys(selected.hook_patterns).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Hook Patterns</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.hook_patterns).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatKey(key)}</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Closing Patterns */}
            {selected.closing_patterns && Object.keys(selected.closing_patterns).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Closing Patterns</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.closing_patterns).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatKey(key)}</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{typeof val === 'number' ? val : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formatting Preferences */}
            {selected.formatting_prefs && Object.keys(selected.formatting_prefs).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Formatting Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.formatting_prefs).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatKey(key)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{
                        background: val ? 'var(--accent-dim)' : 'rgba(239,68,68,0.1)',
                        color: val ? 'var(--accent)' : '#f87171',
                      }}>
                        {val ? 'YES' : 'NO'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Punctuation Style */}
            {selected.punctuation_style && Object.keys(selected.punctuation_style).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Punctuation Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.punctuation_style).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatKey(key)}</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tone Markers */}
            {selected.tone_markers && Object.keys(selected.tone_markers).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Tone Markers</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.tone_markers).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{formatKey(key)}</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Prompt */}
            {prompt && (
              <div style={styles.card}>
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Generated Voice Prompt</h3>
                  <button
                    onClick={copyPrompt}
                    style={{
                      ...styles.btn,
                      ...(copied ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : {}),
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre
                  className="text-[11px] p-4 rounded overflow-x-auto whitespace-pre-wrap"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  {prompt}
                </pre>
              </div>
            )}

            {/* Use Voice CTA at bottom */}
            <div className="flex justify-center py-4">
              <button
                onClick={() => onSelectVoice?.(selected.name)}
                style={{
                  ...styles.btnPrimary,
                  padding: '12px 32px',
                  fontSize: '12px',
                }}
              >
                🎙️ Use This Voice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: format snake_case key to Title Case
function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Inline stat component
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
