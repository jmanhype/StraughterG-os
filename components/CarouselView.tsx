'use client';

import React, { useState, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:8420';

interface Slide {
  number: number;
  type: string;
  headline: string;
  body: string;
}

interface CarouselData {
  topic: string;
  handle: string;
  slide_count: number;
  slides: Slide[];
  html_slides: string[];
  color_scheme: string;
  generated_at: string;
}

interface CarouselViewProps {
  onGenerate?: (topic: string) => void;
}

export default function CarouselView({ onGenerate }: CarouselViewProps) {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [handle, setHandle] = useState('@StraughterG');
  const [colorScheme, setColorScheme] = useState('dark');
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewSlide, setPreviewSlide] = useState<number>(0);
  const [error, setError] = useState('');

  const generateCarousel = useCallback(async (useAI: boolean = false) => {
    if (!topic.trim()) {
      setError('Topic is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        topic: topic.trim(),
        slide_count: String(slideCount),
        handle,
        color_scheme: colorScheme,
      });
      if (useAI) params.set('voice', 'straughterg');
      const endpoint = useAI ? '/carousel/generate/ai' : '/carousel/generate';
      const res = await fetch(`${BACKEND_URL}${endpoint}?${params}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Generation failed (${res.status})`);
      const data = await res.json();
      setCarousel(data);
      setPreviewSlide(0);
    } catch (e: any) {
      setError(e.message || 'Failed to generate carousel');
    } finally {
      setLoading(false);
    }
  }, [topic, slideCount, handle, colorScheme]);

  const exportSlideHTML = (index: number) => {
    if (!carousel?.html_slides?.[index]) return;
    const blob = new Blob([carousel.html_slides[index]], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slide_${index + 1}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllSlides = () => {
    if (!carousel?.html_slides) return;
    carousel.html_slides.forEach((_, i) => {
      setTimeout(() => exportSlideHTML(i), i * 200);
    });
  };

  const sendToChat = () => {
    if (!carousel || !onGenerate) return;
    const slideText = carousel.slides
      .map(s => `Slide ${s.number} (${s.type}): ${s.headline}\n${s.body}`)
      .join('\n\n');
    onGenerate(`Refine this Instagram carousel into polished copy:\n\n${slideText}`);
  };

  const schemes = [
    { id: 'dark', label: '🌑 Dark', color: '#00ff88' },
    { id: 'midnight', label: '🌙 Midnight', color: '#38bdf8' },
    { id: 'warm', label: '🔥 Warm', color: '#f97316' },
    { id: 'neon', label: '💜 Neon', color: '#a855f7' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            📸 Carousel Generator
          </span>
          {carousel && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {carousel.slide_count} slides
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Generator Form */}
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Topic / Headline
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. 5 AI tools that replaced my entire workflow"
                  className="w-full px-4 py-2.5 rounded text-[12px] outline-none transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', monospace" }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onKeyDown={e => e.key === 'Enter' && generateCarousel()}
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Slides
                  </label>
                  <select
                    value={slideCount}
                    onChange={e => setSlideCount(Number(e.target.value))}
                    className="px-3 py-2 rounded text-[11px] outline-none cursor-pointer"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map(n => (
                      <option key={n} value={n}>{n} slides</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Handle
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    className="px-3 py-2 rounded text-[11px] outline-none w-36"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Color Scheme
                  </label>
                  <div className="flex gap-1">
                    {schemes.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setColorScheme(s.id)}
                        className="px-2.5 py-2 rounded text-[10px] font-bold transition-all"
                        style={{
                          background: colorScheme === s.id ? `${s.color}22` : 'var(--bg-tertiary)',
                          color: colorScheme === s.id ? s.color : 'var(--text-muted)',
                          border: `1px solid ${colorScheme === s.id ? s.color + '44' : 'var(--border)'}`,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded text-[11px]" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => generateCarousel()}
                  disabled={loading || !topic.trim()}
                  className="px-5 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: loading || !topic.trim() ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                    color: loading || !topic.trim() ? 'var(--text-muted)' : 'var(--text-secondary)',
                    opacity: loading || !topic.trim() ? 0.6 : 1,
                    border: '1px solid var(--border)',
                  }}
                >
                  {loading ? '⏳ Generating...' : '📐 Template'}
                </button>
                <button
                  onClick={() => generateCarousel(true)}
                  disabled={loading || !topic.trim()}
                  className="px-5 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: loading || !topic.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
                    color: loading || !topic.trim() ? 'var(--text-muted)' : '#000',
                    opacity: loading || !topic.trim() ? 0.6 : 1,
                  }}
                >
                  🧠 Generate with AI
                </button>
                {carousel && onGenerate && (
                  <button
                    onClick={sendToChat}
                    className="px-4 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    ⚡ Refine in Chat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Slide Preview */}
          {carousel && (
            <div className="space-y-4">
              {/* Slide Navigation */}
              <div className="flex items-center gap-2 flex-wrap">
                {carousel.slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewSlide(i)}
                    className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: previewSlide === i ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                      color: previewSlide === i ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${previewSlide === i ? 'var(--accent-dim)' : 'var(--border)'}`,
                    }}
                  >
                    {slide.number}. {slide.type}
                  </button>
                ))}
                <button
                  onClick={exportAllSlides}
                  className="ml-auto px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}
                >
                  📥 Export All HTML
                </button>
              </div>

              {/* Preview iframe */}
              {carousel.html_slides?.[previewSlide] && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Slide {previewSlide + 1} of {carousel.slide_count}
                    </span>
                    <button
                      onClick={() => exportSlideHTML(previewSlide)}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all"
                      style={{ color: 'var(--accent)', background: 'transparent' }}
                    >
                      📥 Download HTML
                    </button>
                  </div>
                  <iframe
                    srcDoc={carousel.html_slides[previewSlide]}
                    sandbox="allow-scripts"
                    style={{ width: '100%', height: '540px', border: 'none', background: '#000' }}
                    title={`Slide ${previewSlide + 1}`}
                  />
                </div>
              )}

              {/* Slide Content (editable text) */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Slide Content (edit & regenerate)
                </h3>
                {carousel.slides.map((slide) => (
                  <div key={slide.number} className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {slide.number} · {slide.type}
                      </span>
                    </div>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                      {slide.headline}
                    </p>
                    {slide.body && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {slide.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
