'use client';

import React, { useState, useCallback, useRef } from 'react';

const BACKEND_URL = 'http://localhost:8420';

interface TranscribeResult {
  transcript: string;
  segments: Array<{ start: number; end: number; text: string }>;
  metadata: {
    file: string;
    duration_seconds: number;
    language: string;
    language_probability: number;
    word_count: number;
    segment_count: number;
    model: string;
    transcribed_at: string;
  };
  formatted?: string;
}

interface TranscribeViewProps {
  onGenerate?: (topic: string) => void;
}

export default function TranscribeView({ onGenerate }: TranscribeViewProps) {
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelSize, setModelSize] = useState('base');
  const [formatType, setFormatType] = useState('summary');
  const [status, setStatus] = useState<{ available: boolean; engine: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check status on mount
  React.useEffect(() => {
    fetch(`${BACKEND_URL}/transcribe/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, engine: 'unavailable' }));
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large (max 100MB)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const params = new URLSearchParams({
        model_size: modelSize,
        format_type: formatType,
      });
      const res = await fetch(`${BACKEND_URL}/transcribe?${params}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || 'Transcription failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Transcription failed');
    } finally {
      setLoading(false);
    }
  }, [modelSize, formatType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const copyTranscript = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.transcript);
  };

  const sendToChat = () => {
    if (!result || !onGenerate) return;
    const excerpt = result.transcript.substring(0, 2000);
    onGenerate(`Analyze this video/audio transcript and generate content ideas from it:\n\n${excerpt}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            🎙️ Transcription
          </span>
          {status && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{
              background: status.available ? 'var(--accent-dim)' : 'rgba(255,68,68,0.15)',
              color: status.available ? 'var(--accent)' : '#ff4444',
            }}>
              {status.available ? `${status.engine} ready` : 'unavailable'}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Upload Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-10 rounded-lg text-center cursor-pointer transition-all"
            style={{
              background: dragOver ? 'var(--accent-dim)' : 'var(--bg-secondary)',
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.flac,.ogg,.m4a"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="text-4xl mb-3">{loading ? '⏳' : '🎬'}</div>
            <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {loading ? `Transcribing ${fileName}...` : 'Drop video or audio file here'}
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'This may take a minute depending on file length...' : 'Supports MP4, MOV, MP3, WAV, FLAC, OGG — up to 100MB'}
            </p>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Model
              </label>
              <select
                value={modelSize}
                onChange={e => setModelSize(e.target.value)}
                className="px-3 py-2 rounded text-[11px] outline-none cursor-pointer"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
              >
                <option value="tiny">Tiny (fast)</option>
                <option value="base">Base</option>
                <option value="small">Small (better)</option>
                <option value="medium">Medium (best)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Format
              </label>
              <select
                value={formatType}
                onChange={e => setFormatType(e.target.value)}
                className="px-3 py-2 rounded text-[11px] outline-none cursor-pointer"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
              >
                <option value="summary">Summary</option>
                <option value="text">Plain Text</option>
                <option value="timestamped">Timestamped</option>
                <option value="srt">SRT Subtitles</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)' }}>
              <p className="text-[12px]" style={{ color: '#ff4444' }}>{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="flex items-center gap-4 flex-wrap p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  📁 {result.metadata.file}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  ⏱️ {formatDuration(result.metadata.duration_seconds)}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  🌐 {result.metadata.language} ({(result.metadata.language_probability * 100).toFixed(0)}%)
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  📝 {result.metadata.word_count} words
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  🤖 {result.metadata.model}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copyTranscript}
                  className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  📋 Copy Transcript
                </button>
                {onGenerate && (
                  <button
                    onClick={sendToChat}
                    className="px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}
                  >
                    ⚡ Generate Content From This
                  </button>
                )}
              </div>

              {/* Transcript */}
              <div className="p-5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {result.formatted ? (
                  <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-sans" style={{ color: 'var(--text-primary)' }}>
                    {result.formatted}
                  </pre>
                ) : (
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {result.transcript}
                  </p>
                )}
              </div>

              {/* Timestamped Segments */}
              {formatType === 'timestamped' && result.segments && (
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Timestamped Segments ({result.segments.length})
                  </h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {result.segments.map((seg, i) => {
                      const mins = Math.floor(seg.start / 60);
                      const secs = Math.floor(seg.start % 60);
                      return (
                        <div key={i} className="flex gap-3 py-1 text-[11px]">
                          <span className="font-mono flex-shrink-0" style={{ color: 'var(--accent)' }}>
                            [{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}]
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{seg.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
